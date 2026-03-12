import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    // PR-01: Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autorizado' }, 401);
    const authClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: 'Não autorizado' }, 401);

    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const today     = new Date().toISOString().split('T')[0];

    const { data: sessions } = await svc
      .from('workout_sessions')
      .select('id, student_id, date, exercises(exercise_name, load_kg, reps)')
      .gte('date', yesterday).lt('date', today);

    const sessionList = sessions ?? [];
    const detected: unknown[] = [];

    // Group valid exercises by student_id to minimise DB round-trips
    const byStudent = new Map<string, { session: (typeof sessionList)[0]; ex: { exercise_name: string; load_kg: number; reps: number } }[]>();
    for (const session of sessionList) {
      for (const ex of (session as any).exercises ?? []) {
        if (!ex.load_kg || !ex.reps) continue;
        const list = byStudent.get(session.student_id) ?? [];
        list.push({ session, ex });
        byStudent.set(session.student_id, list);
      }
    }

    for (const [student_id, items] of byStudent) {
      const exerciseNames = [...new Set(items.map(i => i.ex.exercise_name))];

      // Single SELECT: all existing records for this student × these exercises
      const { data: existing } = await svc
        .from('athlete_records')
        .select('exercise_name, record_type, value')
        .eq('student_id', student_id)
        .in('exercise_name', exerciseNames)
        .in('record_type', ['max_load', 'max_volume']);

      // Build in-memory lookup: "exercise_name:record_type" → best known value
      const recordMap = new Map<string, number>();
      for (const r of existing ?? []) {
        const key = `${r.exercise_name}:${r.record_type}`;
        const current = recordMap.get(key) ?? -Infinity;
        if (r.value > current) recordMap.set(key, r.value);
      }

      // Detect PRs entirely in memory — no extra DB reads
      const newRecords: object[] = [];
      for (const { session, ex } of items) {
        const checks: [string, number][] = [
          ['max_load', ex.load_kg],
          ['max_volume', ex.load_kg * ex.reps],
        ];
        for (const [record_type, val] of checks) {
          const key = `${ex.exercise_name}:${record_type}`;
          const prev = recordMap.get(key);
          if (prev === undefined || val > prev) {
            recordMap.set(key, val); // update map so same-batch duplicates don't trigger twice
            newRecords.push({
              student_id, exercise_name: ex.exercise_name,
              record_type, value: val, achieved_at: session.date, session_id: session.id,
            });
            detected.push({ student_id, exercise: ex.exercise_name, record_type, value: val, date: session.date });
          }
        }
      }

      // Single batch upsert for all PRs of this student
      if (newRecords.length > 0) {
        await svc.from('athlete_records').upsert(newRecords);
      }
    }

    return json({ detected, sessions_checked: sessionList.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
