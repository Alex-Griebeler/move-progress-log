import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')!;
const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);

// Processar base64 em chunks para prevenir problemas de memória
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📥 Received request to process voice session");
    
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { audio, prescriptionId, students, date, time } = await req.json();
    
    // Validate required fields
    if (!audio || !students || !Array.isArray(students) || students.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: audio or students' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!date || !time) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: date or time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👤 User ${user.id} processing session${prescriptionId ? ` for prescription ${prescriptionId}` : ' (free session)'}`);

    // Verify trainer owns the prescription (only if prescriptionId is provided)
    if (prescriptionId) {
      const { data: prescription, error: prescriptionError } = await supabaseClient
        .from('workout_prescriptions')
        .select('trainer_id')
        .eq('id', prescriptionId)
        .single();

      if (prescriptionError || !prescription) {
        console.error('❌ Prescription not found:', prescriptionError);
        return new Response(
          JSON.stringify({ error: 'Prescription not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (prescription.trainer_id !== user.id) {
        console.error('❌ Unauthorized access attempt:', user.id, 'to prescription:', prescriptionId);
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to prescription data' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify trainer owns all students
    const { data: studentRecords, error: studentsError } = await supabaseClient
      .from('students')
      .select('id, trainer_id')
      .in('id', students.map((s: any) => s.id));

    if (studentsError || !studentRecords) {
      console.error('❌ Error fetching students:', studentsError);
      return new Response(
        JSON.stringify({ error: 'Error validating students' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const unauthorizedStudents = studentRecords.filter(s => s.trainer_id !== user.id);
    if (unauthorizedStudents.length > 0) {
      console.error('❌ Unauthorized student access attempt:', unauthorizedStudents.map(s => s.id));
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to one or more students' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("🎤 Processing audio with Gemini...");
    
    // 1️⃣ Transcrever áudio usando Gemini
    const binaryAudio = processBase64Chunks(audio);
    
    // Converter para base64 sem prefixo data URL
    let audioBase64 = '';
    const bytes = new Uint8Array(binaryAudio);
    const len = bytes.length;
    for (let i = 0; i < len; i++) {
      audioBase64 += String.fromCharCode(bytes[i]);
    }
    audioBase64 = btoa(audioBase64);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" 
    });

    const transcriptionResult = await model.generateContent([
      {
        inlineData: {
          mimeType: "audio/webm",
          data: audioBase64
        }
      },
      `Transcreva este áudio em português brasileiro sobre treino físico. 
  
CORREÇÕES OBRIGATÓRIAS:
- "alteres" → "halteres"
- "querobel", "ketobel", "quetobell", "quetobel" → "kettlebell"
- "supino" (manter assim)
- "agachamento" (manter assim)

Retorne APENAS a transcrição corrigida, sem adicionar comentários.`
    ]);

    const transcription = transcriptionResult.response.text();
    console.log("✅ Transcription completed:", transcription.substring(0, 100) + "...");

    // 2️⃣ Buscar detalhes completos da prescrição (se fornecida)
    let prescriptionDetails = null;
    
    if (prescriptionId) {
      const { data: prescDetailsData, error: prescDetailsError } = await supabaseClient
        .from('workout_prescriptions')
        .select(`*, prescription_exercises (id, sets, reps, order_index, exercises_library (name))`)
        .eq('id', prescriptionId)
        .single();
      
      if (prescDetailsError || !prescDetailsData) {
        console.error('❌ Error fetching prescription details:', prescDetailsError);
        throw new Error('Erro ao buscar detalhes da prescrição');
      }
      
      prescriptionDetails = prescDetailsData;
    }

    const studentsInfo = students
      .map((s: any) => `  - ${s.name}${s.weight_kg ? ` (peso: ${s.weight_kg} kg)` : ' (peso não cadastrado)'}`)
      .join('\n');
    
    const exercisesInfo = prescriptionDetails 
      ? prescriptionDetails.prescription_exercises
          .map((ex: any) => `  ${ex.order_index + 1}. ${ex.exercises_library.name}: ${ex.sets} séries × ${ex.reps} reps`)
          .join('\n')
      : '  (Sessão livre - sem prescrição definida)';

    // 3️⃣ Processar com Gemini para extrair dados estruturados
    console.log("🤖 Processing structured data with Gemini...");
    
    const systemPrompt = `Você é um assistente especializado em extrair dados estruturados de sessões de treino EM GRUPO seguindo o padrão Fabrik Time Efficient.

CONTEXTO DA SESSÃO:
📅 Data: ${date}
⏰ Hora: ${time}

👥 ALUNOS PRESENTES:
${studentsInfo}

💪 EXERCÍCIOS PRESCRITOS:
${exercisesInfo}

INSTRUÇÕES CRÍTICAS (PADRÃO FABRIK):

1. **Repetições (reps)**: 
   - **REGRA CRÍTICA**: Se o áudio mencionar o exercício mas NÃO especificar reps, você DEVE marcar como null
   - **NUNCA USE 0 (ZERO)**: Use sempre null quando não mencionado
   - Exemplo: "fez 3 séries de agachamento" → reps: null (não especificou quantas repetições)
   - Exemplo: "agachamento, 8 repetições" → reps: 8
   - **NUNCA invente valores de reps que não foram mencionados**

2. **Séries**: Use null se não mencionado (usará valor prescrito)

**IMPORTANTE - PESO CORPORAL (CÁLCULO AUTOMÁTICO)**:
   - Se o exercício usa "peso corporal" ou "PC" e você TEM o peso do aluno (weight_kg):
     * SEMPRE calcule automaticamente: load_kg = weight_kg do aluno
     * load_breakdown: "Peso corporal = [weight_kg] kg"
     * Exemplo: Se aluno pesa 75 kg → load_breakdown: "Peso corporal = 75.0 kg", load_kg: 75.0
   - Se NÃO tiver o peso do aluno:
     * load_breakdown: "Peso corporal"
     * load_kg: null

3. **Carga - FORMATO OBRIGATÓRIO DE load_breakdown**:
   
   a) **load_breakdown** (descrição completa da montagem):
      - **REGRA CRÍTICA**: Quando houver múltiplos pesos de cada lado, TODOS devem estar DENTRO do parêntese
      - ✅ CORRETO: "(25 lb + 2 kg + 1 kg) de cada lado + barra 10 kg"
      - ❌ ERRADO: "(25 lb) de cada lado + 2 kg + barra 10 kg"
      - ❌ ERRADO: "(10 lb) de cada lado + 1 kg + barra 10 kg"
      
      **KETTLEBELLS DUPLOS (CRÍTICO)**:
      - "duplo kettlebell de 32 kg" → load_breakdown: "2 kettlebells de 32 kg", load_kg: 64.0
      - "kettlebell duplo de 24 kg" → load_breakdown: "2 kettlebells de 24 kg", load_kg: 48.0
      - "2 kettlebells de 28 kg" → load_breakdown: "2 kettlebells de 28 kg", load_kg: 56.0
      - "dois halteres de 15 kg" → load_breakdown: "2 halteres de 15 kg", load_kg: 30.0
      
      **Exemplos válidos:**
      - "(10 lb + 5 kg) de cada lado + barra 20 kg"
      - "15 kg" (peso único, sem barra)
      - "2 kettlebells de 32 kg" (peso duplo, SEM barra)
      - "Peso corporal" (exercícios sem carga externa)
      
      - Se não mencionado: null
   
   b) **load_kg** (total convertido, 1 casa decimal):
      - Se carga foi mencionada: calcule o total em kg
      - ARREDONDE para 1 CASA DECIMAL
      - Se não mencionado: null

4. **Conversão de Libras (PADRÃO FABRIK)**:
   - **1 lb = 0.45 kg** (usar este valor, não o técnico)
   - **ATENÇÃO: "de cada lado" significa multiplicar por 2**
   - **CÁLCULO OBRIGATÓRIO**: Se load_breakdown foi preenchido, load_kg NUNCA pode ser null
   - **ARREDONDAMENTO**: Sempre 1 casa decimal
   
   Exemplos detalhados:
   
   a) "25 kg"
      * load_breakdown: "25 kg"
      * load_kg: 25.0
   
   b) "25 lb de cada lado + barra 10 kg"
      * Passo 1: 25 lb = 25 × 0.45 = 11.3 kg (por lado)
      * Passo 2: 11.3 × 2 lados = 22.6 kg
      * Passo 3: 22.6 + 10 (barra) = 32.6 kg
      * load_breakdown: "(25 lb) de cada lado + barra 10 kg"
      * load_kg: 32.6
   
   c) "15 lb + 2 kg de cada lado + barra 10 kg"
      * Passo 1: 15 lb = 15 × 0.45 = 6.8 kg
      * Passo 2: (6.8 + 2) × 2 lados = 17.6 kg
      * Passo 3: 17.6 + 10 (barra) = 27.6 kg
       * load_breakdown: "(15 lb + 2 kg) de cada lado + barra 10 kg"
       * load_kg: 27.6

**EXEMPLOS PRÁTICOS DE CARGA (12 CENÁRIOS REAIS)**:

a) **Peso corporal COM registro:**
   Áudio: "Fez flexão de braço"
   Aluno: peso = 80 kg
   → load_breakdown: "Peso corporal = 80.0 kg"
   → load_kg: 80.0

b) **Peso corporal SEM registro:**
   Áudio: "Fez flexão de braço"
   Aluno: peso não cadastrado
   → load_breakdown: "Peso corporal"
   → load_kg: null

c) **Kettlebell simples:**
   Áudio: "Levantamento terra com kettlebell de 32 kg"
   → load_breakdown: "32 kg"
   → load_kg: 32.0

d) **2 Kettlebells (CRÍTICO - SEMPRE MULTIPLICAR POR 2):**
   Áudio: "Agachamento com 2 kettlebells de 24 kg"
   → load_breakdown: "2 kettlebells de 24 kg"
   → load_kg: 48.0
   
e) **Duplo kettlebell (MESMA REGRA):**
   Áudio: "Remada com duplo kettlebell de 28 kg"
   → load_breakdown: "2 kettlebells de 28 kg"
   → load_kg: 56.0

f) **Halter simples (cada mão):**
   Áudio: "Rosca com halteres de 12 kg cada"
   → load_breakdown: "2 halteres de 12 kg"
   → load_kg: 24.0

g) **Barra + anilhas em LB de cada lado:**
   Áudio: "Supino com 45 lb de cada lado e barra de 20 kg"
   → Cálculo: 45 lb × 0.45 = 20.3 kg → 20.3 × 2 = 40.6 kg → 40.6 + 20 = 60.6 kg
   → load_breakdown: "(45 lb) de cada lado + barra 20 kg"
   → load_kg: 60.6

h) **Anilhas mistas (lb + kg) de cada lado:**
   Áudio: "Agachamento com 25 lb e 5 kg de cada lado, barra 10 kg"
   → Cálculo: (25 × 0.45 + 5) × 2 + 10 = (11.3 + 5) × 2 + 10 = 32.6 + 10 = 42.6 kg
   → load_breakdown: "(25 lb + 5 kg) de cada lado + barra 10 kg"
   → load_kg: 42.6

i) **Múltiplas anilhas de cada lado (CRÍTICO - TODAS DENTRO DO PARÊNTESE):**
   Áudio: "Terra com 25 lb, 2 kg e 1 kg de cada lado, barra 15 kg"
   → Cálculo: (25 × 0.45 + 2 + 1) × 2 + 15 = (11.3 + 3) × 2 + 15 = 28.6 + 15 = 43.6 kg
   → load_breakdown: "(25 lb + 2 kg + 1 kg) de cada lado + barra 15 kg"
   → load_kg: 43.6

j) **Anilhas diferentes em cada lado (raro mas possível):**
   Áudio: "Agachamento assimétrico, lado direito 20 kg, lado esquerdo 15 kg, barra 10 kg"
   → load_breakdown: "20 kg (dir) + 15 kg (esq) + barra 10 kg"
   → load_kg: 45.0

k) **Carga não mencionada:**
   Áudio: "Fez 3 séries de agachamento com 10 repetições"
   → load_breakdown: null
   → load_kg: null

l) **Exercício sem carga externa:**
   Áudio: "Prancha isométrica por 60 segundos"
   → load_breakdown: "Peso corporal = 75.0 kg" (se peso cadastrado)
   → load_kg: 75.0

**REGRAS PARA CAMPOS NÃO PREENCHIDOS**:
- Se a carga NÃO foi mencionada no áudio:
  * load_breakdown: null (não "", não "não informado")
  * load_kg: null (não 0)
- Se as repetições NÃO foram mencionadas:
  * reps: null (não 0, não "")
- Se as séries NÃO foram mencionadas:
  * sets: null (não 0, não "")
- Se NÃO há observações sobre o exercício:
  * observations: null (não "", não "sem observações")

**CRÍTICO**: NUNCA use strings vazias "" ou valores 0 para dados não informados. SEMPRE use null.

5. **Nome do Exercício**:
   - Incluir tipo de pegada quando mencionado
   - Exemplos: "Afundo (pegada taça)", "Remada unilateral (halter)"

6. **is_best_set**:
   - Sempre true (registramos apenas a maior carga da sessão)

7. **Observações Técnicas** (campo observations):
   - Incluir: "carga submáxima", "dificuldade perna X", "boa execução"
   - Incluir qualquer comentário técnico relevante

8. **Observações Clínicas** (campo separado clinical_observations):
   - Extraia: DOR, DESCONFORTO, LIMITAÇÕES, DÉFICITS DE MOBILIDADE/ATIVAÇÃO
   - **CAPITALIZE a primeira letra de cada observation_text**
   - Exemplo: "dor no joelho" → "Dor no joelho"
   - Exemplo: "desconforto no quadril" → "Desconforto no quadril"
   - UMA observação pode ter MÚLTIPLAS categorias
   - Exemplo: "Dor no joelho esquerdo e dificuldade de mobilidade"
     * categories: ["dor", "mobilidade"]
   - Categorias possíveis: "dor", "mobilidade", "força", "técnica", "geral"
   
   **CLASSIFICAÇÃO DE SEVERIDADE (CRÍTICO)**:
   - **ALTA**: Dor aguda, limitações severas que impedem o exercício
     * Exemplo: "Dor intensa no joelho que impediu o agachamento"
   - **MÉDIA**: Desconfortos, déficits de ativação, limitações moderadas
     * Exemplo: "Desconforto no quadril por déficit de ativação do glúteo"
     * Exemplo: "Dificuldade de mobilidade no tornozelo"
   - **BAIXA**: Comentários técnicos leves, fadiga normal
     * Exemplo: "Leve cansaço ao final da série"
   
   **REGRA GERAL**: Qualquer DOR, DESCONFORTO ou DÉFICIT deve ser no mínimo "média"

9. **prescribed_exercise_name** (IMPORTANTE):
   - Tente SEMPRE associar o exercício executado com um dos exercícios prescritos
   - Compare o nome executado com a lista de exercícios prescritos
   - Se houver correspondência (mesmo que parcial), use o nome prescrito
   - Exemplos:
     * Executado: "Agachamento taça" → Prescrito: "Agachamento goblet"
     * Executado: "Remada halter" → Prescrito: "Remada unilateral"
   - Se não houver correspondência clara: null

FORMATO DE SAÍDA:
{
  "sessions": [
    {
      "student_name": "nome do aluno",
      "clinical_observations": [
        {
          "observation_text": "descrição da observação",
          "categories": ["dor", "mobilidade"],
          "severity": "baixa|média|alta"
        }
      ],
      "exercises": [
        {
          "prescribed_exercise_name": "nome do exercício prescrito (ou null)",
          "executed_exercise_name": "nome executado (com pegada)",
          "sets": número ou null,
          "reps": número obrigatório,
          "load_kg": número com 1 casa decimal (ex: 25.0) ou null,
          "load_breakdown": "descrição EXATA ou null",
          "observations": "observações técnicas ou null",
          "is_best_set": true
        }
      ]
    }
  ]
}`;

    const extractionModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const extractionResult = await extractionModel.generateContent([
      systemPrompt,
      `\n\nTranscrição da sessão:\n\n${transcription}`
    ]);

    const extractedData = JSON.parse(extractionResult.response.text());
    
    // Função auxiliar para recalcular carga se Gemini não calculou
    function calculateLoadFromBreakdown(breakdown: string): number | null {
      try {
        let total = 0;
        let processedEachSide = false;
        
        // 1. DETECTAR "DE CADA LADO" (multiplicar por 2)
        const eachSideMatch = breakdown.match(/\((.*?)\)\s*de cada lado/i);
        if (eachSideMatch) {
          const content = eachSideMatch[1];
          processedEachSide = true;
          
          // Kg matches dentro do parêntese
          const kgMatches = content.matchAll(/(\d+(?:\.\d+)?)\s*kg/gi);
          for (const m of kgMatches) {
            total += parseFloat(m[1]) * 2;
          }
          
          // Lb matches dentro do parêntese (converter para kg)
          const lbMatches = content.matchAll(/(\d+(?:\.\d+)?)\s*lb/gi);
          for (const m of lbMatches) {
            total += parseFloat(m[1]) * 0.45 * 2;
          }
        }
        
        // 2. DETECTAR KETTLEBELLS DUPLOS (multiplicar por 2)
        const multiKbMatch = breakdown.match(/(2\s*kettlebells?|duplo\s*kettlebell|kettlebell\s*duplo|dois\s*halteres|2\s*halteres).*?(\d+(?:\.\d+)?)\s*(kg|lb)/i);
        if (multiKbMatch && !processedEachSide) {
          const value = parseFloat(multiKbMatch[2]);
          const unit = multiKbMatch[3].toLowerCase();
          total += (unit === 'lb' ? value * 0.45 : value) * 2;
        }
        
        // 3. EXTRAIR PESO DA BARRA (sempre adicionar)
        const barraMatch = breakdown.match(/barra\s*(\d+(?:\.\d+)?)\s*kg/i);
        if (barraMatch) {
          total += parseFloat(barraMatch[1]);
        }
        
        // 4. SE NÃO TEM "de cada lado" NEM "duplo", somar pesos normais
        if (!processedEachSide && !multiKbMatch) {
          const kgMatches = breakdown.matchAll(/(\d+(?:\.\d+)?)\s*kg/gi);
          for (const m of kgMatches) {
            // Não contar se já contou na barra
            if (!breakdown.substring(m.index!).startsWith('barra')) {
              total += parseFloat(m[1]);
            }
          }
          
          const lbMatches = breakdown.matchAll(/(\d+(?:\.\d+)?)\s*lb/gi);
          for (const m of lbMatches) {
            total += parseFloat(m[1]) * 0.45;
          }
        }
        
        return total > 0 ? Math.round(total * 10) / 10 : null;
      } catch (err) {
        console.error('Erro ao calcular carga:', err);
        return null;
      }
    }
    
    // Garantir que load_kg sempre tenha 1 casa decimal e recalcular se ausente
    console.log('🔧 Verificando cálculo de cargas...');
    extractedData.sessions?.forEach((session: any, sessionIdx: number) => {
      session.exercises?.forEach((ex: any, exIdx: number) => {
        if (ex.load_kg !== null && ex.load_kg !== undefined) {
          ex.load_kg = parseFloat(ex.load_kg.toFixed(1));
        } else if (ex.load_breakdown && !ex.load_kg) {
          console.log(`⚠️ Sessão ${sessionIdx + 1}, Exercício ${exIdx + 1}: load_kg ausente, recalculando...`);
          ex.load_kg = calculateLoadFromBreakdown(ex.load_breakdown);
          console.log(`✅ Recalculado: ${ex.load_kg} kg`);
        }
      });
    });
    
    console.log("✅ Structured data extraction completed");
    console.log("📊 Extracted data:", JSON.stringify(extractedData, null, 2));

    const response = {
      success: true,
      transcription,
      data: extractedData
    };
    
    console.log("📤 Sending response:", JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error processing voice session:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
