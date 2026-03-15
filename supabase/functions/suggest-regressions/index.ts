import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
const MAX_LLM_CANDIDATES = 50;

const requestSchema = z.object({
  exerciseId: z.string().uuid('ID de exercício inválido'),
  exerciseName: z.string().min(1).max(200),
  movementPattern: z.string().min(1).max(100),
  movementPlane: z.string().max(100).optional(),
  laterality: z.string().max(100).optional(),
  availableExercises: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    movement_pattern: z.string(),
    movement_plane: z.string().nullable(),
    laterality: z.string().nullable()
  })).max(1000)
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação obrigatória' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // Validate and parse request body
    const body = await req.json();
    const validated = requestSchema.parse(body);
    const { exerciseId, exerciseName, movementPattern, movementPlane, laterality, availableExercises } = validated;
    const filteredExercises = availableExercises
      .filter((exercise) => exercise.id !== exerciseId && exercise.movement_pattern === movementPattern)
      .slice(0, MAX_LLM_CANDIDATES);
    const candidateExercises = filteredExercises.length > 0
      ? filteredExercises
      : availableExercises.filter((exercise) => exercise.id !== exerciseId).slice(0, MAX_LLM_CANDIDATES);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um especialista em prescrição de exercícios físicos. Sua tarefa é sugerir 3 exercícios de regressão progressiva (do menos para o mais fácil) para um exercício principal.

Critérios para regressões:
- Regressão 1: Ligeiramente mais fácil (mesma categoria de movimento, menor complexidade)
- Regressão 2: Moderadamente mais fácil (pode mudar plano/lateralidade, mantém padrão similar)
- Regressão 3: Significativamente mais fácil (versão mais básica do movimento)

Analise: padrão de movimento, plano de movimento, lateralidade, e complexidade.`;

    const userPrompt = `Exercício principal:
- Nome: ${exerciseName}
- Padrão de movimento: ${movementPattern}
- Plano de movimento: ${movementPlane || "não especificado"}
- Lateralidade: ${laterality || "não especificado"}

Exercícios disponíveis na biblioteca:
${candidateExercises.map((ex) => `- ID: ${ex.id}, Nome: ${ex.name}, Padrão: ${ex.movement_pattern}, Plano: ${ex.movement_plane || "N/A"}, Lateralidade: ${ex.laterality || "N/A"}`).join("\n")}

Retorne APENAS os 3 IDs dos exercícios sugeridos como regressões, ordenados do menos ao mais fácil.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_regressions",
              description: "Retorna 3 sugestões de exercícios de regressão ordenados progressivamente",
              parameters: {
                type: "object",
                properties: {
                  regressions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exercise_id: { type: "string", description: "ID do exercício sugerido" },
                        reasoning: { type: "string", description: "Breve explicação da escolha" }
                      },
                      required: ["exercise_id", "reasoning"],
                      additionalProperties: false
                    },
                    minItems: 3,
                    maxItems: 3
                  }
                },
                required: ["regressions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_regressions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: jsonHeaders,
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: jsonHeaders,
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao conectar com IA");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("IA não retornou sugestões válidas");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);
    const candidateIds = new Set(candidateExercises.map((exercise) => exercise.id));
    const regressions = Array.isArray(suggestions.regressions)
      ? suggestions.regressions.filter((item: { exercise_id?: string }) => typeof item.exercise_id === "string" && candidateIds.has(item.exercise_id))
      : [];

    return new Response(JSON.stringify({ regressions }), {
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("suggest-regressions error:", e);
    
    // Handle Zod validation errors
    if (e instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos', details: e.errors }),
        { status: 400, headers: jsonHeaders }
      );
    }
    
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
