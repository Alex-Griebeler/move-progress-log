import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function callAI(payload: object, apiKey: string, retries = 1): Promise<Response> {
  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status >= 500 && retries > 0) {
    await new Promise(r => setTimeout(r, 1000));
    return callAI(payload, apiKey, retries - 1);
  }
  return res;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autorizado' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return json({ error: 'Não autorizado' }, 401);

    const { student_id, period_days = 30 } = await req.json();
    if (!student_id) return json({ error: 'student_id obrigatório' }, 400);
    if (!UUID_RE.test(student_id)) return json({ error: 'student_id inválido' }, 400);

    // AI-02: Validate trainer ownership
    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const since = new Date(Date.now() - period_days * 86_400_000).toISOString().split('T')[0];

    const { data: student, error: studentError } = await svc.from('students').select('id, trainer_id, name').eq('id', student_id).single();
    if (studentError || !student) return json({ error: 'Atleta não encontrado' }, 404);
    if (student.trainer_id !== user.id) return json({ error: 'Acesso negado — aluno não pertence a este treinador' }, 403);

    // AI-02: Use existing tables instead of non-existent athlete_metric_trends
    const [{ data: sessions }, { data: ouraMetrics }] = await Promise.all([
      svc.from('workout_sessions').select('id, date, exercises(exercise_name, load_kg, reps, sets)').eq('student_id', student_id).gte('date', since).order('date'),
      svc.from('oura_metrics').select('date, readiness_score, sleep_score, average_sleep_hrv, resting_heart_rate').eq('student_id', student_id).gte('date', since).order('date'),
    ]);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const prompt = `Analise os dados de treinamento dos últimos ${period_days} dias e forneça:
1. Progressão de carga e volume
2. Recordes e destaques
3. Recomendações para o próximo ciclo
Dados: ${JSON.stringify({ sessions, ouraMetrics, period_days })}
Responda em português brasileiro com seções estruturadas.`;

    const res = await callAI({
      model: 'anthropic/claude-sonnet-4-5',
      stream: false,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }, LOVABLE_API_KEY);

    if (!res.ok) return json({ error: `Erro no gateway de IA: ${res.status}` }, 502);
    const analysis = (await res.json()).choices?.[0]?.message?.content ?? '';
    return json({ analysis, student_id, period_days });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
