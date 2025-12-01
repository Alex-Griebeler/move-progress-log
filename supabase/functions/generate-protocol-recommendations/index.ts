import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
interface RequestBody {
  student_id: string;
}

interface OuraMetrics {
  id: string;
  student_id: string;
  date: string;
  readiness_score: number | null;
  sleep_score: number | null;
  hrv_balance: number | null;
  resting_heart_rate: number | null;
  temperature_deviation: number | null;
  activity_balance: number | null;
}

interface AdaptationRule {
  id: string;
  metric_name: string;
  condition: string;
  threshold_value: number;
  action_type: string;
  severity: string;
  description: string;
}

interface Protocol {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's auth token for getUser
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const { student_id } = await req.json() as RequestBody;

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: 'student_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(student_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid student_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify trainer owns the student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('trainer_id')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ error: 'Student not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (student.trainer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to student data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get latest Oura metrics for the student
    const { data: latestMetrics, error: metricsError } = await supabase
      .from('oura_metrics')
      .select('*')
      .eq('student_id', student_id)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (metricsError || !latestMetrics) {
      return new Response(
        JSON.stringify({ message: 'No Oura metrics available for this student' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all adaptation rules
    const { data: rules, error: rulesError } = await supabase
      .from('adaptation_rules')
      .select('*');

    if (rulesError) throw rulesError;

    // Get all protocols
    const { data: protocols, error: protocolsError } = await supabase
      .from('recovery_protocols')
      .select('id, name, category, subcategory');

    if (protocolsError) throw protocolsError;

    // Analyze metrics and generate recommendations
    const recommendations: Array<{
      student_id: string;
      protocol_id: string;
      recommended_date: string;
      reason: string;
      priority: string;
    }> = [];

    const metrics = latestMetrics as OuraMetrics;
    const today = new Date().toISOString().split('T')[0];

    // Check each rule against metrics
    for (const rule of rules as AdaptationRule[]) {
      const metricValue = metrics[rule.metric_name as keyof OuraMetrics] as number | null;
      
      if (metricValue === null || metricValue === undefined) continue;

      let triggered = false;

      // Check condition
      if (rule.condition === 'below' && metricValue < rule.threshold_value) {
        triggered = true;
      } else if (rule.condition === 'above' && metricValue > rule.threshold_value) {
        triggered = true;
      }

      if (triggered) {
        // Generate protocol recommendations based on the rule
        const recommendedProtocols = getProtocolsForAction(rule.action_type, protocols as Protocol[]);

        for (const protocol of recommendedProtocols) {
          recommendations.push({
            student_id: student_id,
            protocol_id: protocol.id,
            recommended_date: today,
            reason: `${rule.description}. ${rule.metric_name}: ${metricValue}`,
            priority: rule.severity,
          });
        }
      }
    }

    // Delete old recommendations for today (to avoid duplicates)
    await supabase
      .from('protocol_recommendations')
      .delete()
      .eq('student_id', student_id)
      .eq('recommended_date', today);

    // Insert new recommendations
    if (recommendations.length > 0) {
      const { error: insertError } = await supabase
        .from('protocol_recommendations')
        .insert(recommendations);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations_count: recommendations.length,
        metrics: {
          readiness_score: metrics.readiness_score,
          sleep_score: metrics.sleep_score,
          hrv_balance: metrics.hrv_balance,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getProtocolsForAction(actionType: string, protocols: Protocol[]): Protocol[] {
  const protocolMap: Record<string, string[]> = {
    'suggest_light_activity': ['Cardio Zona 2', 'Caminhada Recuperativa', 'Yoga Flow'],
    'suggest_full_rest': ['Mindfulness Meditation', 'Body Scan Mindfulness', 'Coerência Cardíaca'],
    'avoid_intense_training': ['Sauna Seca', 'Sauna a Vapor', 'Box Breathing', 'Mindfulness Meditation'],
    'reduce_intensity': ['Coerência Cardíaca', 'Yoga Flow', 'Caminhada Recuperativa'],
    'monitor_stress': ['Box Breathing', 'Coerência Cardíaca', 'Mindfulness Meditation', 'Sauna a Vapor'],
  };

  const protocolNames = protocolMap[actionType] || [];
  return protocols.filter(p => protocolNames.includes(p.name));
}
