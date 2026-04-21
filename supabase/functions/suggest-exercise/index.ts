import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const MAX_EXERCISE_NAME_CHARS = 200;
const MAX_MOVEMENT_PATTERN_CHARS = 100;
const MAX_CANDIDATES = 50;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SE-01: Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado', success: false }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado', success: false }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: 'Payload inválido', success: false }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const payload = body as Record<string, unknown>;
    const exerciseName = typeof payload.exerciseName === 'string' ? payload.exerciseName.trim() : '';
    const movementPattern = typeof payload.movementPattern === 'string' ? payload.movementPattern.trim() : '';

    if (!exerciseName) {
      return new Response(
        JSON.stringify({ error: 'Nome do exercício é obrigatório' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (exerciseName.length > MAX_EXERCISE_NAME_CHARS) {
      return new Response(
        JSON.stringify({ error: `Nome do exercício excede ${MAX_EXERCISE_NAME_CHARS} caracteres` }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (movementPattern.length > MAX_MOVEMENT_PATTERN_CHARS) {
      return new Response(
        JSON.stringify({ error: `movementPattern excede ${MAX_MOVEMENT_PATTERN_CHARS} caracteres` }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Use service role for DB queries
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // MEL-IA-003: Use pg_trgm for DB-side similarity search (much faster than sending full list)
    let candidates: Array<{ id: string; name: string }> = [];
    let usedTrigram = false;

    try {
      const { data: trigramResults, error: trigramError } = await supabase
        .rpc('search_exercises_by_name', {
          p_query: exerciseName,
          p_movement_pattern: movementPattern || null,
          p_limit: 15,
        });

      if (!trigramError && trigramResults && trigramResults.length > 0) {
        candidates = trigramResults.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string }));
        usedTrigram = true;
        // pg_trgm returned candidates
      }
    } catch (e) {
      // pg_trgm failed, using fallback
    }

    // SE-03: Always use DB data — ignore allExercises from client payload to prevent manipulation
    if (!usedTrigram || candidates.length === 0) {
      // Fallback: keep candidate list bounded to avoid oversized prompts
      const partialMatch = `%${exerciseName.slice(0, MAX_EXERCISE_NAME_CHARS)}%`;
      let query = supabase.from('exercises_library').select('id, name').ilike('name', partialMatch);
      if (movementPattern) {
        query = query.eq('movement_pattern', movementPattern);
      }

      const { data: filteredFromDb, error: filteredFromDbError } = await query.order('name').limit(MAX_CANDIDATES);
      if (filteredFromDbError) {
        throw new Error(`Erro ao buscar candidatos filtrados: ${filteredFromDbError.message}`);
      }
      candidates = filteredFromDb || [];

      if (candidates.length === 0 && movementPattern) {
        const { data: movementOnlyResults, error: movementOnlyError } = await supabase
          .from('exercises_library')
          .select('id, name')
          .eq('movement_pattern', movementPattern)
          .order('name')
          .limit(MAX_CANDIDATES);
        if (movementOnlyError) {
          throw new Error(`Erro ao buscar candidatos por padrão: ${movementOnlyError.message}`);
        }
        candidates = movementOnlyResults || [];
      }

      if (candidates.length === 0) {
        const { data: allFromDb, error: allFromDbError } = await supabase
          .from('exercises_library')
          .select('id, name')
          .order('name')
          .limit(MAX_CANDIDATES);
        if (allFromDbError) {
          throw new Error(`Erro ao buscar fallback de exercícios: ${allFromDbError.message}`);
        }
        candidates = allFromDb || [];
      }
    }

    if (candidates.length === 0) {
      return new Response(
        // SE-02: Include reason for null suggestion
        JSON.stringify({ success: true, suggested: null, reason: 'no_candidates', message: 'Nenhum exercício encontrado na base' }),
        { headers: jsonHeaders }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const exercisesList = candidates.map((ex) => ex.name).join('\n');

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
          { status: 429, headers: jsonHeaders }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados', success: false }),
          { status: 402, headers: jsonHeaders }
        );
      }
      const errorText = await response.text();
      // AI API error
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const suggestedName = data.choices[0]?.message?.content?.trim();

    // SE-04: Normalize accents for robust comparison
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // Validate suggestion exists in candidates
    const suggestedExercise = candidates.find(
      (ex) => normalize(ex.name) === normalize(suggestedName || '')
    );

    if (!suggestedExercise || suggestedName === 'null') {
      // SE-02: Include reason for null suggestion
      const reason = !suggestedName || suggestedName === 'null' ? 'no_match' : 'low_confidence';
      return new Response(
        JSON.stringify({ success: true, suggested: null, reason, message: reason === 'no_match' ? 'Nenhum exercício similar encontrado' : 'Confiança insuficiente no mapeamento' }),
        { headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        suggested: { id: suggestedExercise.id, name: suggestedExercise.name },
        searchMethod: usedTrigram ? 'pg_trgm' : 'fallback',
      }),
      { headers: jsonHeaders }
    );

  } catch (error) {
    // Error in suggest-exercise
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido', success: false }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
