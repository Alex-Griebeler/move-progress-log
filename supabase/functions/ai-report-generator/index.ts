import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MAX_REPORT_RANGE_DAYS = 180;
const MAX_REPORT_TYPE_LENGTH = 40;

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

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

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ error: 'Payload inválido' }, 400);
    }

    const payload = body as Record<string, unknown>;
    const student_id = typeof payload.student_id === 'string' ? payload.student_id.trim() : '';
    const period_start = typeof payload.period_start === 'string' ? payload.period_start.trim() : '';
    const period_end = typeof payload.period_end === 'string' ? payload.period_end.trim() : '';
    const report_type = typeof payload.report_type === 'string' && payload.report_type.trim()
      ? payload.report_type.trim().slice(0, MAX_REPORT_TYPE_LENGTH)
      : 'mensal';

    if (!student_id || !period_start || !period_end) return json({ error: 'student_id, period_start e period_end obrigatórios' }, 400);
    if (!UUID_RE.test(student_id)) return json({ error: 'student_id inválido' }, 400);
    const startDate = parseIsoDate(period_start);
    const endDate = parseIsoDate(period_end);
    if (!startDate || !endDate) return json({ error: 'Período inválido' }, 400);
    if (startDate > endDate) return json({ error: 'period_start não pode ser maior que period_end' }, 400);

    const rangeDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (rangeDays > MAX_REPORT_RANGE_DAYS) {
      return json({ error: `O período máximo permitido é de ${MAX_REPORT_RANGE_DAYS} dias` }, 400);
    }

    // AI-01: Validate trainer ownership
    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    const { data: student, error: studentError } = await svc
      .from('students')
      .select('id, trainer_id, name, fitness_level, objectives, limitations, injury_history')
      .eq('id', student_id)
      .single();
    if (studentError || !student) return json({ error: 'Atleta não encontrado' }, 404);
    if (student.trainer_id !== user.id) return json({ error: 'Acesso negado — aluno não pertence a este treinador' }, 403);

    // AI-01: Use existing tables instead of non-existent athlete_daily_loads
    const [{ data: sessions }, { data: records }] = await Promise.all([
      svc.from('workout_sessions').select('id, date, exercises(exercise_name, load_kg, reps, sets)').eq('student_id', student_id).gte('date', period_start).lte('date', period_end).order('date'),
      svc.from('exercises').select('exercise_name, load_kg, reps, sets, created_at, session_id').in('session_id', 
        (await svc.from('workout_sessions').select('id').eq('student_id', student_id).gte('date', period_start).lte('date', period_end)).data?.map((s: { id: string }) => s.id) || []
      ),
    ]);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const name = (student as Record<string, unknown>)?.name ?? 'Atleta';
    const prompt = `Gere um relatório ${report_type} profissional para ${name} (${period_start} a ${period_end}).
Inclua: resumo executivo, análise de volume, recordes, progresso de metas, recomendações.
Dados: ${JSON.stringify({ student, sessions, records })}
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
