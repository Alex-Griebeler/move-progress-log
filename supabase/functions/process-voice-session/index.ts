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

1. **Repetições**: OBRIGATÓRIAS para cada exercício

2. **Séries**: Use null se não mencionado (usará valor prescrito)

3. **Carga - Dois campos obrigatórios**:
   
   a) **load_breakdown** (descrição completa da montagem):
      - Se carga foi mencionada: registre EXATAMENTE como foi dito
      - Formato: "(peso1 + peso2) + barra X kg"
      - Exemplo: "(15 lb + 2 kg) + barra 10 kg"
      - Se não mencionado: null
   
   b) **load_kg** (total convertido, 1 casa decimal):
      - Se carga foi mencionada: calcule o total em kg
      - ARREDONDE para 1 CASA DECIMAL
      - Se não mencionado: null

4. **Conversão de Libras (PADRÃO FABRIK)**:
   - **1 lb = 0.45 kg** (usar este valor, não o técnico)
   - **ATENÇÃO: "de cada lado" significa multiplicar por 2**
   
   Exemplos:
   
   a) "25 kg"
      * load_breakdown: "25 kg"
      * load_kg: 25.0
   
   b) "25 lb de cada lado + barra 10 kg"
      * "de cada lado" = 25 lb × 2 = 50 lb
      * 50 lb = 22.5 kg (50 × 0.45)
      * Total: 22.5 + 10 = 32.5 kg
      * load_breakdown: "(25 lb × 2) + barra 10 kg"
      * load_kg: 32.5
   
   c) "15 lb + 2 kg de cada lado + barra 10 kg"
      * (15 lb + 2 kg) × 2 = (6.8 kg + 2 kg) × 2 = 17.6 kg
      * Total: 17.6 + 10 = 27.6 kg
      * load_breakdown: "(15 lb + 2 kg) de cada lado + barra 10 kg"
      * load_kg: 27.6

5. **Nome do Exercício**:
   - Incluir tipo de pegada quando mencionado
   - Exemplos: "Afundo (pegada taça)", "Remada unilateral (halter)"

6. **is_best_set**:
   - Sempre true (registramos apenas a maior carga da sessão)

7. **Observações Técnicas** (campo observations):
   - Incluir: "carga submáxima", "dificuldade perna X", "boa execução"
   - Incluir qualquer comentário técnico relevante

8. **Observações Clínicas** (campo separado clinical_observations):
   - Extraia: DOR, DESCONFORTO, LIMITAÇÕES, DÉFICITS DE MOBILIDADE
   - UMA observação pode ter MÚLTIPLAS categorias
   - Exemplo: "dor no joelho esquerdo e dificuldade de mobilidade"
     * categories: ["dor", "mobilidade"]
   - Categorias possíveis: "dor", "mobilidade", "força", "técnica", "geral"
   - Severidade: "baixa", "média", "alta"

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
    
    // Garantir que load_kg sempre tenha 1 casa decimal
    extractedData.sessions?.forEach((session: any) => {
      session.exercises?.forEach((ex: any) => {
        if (ex.load_kg !== null && ex.load_kg !== undefined) {
          ex.load_kg = parseFloat(ex.load_kg.toFixed(1));
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
