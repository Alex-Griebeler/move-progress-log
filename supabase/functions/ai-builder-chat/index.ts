import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client with user's token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify admin role
    const { data: roleData } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Validate input
    const { message } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagem não pode estar vazia" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Mensagem excede o limite de 2000 caracteres" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Load project memory using service role
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const { data: memoryRows } = await supabaseService
      .from("ai_project_memory")
      .select("key, content");

    const projectMemory = (memoryRows || [])
      .map((row: { key: string; content: string }) => `## ${row.key}\n${row.content}`)
      .join("\n\n");

    // 5. Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are the AI Builder assistant for the Fabrik Performance project — an internal development tool for admin users.

Your job is to:
1. Classify the user's intent as one of: conversation, planning, or build
2. Generate an appropriate response

## Project Memory
${projectMemory}

## Intent Classification Rules
- **conversation**: The user is asking questions, requesting suggestions, discussing architecture, or having a general discussion about the project.
- **planning**: The user explicitly asks for an implementation plan, a step-by-step guide, or a roadmap for a feature.
- **build**: The user explicitly asks to BUILD, CREATE, or IMPLEMENT something. Words like "build", "create", "implement", "develop", "make" indicate build intent.

## Response Format
You MUST respond by calling the classify_response function with:
- type: "conversation", "planning", or "build"
- message: Your response text. For planning, use numbered steps. For build, describe what will be created.

## Language
Always respond in Portuguese (Brazilian).`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "classify_response",
                description:
                  "Classify the user intent and return structured response",
                parameters: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["conversation", "planning", "build"],
                    },
                    message: { type: "string" },
                  },
                  required: ["type", "message"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "classify_response" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de requisições excedido. Tente novamente em alguns instantes.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos de IA esgotados. Adicione créditos ao workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", status, errorText);
      throw new Error(`AI Gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let result: { type: string; message: string; issue_url?: string };

    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: use content directly
      result = {
        type: "conversation",
        message:
          aiData.choices?.[0]?.message?.content ||
          "Desculpe, não consegui processar sua mensagem.",
      };
    }

    // 6. If build intent, create GitHub issue
    if (result.type === "build") {
      const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
      if (GITHUB_TOKEN) {
        try {
          const ghResponse = await fetch(
            "https://api.github.com/repos/Alex-Griebeler/move-progress-log/issues",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "Fabrik-AI-Builder",
              },
              body: JSON.stringify({
                title: "AI Builder Task",
                body: `## Solicitação do AI Builder\n\n${message}\n\n---\n\n## Plano de implementação\n\n${result.message}`,
              }),
            }
          );

          if (ghResponse.ok) {
            const ghData = await ghResponse.json();
            result.issue_url = ghData.html_url;
            result.message += `\n\n✅ Issue criada com sucesso: ${ghData.html_url}`;
          } else {
            const ghError = await ghResponse.text();
            console.error("GitHub API error:", ghError);
            result.message +=
              "\n\n⚠️ Não foi possível criar a issue no GitHub. Verifique o token.";
          }
        } catch (ghErr) {
          console.error("GitHub error:", ghErr);
          result.message +=
            "\n\n⚠️ Erro ao conectar ao GitHub.";
        }
      } else {
        result.message +=
          "\n\n⚠️ GITHUB_TOKEN não configurado. A issue não foi criada.";
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-builder-chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
