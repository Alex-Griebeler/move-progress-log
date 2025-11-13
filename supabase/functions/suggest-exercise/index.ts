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
    const { exerciseName, allExercises } = await req.json();

    if (!exerciseName || !allExercises || allExercises.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nome do exercício e lista de exercícios são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Buscando exercício similar para: "${exerciseName}"`);
    console.log(`📚 Base de dados: ${allExercises.length} exercícios`);

    // Criar lista formatada de exercícios para o modelo
    const exercisesList = allExercises.map((ex: any) => ex.name).join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um especialista em exercícios físicos e deve ajudar a padronizar nomes de exercícios.

Sua tarefa:
1. Analisar o nome do exercício mencionado pelo usuário
2. Comparar com a lista de exercícios cadastrados no banco de dados
3. Identificar o exercício mais similar semanticamente
4. Retornar APENAS o nome EXATO do exercício da lista

Regras importantes:
- Considere sinônimos e variações de nomes (ex: "flexão de braço" = "push up")
- Ignore pequenas diferenças de grafia
- Leve em conta o contexto do movimento
- Se não houver correspondência clara (confiança < 70%), retorne null
- RETORNE APENAS UM DOS NOMES DA LISTA, sem modificações

Exemplo:
Usuário menciona: "flexão"
Lista contém: ["Flexão de Braço", "Agachamento", "Rosca Direta"]
Você deve retornar: "Flexão de Braço"`;

    const userPrompt = `Nome mencionado pelo usuário: "${exerciseName}"

Lista de exercícios cadastrados:
${exercisesList}

Qual exercício da lista é mais similar ao mencionado? Retorne APENAS o nome exato ou "null" se não houver correspondência clara.`;

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
      const errorText = await response.text();
      console.error('❌ Erro na API Lovable:', response.status, errorText);
      throw new Error(`Erro na API Lovable: ${response.status}`);
    }

    const data = await response.json();
    const suggestedName = data.choices[0]?.message?.content?.trim();

    console.log(`💡 Sugestão da IA: "${suggestedName}"`);

    // Validar se a sugestão existe na lista
    const suggestedExercise = allExercises.find(
      (ex: any) => ex.name.toLowerCase() === suggestedName?.toLowerCase()
    );

    if (!suggestedExercise || suggestedName === 'null') {
      console.log('⚠️ Nenhuma correspondência encontrada');
      return new Response(
        JSON.stringify({ 
          success: true,
          suggested: null,
          message: 'Nenhum exercício similar encontrado com confiança suficiente'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Exercício encontrado: ${suggestedExercise.name}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        suggested: {
          id: suggestedExercise.id,
          name: suggestedExercise.name,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
