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

    const { student_id, question } = await req.json();
    if (!student_id || !question) return json({ error: 'student_id e question obrigatórios' }, 400);

    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const [{ data: student }, { data: sessions }, { data: goals }, { data: records }] = await Promise.all([
      svc.from('students').select('*').eq('id', student_id).single(),
      svc.from('workout_sessions').select('date, exercises(exercise_name,load_kg,reps)').eq('student_id', student_id).order('date', { ascending: false }).limit(10),
      svc.from('athlete_goals').select('*').eq('student_id', student_id).eq('status', 'active'),
      svc.from('athlete_records').select('*').eq('student_id', student_id).order('achieved_at', { ascending: false }).limit(10),
    ]);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const systemPrompt = `You are an expert sports coach for Move Progress Log. Give specific, actionable advice based on data. Reply in Brazilian Portuguese.
Athlete: ${JSON.stringify({ student, recent_sessions: sessions, goals, records })}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-5', stream: false, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }] }),
    });
    if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);
    const answer = (await res.json()).choices?.[0]?.message?.content ?? '';
    return json({ answer, student_id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
