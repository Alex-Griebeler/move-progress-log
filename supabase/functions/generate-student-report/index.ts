import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateReportRequest {
  studentId: string;
  periodStart: string;
  periodEnd: string;
  trackedExercises: string[];
  trainerNotes?: {
    highlights?: string;
    attentionPoints?: string;
    nextCyclePlan?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { studentId, periodStart, periodEnd, trackedExercises, trainerNotes }: GenerateReportRequest = await req.json();

    console.log('Generating report for student:', studentId, 'period:', periodStart, 'to', periodEnd);

    // Verify student belongs to trainer
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*, trainer_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student || student.trainer_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Student not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create report record (status: generating)
    const { data: report, error: reportError } = await supabase
      .from('student_reports')
      .insert({
        student_id: studentId,
        trainer_id: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        report_type: 'personalizado',
        status: 'generating',
        trainer_highlights: trainerNotes?.highlights,
        attention_points: trainerNotes?.attentionPoints,
        next_cycle_plan: trainerNotes?.nextCyclePlan,
      })
      .select()
      .single();

    if (reportError || !report) {
      console.error('Error creating report:', reportError);
      return new Response(JSON.stringify({ error: 'Failed to create report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all sessions in period
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('*, exercises(*)')
      .eq('student_id', studentId)
      .gte('date', periodStart)
      .lte('date', periodEnd)
      .order('date', { ascending: true });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      await supabase.from('student_reports').update({ status: 'failed' }).eq('id', report.id);
      return new Response(JSON.stringify({ error: 'Failed to fetch sessions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate frequency metrics
    const totalSessions = sessions?.length || 0;
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDiff = daysDiff / 7;
    const weeklyAverage = totalSessions / weeksDiff;

    // Get sessions proposed from student
    const sessionsProposed = student.weekly_sessions_proposed 
      ? Math.ceil(student.weekly_sessions_proposed * weeksDiff) 
      : null;
    const adherencePercentage = sessionsProposed 
      ? (totalSessions / sessionsProposed) * 100 
      : null;

    // Process tracked exercises
    const trackedExercisesData = [];

    for (const exerciseId of trackedExercises) {
      // Get exercise name
      const { data: exerciseLib } = await supabase
        .from('exercises_library')
        .select('name')
        .eq('id', exerciseId)
        .single();

      if (!exerciseLib) continue;

      const exerciseName = exerciseLib.name;

      // Find all executions of this exercise in the period
      const allExercises = sessions?.flatMap(s => s.exercises || []) || [];
      const exerciseExecutions = allExercises
        .filter(ex => ex.exercise_name === exerciseName && ex.load_kg && ex.reps)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (exerciseExecutions.length === 0) continue;

      // Calculate initial and final values
      const firstExecution = exerciseExecutions[0];
      const lastExecution = exerciseExecutions[exerciseExecutions.length - 1];

      const initialLoad = firstExecution.load_kg;
      const finalLoad = lastExecution.load_kg;
      const loadVariation = initialLoad ? ((finalLoad - initialLoad) / initialLoad) * 100 : 0;

      const initialTotalWork = (firstExecution.load_kg || 0) * (firstExecution.reps || 0) * (firstExecution.sets || 1);
      const finalTotalWork = (lastExecution.load_kg || 0) * (lastExecution.reps || 0) * (lastExecution.sets || 1);
      const workVariation = initialTotalWork ? ((finalTotalWork - initialTotalWork) / initialTotalWork) * 100 : 0;

      // Calculate weekly progression
      const weeklyData: { [key: number]: { totalLoad: number, count: number, totalWork: number } } = {};

      exerciseExecutions.forEach(ex => {
        const exDate = new Date(ex.created_at);
        const weekNumber = Math.floor((exDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
        
        if (!weeklyData[weekNumber]) {
          weeklyData[weekNumber] = { totalLoad: 0, count: 0, totalWork: 0 };
        }
        
        weeklyData[weekNumber].totalLoad += ex.load_kg || 0;
        weeklyData[weekNumber].count += 1;
        weeklyData[weekNumber].totalWork += (ex.load_kg || 0) * (ex.reps || 0) * (ex.sets || 1);
      });

      const weeklyProgression = Object.keys(weeklyData).map(week => ({
        week: parseInt(week),
        avgLoad: weeklyData[parseInt(week)].totalLoad / weeklyData[parseInt(week)].count,
        totalWork: weeklyData[parseInt(week)].totalWork,
      }));

      // Insert tracked exercise data
      const { error: exerciseError } = await supabase
        .from('report_tracked_exercises')
        .insert({
          report_id: report.id,
          exercise_library_id: exerciseId,
          exercise_name: exerciseName,
          initial_load: initialLoad,
          final_load: finalLoad,
          load_variation_percentage: loadVariation,
          initial_total_work: initialTotalWork,
          final_total_work: finalTotalWork,
          work_variation_percentage: workVariation,
          weekly_progression: weeklyProgression,
        });

      if (exerciseError) {
        console.error('Error inserting tracked exercise:', exerciseError);
      }

      trackedExercisesData.push({
        exerciseName,
        loadVariation,
        workVariation,
      });
    }

    // Fetch Oura metrics (if available)
    const { data: ouraMetrics } = await supabase
      .from('oura_metrics')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', periodStart)
      .lte('date', periodEnd);

    let ouraData = null;
    if (ouraMetrics && ouraMetrics.length > 0) {
      const avgReadiness = ouraMetrics.reduce((sum, m) => sum + (m.readiness_score || 0), 0) / ouraMetrics.length;
      const avgSleep = ouraMetrics.reduce((sum, m) => sum + (m.sleep_score || 0), 0) / ouraMetrics.length;
      const avgHrv = ouraMetrics.reduce((sum, m) => sum + (m.average_sleep_hrv || 0), 0) / ouraMetrics.length;
      const avgRhr = ouraMetrics.reduce((sum, m) => sum + (m.resting_heart_rate || 0), 0) / ouraMetrics.length;

      ouraData = {
        avgReadiness,
        avgSleep,
        avgHrv,
        avgRhr,
        dataPoints: ouraMetrics.length,
      };
    }

    // Generate AI analysis (simplified for MVP)
    let consistencyAnalysis = '';
    if (weeklyAverage >= 3) {
      consistencyAnalysis = `${student.name} manteve uma frequência excelente com ${weeklyAverage.toFixed(1)} treinos por semana em média. A consistência foi um dos principais fatores de sucesso neste período.`;
    } else if (weeklyAverage >= 2) {
      consistencyAnalysis = `${student.name} manteve uma frequência adequada com ${weeklyAverage.toFixed(1)} treinos por semana em média. A regularidade contribuiu positivamente para os resultados obtidos.`;
    } else {
      consistencyAnalysis = `${student.name} teve uma frequência de ${weeklyAverage.toFixed(1)} treinos por semana em média. Há oportunidade de melhorar a consistência para acelerar os resultados.`;
    }

    let strengthAnalysis = '';
    const positiveGains = trackedExercisesData.filter(e => e.loadVariation > 10);
    const moderateGains = trackedExercisesData.filter(e => e.loadVariation > 0 && e.loadVariation <= 10);
    
    if (positiveGains.length > 0) {
      strengthAnalysis = `Houve ganhos significativos de força, especialmente em ${positiveGains.map(e => e.exerciseName).join(', ')} com evolução superior a 10%. `;
    }
    if (moderateGains.length > 0) {
      strengthAnalysis += `Progressão moderada em ${moderateGains.map(e => e.exerciseName).join(', ')}, indicando adaptação neuromuscular.`;
    }
    if (positiveGains.length === 0 && moderateGains.length === 0) {
      strengthAnalysis = 'O período focou em consolidação técnica e manutenção da carga. É importante avaliar estratégias para retomar a progressão.';
    }

    // Update report with final data
    const { error: updateError } = await supabase
      .from('student_reports')
      .update({
        status: 'completed',
        total_sessions: totalSessions,
        weekly_average: weeklyAverage,
        adherence_percentage: adherencePercentage,
        sessions_proposed: sessionsProposed,
        oura_data: ouraData,
        consistency_analysis: consistencyAnalysis,
        strength_analysis: strengthAnalysis,
        generated_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    if (updateError) {
      console.error('Error updating report:', updateError);
    }

    return new Response(JSON.stringify({ reportId: report.id, status: 'completed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});