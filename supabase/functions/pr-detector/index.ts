import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const today     = new Date().toISOString().split('T')[0];

    const { data: sessions } = await svc
      .from('workout_sessions')
      .select('id, student_id, date, exercises(exercise_name, load_kg, reps)')
      .gte('date', yesterday).lt('date', today);

    const detected: unknown[] = [];

    for (const session of sessions ?? []) {
      for (const ex of (session as any).exercises ?? []) {
        if (!ex.load_kg || !ex.reps) continue;
        const checks: [string, number][] = [['max_load', ex.load_kg], ['max_volume', ex.load_kg * ex.reps]];
        for (const [record_type, val] of checks) {
          const { data: prev } = await svc.from('athlete_records').select('value')
            .eq('student_id', session.student_id).eq('exercise_name', ex.exercise_name)
            .eq('record_type', record_type).order('value', { ascending: false }).limit(1).maybeSingle();
          if (!prev || val > prev.value) {
            await svc.from('athlete_records').upsert({
              student_id: session.student_id, exercise_name: ex.exercise_name,
              record_type, value: val, achieved_at: session.date, session_id: session.id,
            });
            detected.push({ student_id: session.student_id, exercise: ex.exercise_name, record_type, value: val, date: session.date });
          }
        }
      }
    }
    return json({ detected, sessions_checked: (sessions ?? []).length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
