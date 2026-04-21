import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

interface OuraBaseline {
  avg_hrv: number | null;
  avg_rhr: number | null;
  avg_sleep_score: number | null;
  data_points: number;
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

type RecommendationPriority = "low" | "medium" | "high";

interface RecommendationDraft {
  student_id: string;
  protocol_id: string;
  recommended_date: string;
  reasons: string[];
  priority: RecommendationPriority;
  priorityRank: number;
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function normalizePriority(rawPriority: string): RecommendationPriority {
  const normalized = rawPriority.trim().toLowerCase();

  if (normalized === "high" || normalized === "alta" || normalized === "critical") {
    return "high";
  }

  if (normalized === "medium" || normalized === "média" || normalized === "media") {
    return "medium";
  }

  return "low";
}

function resolveBaselineValue(
  ruleMetricName: string,
  baseline: OuraBaseline | null
): number | null {
  if (!baseline) return null;

  if (ruleMetricName === "resting_heart_rate") return baseline.avg_rhr;
  if (ruleMetricName === "average_sleep_hrv") return baseline.avg_hrv;
  if (ruleMetricName === "sleep_score") return baseline.avg_sleep_score;

  return null;
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
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's auth token for getUser
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // Parse and validate request body
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const payload = body as Partial<RequestBody>;
    const student_id = typeof payload.student_id === 'string' ? payload.student_id.trim() : '';

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: 'student_id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Validate UUID format
    if (!UUID_RE.test(student_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid student_id format' }),
        { status: 400, headers: jsonHeaders }
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
        { status: 404, headers: jsonHeaders }
      );
    }

    if (student.trainer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to student data' }),
        { status: 403, headers: jsonHeaders }
      );
    }

    // Get latest Oura metrics for the student
    const { data: latestMetrics, error: metricsError } = await supabase
      .from('oura_metrics')
      .select('id, student_id, date, readiness_score, sleep_score, hrv_balance, resting_heart_rate, temperature_deviation, activity_balance')
      .eq('student_id', student_id)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (metricsError || !latestMetrics) {
      return new Response(
        JSON.stringify({ message: 'No Oura metrics available for this student' }),
        { headers: jsonHeaders }
      );
    }

    const { data: baselineRows, error: baselineError } = await supabase.rpc("calc_oura_baseline", {
      p_student_id: student_id,
      p_days: 14,
    });
    if (baselineError) {
      throw new Error(`Erro ao calcular baseline: ${baselineError.message}`);
    }
    const baseline =
      Array.isArray(baselineRows) && baselineRows.length > 0
        ? (baselineRows[0] as OuraBaseline)
        : null;

    // Get all adaptation rules
    const { data: rules, error: rulesError } = await supabase
      .from('adaptation_rules')
      .select('id, metric_name, condition, threshold_value, action_type, severity, description');

    if (rulesError) throw rulesError;

    // Get all protocols
    const { data: protocols, error: protocolsError } = await supabase
      .from('recovery_protocols')
      .select('id, name, category, subcategory');

    if (protocolsError) throw protocolsError;

