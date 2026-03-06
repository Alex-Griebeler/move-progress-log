import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const PROJECT_MEMORY = `Stack: React+Vite+TypeScript, Supabase (Postgres+Deno Edge Functions), GitHub Actions CI. Tables: user_roles, students, workout_sessions, exercises, exercises_library, workout_prescriptions, prescription_exercises, athlete_records, athlete_goals, ai_tasks, ai_code_documents. Features: athlete tracking, exercise library, prescriptions, Oura ring integration, AI Builder, Coach Console, Athlete Insights.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autorizado' }, 401);

    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await client.auth.getUser();
    if (authErr || !user) return json({ error: 'Não autorizado' }, 401);

    const { data: role } = await client.from('user_roles').select('role').eq('user_id', user.id).single();
    if (role?.role !== 'admin') return json({ error: 'Acesso negado' }, 403);

    const svc = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Rate limit: 10 req / hora
    const { count: hourCount } = await svc.from('ai_tasks').select('*', { count: 'exact', head: true })
      .eq('created_by', user.id).gte('created_at', new Date(Date.now() - 3_600_000).toISOString());
    if ((hourCount ?? 0) >= 10) return json({ error: 'Rate limit: máximo 10 requisições por hora' }, 429);

    const { message } = await req.json();
    if (!message?.trim()) return json({ error: 'Mensagem não pode ser vazia' }, 400);
    if (message.length > 2000) return json({ error: 'Mensagem muito longa (máximo 2000 caracteres)' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const systemPrompt = `You are an AI software engineer for the Move Progress Log platform.
Context: ${PROJECT_MEMORY}
Classify intent as conversation, planning, or build.
- conversation: questions, ideas, discussion
- planning: implementation plan / technical analysis
- build: explicitly asked to build/implement
Return ONLY valid JSON: { intent, message }
On build intent, confirm a GitHub issue will be created.
Reply in the same language as the user.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-5', stream: false,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }] }),
    });
    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const raw: string = (await aiRes.json()).choices?.[0]?.message?.content ?? '';

    let parsed: { intent: string; message: string };
    try { parsed = JSON.parse(raw.replace(/```json?|```/g, '').trim()); }
    catch { parsed = { intent: 'conversation', message: raw }; }

    const intent = parsed.intent as 'conversation' | 'planning' | 'build';
    let issue_url: string | undefined;

    if (intent === 'build') {
      // Dedup: bloquear se já criou build nos últimos 5 min
      const { count: recent } = await svc.from('ai_tasks').select('*', { count: 'exact', head: true })
        .eq('created_by', user.id).eq('intent', 'build')
        .gte('created_at', new Date(Date.now() - 300_000).toISOString());
      if ((recent ?? 0) > 0) return json({ error: 'Aguarde 5 minutos antes de criar outra tarefa build' }, 429);

      const ghToken = Deno.env.get('GITHUB_TOKEN');
      if (ghToken) {
        const r = await fetch('https://api.github.com/repos/Alex-Griebeler/move-progress-log/issues', {
          method: 'POST',
          headers: { Authorization: `Bearer ${ghToken}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' },
          body: JSON.stringify({ title: 'AI Builder Task', body: message }),
        });
        if (r.ok) issue_url = (await r.json()).html_url;
      }
    }

    await svc.from('ai_tasks').insert({
      created_by: user.id, intent, message, status: 'completed', github_issue_url: issue_url ?? null,
    });

    return json({ type: intent, message: parsed.message, issue_url });
  } catch (e) {
    console.error('ai-builder-chat error:', e);
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
