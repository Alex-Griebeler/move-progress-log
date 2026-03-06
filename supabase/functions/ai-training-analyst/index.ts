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

    const { student_id, period_days = 30 } = await req.json();
    if (!student_id) return json({ error: 'student_id obrigatório' }, 400);

    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const since = new Date(Date.now() - period_days * 86_400_000).toISOString().split('T')[0];

    const [{ data: trends }, { data: records }] = await Promise.all([
      svc.from('athlete_metric_trends').select('*').eq('student_id', student_id).gte('date', since).order('date'),
      svc.from('athlete_records').select('*').eq('student_id', student_id).gte('achieved_at', since),
    ]);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const prompt = `Analise os dados de treinamento dos últimos ${period_days} dias e forneça:
1. Progressão de carga e volume
2. Recordes e destaques
3. Recomendações para o próximo ciclo
Dados: ${JSON.stringify({ trends, records, period_days })}
Responda em português brasileiro com seções estruturadas.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-5', stream: false, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);
    const analysis = (await res.json()).choices?.[0]?.message?.content ?? '';
    return json({ analysis, student_id, period_days });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