    // ═══════════════════════════════════════════════════════════
    // MEL-IA-007: Query adherence history for effectiveness-based prioritization
    // ═══════════════════════════════════════════════════════════
    const { data: adherenceHistory, error: adherenceHistoryError } = await supabase
      .from('protocol_adherence')
      .select('protocol_id, followed, hrv_delta, readiness_delta')
      .eq('student_id', student_id)
      .eq('followed', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (adherenceHistoryError) {
      throw new Error(`Erro ao carregar histórico de aderência: ${adherenceHistoryError.message}`);
    }

    // Calculate effectiveness score per protocol
    const protocolEffectiveness: Record<string, { avgHrvDelta: number; avgReadinessDelta: number; count: number }> = {};
    if (adherenceHistory) {
      for (const entry of adherenceHistory) {
        if (!protocolEffectiveness[entry.protocol_id]) {
          protocolEffectiveness[entry.protocol_id] = { avgHrvDelta: 0, avgReadinessDelta: 0, count: 0 };
        }
        const eff = protocolEffectiveness[entry.protocol_id];
        eff.count++;
        if (entry.hrv_delta != null) eff.avgHrvDelta += entry.hrv_delta;
        if (entry.readiness_delta != null) eff.avgReadinessDelta += entry.readiness_delta;
      }
      for (const key of Object.keys(protocolEffectiveness)) {
        const eff = protocolEffectiveness[key];
        if (eff.count > 0) {
          eff.avgHrvDelta /= eff.count;
          eff.avgReadinessDelta /= eff.count;
        }
      }
    }
    // ═══════════════════════════════════════════════════════════

    // Analyze metrics and generate recommendations
    const recommendationByProtocol = new Map<string, RecommendationDraft>();

    const metrics = latestMetrics as OuraMetrics;
    const today = new Date().toISOString().split('T')[0];

    // Check each rule against metrics
    for (const rule of rules as AdaptationRule[]) {
      const metricValue = metrics[rule.metric_name as keyof OuraMetrics] as number | null;
      
      if (metricValue === null || metricValue === undefined) continue;

      let triggered = false;
      const baselineValue = resolveBaselineValue(rule.metric_name, baseline);
      let compareValue: number | null = rule.threshold_value;

      // Check condition
      if (rule.condition === 'below' && metricValue < rule.threshold_value) {
        triggered = true;
      } else if (rule.condition === 'above' && metricValue > rule.threshold_value) {
        triggered = true;
      } else if (
        rule.condition === "above_baseline" &&
        baselineValue !== null &&
        metricValue > baselineValue + rule.threshold_value
      ) {
        triggered = true;
        compareValue = baselineValue + rule.threshold_value;
      } else if (
        rule.condition === "below_baseline" &&
        baselineValue !== null &&
        metricValue < baselineValue - rule.threshold_value
      ) {
        triggered = true;
        compareValue = baselineValue - rule.threshold_value;
      }

      if (triggered) {
        // Generate protocol recommendations based on the rule
        const recommendedProtocols = getProtocolsForAction(rule.action_type, protocols as Protocol[]);

        // MEL-IA-007: Sort by effectiveness (protocols with positive HRV/readiness delta first)
        recommendedProtocols.sort((a, b) => {
          const effA = protocolEffectiveness[a.id];
          const effB = protocolEffectiveness[b.id];
          if (!effA && !effB) return 0;
          if (!effA) return 1;
          if (!effB) return -1;
          const scoreA = effA.avgHrvDelta + effA.avgReadinessDelta;
          const scoreB = effB.avgHrvDelta + effB.avgReadinessDelta;
          return scoreB - scoreA; // Higher effectiveness first
        });

        const normalizedPriority = normalizePriority(rule.severity);
        const normalizedPriorityRank = PRIORITY_RANK[normalizedPriority];

        for (const protocol of recommendedProtocols) {
          const eff = protocolEffectiveness[protocol.id];
          const effNote = eff && eff.count >= 3
            ? ` (efetividade histórica: HRV ${eff.avgHrvDelta > 0 ? '+' : ''}${eff.avgHrvDelta.toFixed(1)}, Readiness ${eff.avgReadinessDelta > 0 ? '+' : ''}${eff.avgReadinessDelta.toFixed(0)})`
            : '';

          const reason = `${rule.description}. ${rule.metric_name}: ${metricValue}${
            compareValue !== null ? ` (limiar: ${compareValue.toFixed(1)})` : ""
          }${effNote}`;

          const existing = recommendationByProtocol.get(protocol.id);

          if (!existing) {
            recommendationByProtocol.set(protocol.id, {
              student_id,
              protocol_id: protocol.id,
              recommended_date: today,
              reasons: [reason],
              priority: normalizedPriority,
              priorityRank: normalizedPriorityRank,
            });
            continue;
          }

          if (!existing.reasons.includes(reason)) {
            existing.reasons.push(reason);
          }

          if (normalizedPriorityRank > existing.priorityRank) {
            existing.priority = normalizedPriority;
            existing.priorityRank = normalizedPriorityRank;
          }
        }
      }
    }

    const recommendations = Array.from(recommendationByProtocol.values())
      .sort((a, b) => b.priorityRank - a.priorityRank)
      .map((recommendation) => ({
        student_id: recommendation.student_id,
        protocol_id: recommendation.protocol_id,
        recommended_date: recommendation.recommended_date,
        reason: recommendation.reasons.join(" | "),
        priority: recommendation.priority,
      }));

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
      { headers: jsonHeaders }
    );

  } catch (error) {
    // Error generating recommendations
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: jsonHeaders
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
