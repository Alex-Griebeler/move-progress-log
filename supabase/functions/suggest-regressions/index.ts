import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { exerciseId, exerciseName, movementPattern, movementPlane, laterality, availableExercises } = await req.json();
    
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
${availableExercises.map((ex: any) => `- ID: ${ex.id}, Nome: ${ex.name}, Padrão: ${ex.movement_pattern}, Plano: ${ex.movement_plane || "N/A"}, Lateralidade: ${ex.laterality || "N/A"}`).join("\n")}

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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-regressions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
