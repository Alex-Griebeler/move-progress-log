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

    const { student_id, period_start, period_end, report_type = 'mensal' } = await req.json();
    if (!student_id || !period_start || !period_end) return json({ error: 'student_id, period_start e period_end obrigatórios' }, 400);
    if (!UUID_RE.test(student_id)) return json({ error: 'student_id inválido' }, 400);

    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const [{ data: student }, { data: loads }, { data: records }, { data: goals }] = await Promise.all([
      svc.from('students').select('*').eq('id', student_id).single(),
      svc.from('athlete_daily_loads').select('*').eq('student_id', student_id).gte('date', period_start).lte('date', period_end).order('date'),
      svc.from('athlete_records').select('*').eq('student_id', student_id).gte('achieved_at', period_start).lte('achieved_at', period_end),
      svc.from('athlete_goals').select('*').eq('student_id', student_id),
    ]);

    if (!student) return json({ error: 'Atleta não encontrado' }, 404);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const name = (student as any)?.name ?? 'Atleta';
    const prompt = `Gere um relatório ${report_type} profissional para ${name} (${period_start} a ${period_end}).
Inclua: resumo executivo, análise de volume, recordes, progresso de metas, recomendações.
Dados: ${JSON.stringify({ student, loads, records, goals })}
Responda em português brasileiro formatado profissionalmente.`;

    const res = await callAI({
      model: 'anthropic/claude-sonnet-4-5',
      stream: false,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }, LOVABLE_API_KEY);

    if (!res.ok) return json({ error: `Erro no gateway de IA: ${res.status}` }, 502);
    const report = (await res.json()).choices?.[0]?.message?.content ?? '';
    return json({ report, student_id, period_start, period_end, report_type });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
