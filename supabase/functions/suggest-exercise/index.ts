import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exerciseName, functionalGroup, allExercises } = await req.json();

    if (!exerciseName) {
      return new Response(
        JSON.stringify({ error: 'Nome do exercício é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Searching for similar exercise

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // MEL-IA-003: Use pg_trgm for DB-side similarity search (much faster than sending full list)
    let candidates: Array<{ id: string; name: string }> = [];
    let usedTrigram = false;

    try {
      const { data: trigramResults, error: trigramError } = await supabase
        .rpc('search_exercises_by_name', {
          p_query: exerciseName,
          p_functional_group: functionalGroup || null,
          p_limit: 15,
        });

      if (!trigramError && trigramResults && trigramResults.length > 0) {
        candidates = trigramResults.map((r: any) => ({ id: r.id, name: r.name }));
        usedTrigram = true;
        // pg_trgm returned candidates
      }
    } catch (e) {
      // pg_trgm failed, using fallback
    }

    // Fallback: use allExercises from client if pg_trgm failed or returned nothing
    if (!usedTrigram || candidates.length === 0) {
      if (allExercises && allExercises.length > 0) {
        // Filter by functional group if available
        candidates = functionalGroup
          ? allExercises.filter((ex: any) => ex.functional_group === functionalGroup)
          : allExercises;
        
        // If filtered list is empty, use full list
        if (candidates.length === 0) candidates = allExercises;
        
        // Fallback: using client exercises
      } else {
        // Last resort: query all exercises from DB
        const { data: allFromDb } = await supabase
          .from('exercises_library')
          .select('id, name')
          .order('name');
        candidates = allFromDb || [];
        // Fallback: queried all from DB
      }
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggested: null, message: 'Nenhum exercício encontrado na base' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const exercisesList = candidates.map((ex: any) => ex.name).join('\n');

    const systemPrompt = `Você é um especialista em exercícios físicos e deve ajudar a padronizar nomes de exercícios.

Sua tarefa:
1. Analisar o nome do exercício mencionado pelo usuário
2. Comparar com a lista de exercícios cadastrados
3. Identificar o exercício mais similar semanticamente
4. Retornar APENAS o nome EXATO do exercício da lista

Regras:
- Considere sinônimos e variações (ex: "flexão de braço" = "push up")
- Ignore pequenas diferenças de grafia
- Se não houver correspondência clara (confiança < 70%), retorne null
- RETORNE APENAS UM DOS NOMES DA LISTA, sem modificações`;

    const userPrompt = `Nome mencionado: "${exerciseName}"

Exercícios cadastrados:
${exercisesList}

Qual exercício da lista é mais similar? Retorne APENAS o nome exato ou "null".`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido, tente novamente em instantes', success: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados', success: false }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      // AI API error
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const suggestedName = data.choices[0]?.message?.content?.trim();

    // Suggestion resolved

    // Validate suggestion exists in candidates
    const suggestedExercise = candidates.find(
      (ex: any) => ex.name.toLowerCase() === suggestedName?.toLowerCase()
    );

    if (!suggestedExercise || suggestedName === 'null') {
      return new Response(
        JSON.stringify({ success: true, suggested: null, message: 'Nenhum exercício similar encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        suggested: { id: suggestedExercise.id, name: suggestedExercise.name },
        searchMethod: usedTrigram ? 'pg_trgm' : 'fallback',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Error in suggest-exercise
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
