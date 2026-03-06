import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

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

    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const [{ data: student }, { data: loads }, { data: records }, { data: goals }] = await Promise.all([
      svc.from('students').select('*').eq('id', student_id).single(),
      svc.from('athlete_daily_loads').select('*').eq('student_id', student_id).gte('date', period_start).lte('date', period_end).order('date'),
      svc.from('athlete_records').select('*').eq('student_id', student_id).gte('achieved_at', period_start).lte('achieved_at', period_end),
      svc.from('athlete_goals').select('*').eq('student_id', student_id),
    ]);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const name = (student as any)?.name ?? 'Atleta';
    const prompt = `Gere um relatório ${report_type} profissional para ${name} (${period_start} a ${period_end}).
Inclua: resumo executivo, análise de volume, recordes, progresso de metas, recomendações.
Dados: ${JSON.stringify({ student, loads, records, goals })}
Responda em português brasileiro formatado profissionalmente.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-5', stream: false, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);
    const report = (await res.json()).choices?.[0]?.message?.content ?? '';
    return json({ report, student_id, period_start, period_end, report_type });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
