import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROJECT_MEMORY = `Stack: React + Vite + TypeScript frontend. Supabase backend (Postgres + Edge Functions in Deno).
GitHub Actions pipeline creates PRs automatically when issues are opened.
Standards: TypeScript only, functional React components, Tailwind CSS, React Query.
Tables: profiles, user_roles, athletes, training_sessions, exercise_logs, exercises, prescriptions, recovery_protocols, oura_connections.
Features: athlete tracking, exercise library, prescriptions, recovery protocols, Oura ring integration, AI Builder.
AI rules: suggest on conversation intent, generate plan on planning intent, create GitHub issue only on build intent.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Validate message
    const { message } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Mensagem não pode ser vazia' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Mensagem muito longa (máximo 2000 caracteres)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Call Claude via Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const systemPrompt = `You are an AI software engineer assistant for the Move Progress Log platform.

Project context:
${PROJECT_MEMORY}

Classify the user intent as exactly one of: conversation, planning, or build.
- conversation: user asks questions, suggests ideas, or discusses the project
- planning: user requests an implementation plan or technical analysis
- build: user explicitly asks to build, implement, or create something

Return ONLY valid JSON with two fields:
  intent: the classified intent (conversation, planning, or build)
  message: your full response text

For planning intent, structure the message as a numbered implementation plan.
For build intent, confirm in the message that a GitHub issue will be created.
Always reply in the same language the user writes in.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        stream: false,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const rawContent: string = aiData.choices?.[0]?.message?.content ?? '';

    let parsed: { intent: string; message: string };
    try {
      const cleaned = rawContent.replace(/```json
?/g, '').replace(/```
?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { intent: 'conversation', message: rawContent };
    }

    const intent = parsed.intent as 'conversation' | 'planning' | 'build';
    const responseMessage = parsed.message;

    // 5. Create GitHub issue if intent = build
    let issue_url: string | undefined;
    if (intent === 'build') {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (GITHUB_TOKEN) {
        const issueRes = await fetch(
          'https://api.github.com/repos/Alex-Griebeler/move-progress-log/issues',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({ title: 'AI Builder Task', body: message }),
          }
        );
        if (issueRes.ok) {
          const issueData = await issueRes.json();
          issue_url = issueData.html_url;
        }
      }
    }

    return new Response(
      JSON.stringify({ type: intent, message: responseMessage, issue_url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-builder-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
