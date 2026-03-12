import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
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

    const { student_id, question } = await req.json();
    if (!student_id || !question) return json({ error: 'student_id e question obrigatórios' }, 400);
    if (!UUID_RE.test(student_id)) return json({ error: 'student_id inválido' }, 400);

    // AI-05: Validate trainer ownership before accessing student data
    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    const { data: student, error: studentError } = await svc
      .from('students')
      .select('*')
      .eq('id', student_id)
      .single();

    if (studentError || !student) return json({ error: 'Atleta não encontrado' }, 404);
    if (student.trainer_id !== user.id) return json({ error: 'Acesso negado — aluno não pertence a este treinador' }, 403);

    const [{ data: sessions }, { data: goals }, { data: records }] = await Promise.all([
      svc.from('workout_sessions').select('date, exercises(exercise_name,load_kg,reps)').eq('student_id', student_id).order('date', { ascending: false }).limit(10),
      svc.from('athlete_goals').select('*').eq('student_id', student_id).eq('status', 'active'),
      svc.from('athlete_records').select('*').eq('student_id', student_id).order('achieved_at', { ascending: false }).limit(10),
    ]);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const systemPrompt = `You are an expert sports coach for Move Progress Log. Give specific, actionable advice based on data. Reply in Brazilian Portuguese.
Athlete: ${JSON.stringify({ student, recent_sessions: sessions, goals, records })}`;

    const res = await callAI({
      model: 'anthropic/claude-sonnet-4-5',
      stream: false,
      max_tokens: 1500,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
    }, LOVABLE_API_KEY);

    if (!res.ok) return json({ error: `Erro no gateway de IA: ${res.status}` }, 502);
    const answer = (await res.json()).choices?.[0]?.message?.content ?? '';
    return json({ answer, student_id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
