/**
 * Edge Function: suggest-exercise-alternatives
 * MEL-IA-005: Suporte a regressões E progressões
 * 
 * Aceita direction: 'regression' | 'progression' | 'both'
 * Aceita studentLevel opcional (1-9) para contextualizar
 * Retorna { regressions: [], progressions: [] }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const requestSchema = z.object({
  exerciseId: z.string().uuid('ID de exercício inválido'),
  exerciseName: z.string().min(1).max(200),
  movementPattern: z.string().min(1).max(100),
  movementPlane: z.string().max(100).optional(),
  laterality: z.string().max(100).optional(),
  functionalGroup: z.string().max(100).optional(),
  direction: z.enum(['regression', 'progression', 'both']).default('regression'),
  studentLevel: z.number().int().min(1).max(9).optional(),
  availableExercises: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    movement_pattern: z.string(),
    movement_plane: z.string().nullable(),
    laterality: z.string().nullable(),
    numeric_level: z.number().nullable().optional(),
  })).max(1000)
});

function buildSystemPrompt(direction: string): string {
  const base = `Você é um especialista em prescrição de exercícios físicos da Fabrik Performance Studio. Sua tarefa é sugerir exercícios alternativos para um exercício principal.

Critérios gerais:
- Manter o mesmo padrão funcional (grupo funcional)
- Considerar plano de movimento e lateralidade
- Analisar complexidade, demanda de estabilização e risco`;

  if (direction === 'regression') {
    return `${base}

Sugira 3 exercícios de REGRESSÃO (do menos para o mais fácil):
- Regressão 1: Ligeiramente mais fácil (mesma categoria, menor complexidade)
- Regressão 2: Moderadamente mais fácil (pode mudar plano/lateralidade)
- Regressão 3: Significativamente mais fácil (versão mais básica)`;
  }
  
  if (direction === 'progression') {
    return `${base}

Sugira 3 exercícios de PROGRESSÃO (do menos para o mais difícil):
- Progressão 1: Ligeiramente mais difícil (mais complexidade ou instabilidade)
- Progressão 2: Moderadamente mais difícil (maior demanda neuromuscular)
- Progressão 3: Significativamente mais difícil (versão avançada do padrão)`;
  }

  // both
  return `${base}

Sugira 3 REGRESSÕES (mais fáceis) e 3 PROGRESSÕES (mais difíceis):
Regressões: ordenadas do ligeiramente mais fácil ao mais básico.
Progressões: ordenadas do ligeiramente mais difícil ao mais avançado.`;
}

function buildToolDefinition(direction: string) {
  const regressionProp = {
    type: "array",
    items: {
      type: "object",
      properties: {
        exercise_id: { type: "string", description: "ID do exercício sugerido" },
        reasoning: { type: "string", description: "Breve explicação da escolha" },
      },
      required: ["exercise_id", "reasoning"],
      additionalProperties: false,
    },
    // SR-03: Dynamic minItems based on available exercises count
    minItems: 1,
    maxItems: 3,
  };

  const progressionProp = { ...regressionProp };

  const properties: Record<string, any> = {};
  const required: string[] = [];

  if (direction === 'regression' || direction === 'both') {
    properties.regressions = regressionProp;
    required.push('regressions');
  }
  if (direction === 'progression' || direction === 'both') {
    properties.progressions = progressionProp;
    required.push('progressions');
  }

  return {
    type: "function" as const,
    function: {
      name: "suggest_alternatives",
      description: `Retorna sugestões de exercícios alternativos (${direction})`,
      parameters: {
        type: "object",
        properties,
        required,
        additionalProperties: false,
      },
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação obrigatória' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const validated = requestSchema.parse(body);
    const { exerciseName, movementPattern, movementPlane, laterality, functionalGroup, direction, studentLevel } = validated;
    
    // SR-02: Pre-filter to same movement_pattern (+ adjacent for progressions) before sending to LLM
    let filteredExercises = validated.availableExercises.filter(
      (ex) => ex.movement_pattern === movementPattern
    );
    
    // For progressions, include adjacent patterns
    if (direction !== 'regression' && filteredExercises.length < 10) {
      filteredExercises = validated.availableExercises;
    }
    
    // SR-03: Cap at 50 candidates for LLM efficiency
    const availableExercises = filteredExercises.slice(0, 50);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt(direction);

    const levelContext = studentLevel 
      ? `\nNível do aluno: ${studentLevel}/9 (considere ao sugerir alternativas adequadas)`
      : '';

    const groupContext = functionalGroup 
      ? `\nGrupo funcional: ${functionalGroup}`
      : '';

    const userPrompt = `Exercício principal:
- Nome: ${exerciseName}
- Padrão de movimento: ${movementPattern}${groupContext}
- Plano de movimento: ${movementPlane || "não especificado"}
- Lateralidade: ${laterality || "não especificado"}${levelContext}

Exercícios disponíveis na biblioteca:
${availableExercises.map((ex) => `- ID: ${ex.id}, Nome: ${ex.name}, Padrão: ${ex.movement_pattern}, Plano: ${ex.movement_plane || "N/A"}, Lateralidade: ${ex.laterality || "N/A"}${ex.numeric_level ? `, Nível: ${ex.numeric_level}` : ''}`).join("\n")}

Retorne APENAS os IDs dos exercícios sugeridos como alternativas.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [buildToolDefinition(direction)],
        tool_choice: { type: "function", function: { name: "suggest_alternatives" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      // AI gateway error
      throw new Error("Erro ao conectar com IA");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("IA não retornou sugestões válidas");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    // Normalizar resposta para sempre ter ambos os arrays
    const result = {
      regressions: suggestions.regressions || [],
      progressions: suggestions.progressions || [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // suggest-exercise-alternatives error

    if (e instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos', details: e.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
