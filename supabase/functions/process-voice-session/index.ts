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
    if (!audio || !prescriptionId || !students || !Array.isArray(students) || students.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: audio, prescriptionId, or students' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!date || !time) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: date or time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👤 User ${user.id} processing session for prescription ${prescriptionId}`);

    // Verify trainer owns the prescription
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
      model: "gemini-1.5-flash" 
    });

    const transcriptionResult = await model.generateContent([
      {
        inlineData: {
          mimeType: "audio/webm",
          data: audioBase64
        }
      },
      "Transcreva este áudio em português brasileiro. Retorne APENAS a transcrição exata, sem adicionar comentários ou formatação."
    ]);

    const transcription = transcriptionResult.response.text();
    console.log("✅ Transcription completed:", transcription.substring(0, 100) + "...");

    // 2️⃣ Buscar detalhes completos da prescrição (já validamos que o trainer é dono)
    const { data: prescriptionDetails, error: prescDetailsError } = await supabaseClient
      .from('workout_prescriptions')
      .select(`*, prescription_exercises (id, sets, reps, order_index, exercises_library (name))`)
      .eq('id', prescriptionId)
      .single();
    
    if (prescDetailsError || !prescriptionDetails) {
      console.error('❌ Error fetching prescription details:', prescDetailsError);
      throw new Error('Erro ao buscar detalhes da prescrição');
    }

    const studentsInfo = students
      .map((s: any) => `  - ${s.name}${s.weight_kg ? ` (peso: ${s.weight_kg} kg)` : ' (peso não cadastrado)'}`)
      .join('\n');
    
    const exercisesInfo = prescriptionDetails.prescription_exercises
      .map((ex: any) => `  ${ex.order_index + 1}. ${ex.exercises_library.name}: ${ex.sets} séries × ${ex.reps} reps`)
      .join('\n');

    // 3️⃣ Processar com Gemini para extrair dados estruturados
    console.log("🤖 Processing structured data with Gemini...");
    
    const systemPrompt = `Você é um assistente especializado em extrair dados estruturados de sessões de treino EM GRUPO.

CONTEXTO DA SESSÃO:
📅 Data: ${date}
⏰ Hora: ${time}

👥 ALUNOS PRESENTES:
${studentsInfo}

💪 EXERCÍCIOS PRESCRITOS:
${exercisesInfo}

INSTRUÇÕES:
1. Extraia TODOS os exercícios mencionados para CADA aluno
2. Repetições são OBRIGATÓRIAS
3. Séries: use null se não mencionado (usará prescrito)
4. Peso corporal: se aluno tem peso cadastrado, use o valor; senão null
5. Converta libras para kg (1 lb = 0.453592 kg)
6. Detecte adaptações: "X substituindo Y"
7. Extraia observações clínicas: DOR, DESCONFORTO, LIMITAÇÕES, DÉFICITS DE MOBILIDADE
8. Categorize observações: "dor", "mobilidade", "força", "técnica", "geral"
9. Severidade: "baixa", "média", "alta"

Retorne um JSON válido com esta estrutura EXATA:
{
  "sessions": [
    {
      "student_name": "nome do aluno",
      "clinical_observations": [
        {
          "observation_text": "descrição da observação",
          "category": "dor|mobilidade|força|técnica|geral",
          "severity": "baixa|média|alta"
        }
      ],
      "exercises": [
        {
          "prescribed_exercise_name": "nome prescrito ou null",
          "executed_exercise_name": "nome executado",
          "sets": número ou null,
          "reps": número obrigatório,
          "load_kg": número ou null,
          "load_breakdown": "descrição da carga",
          "observations": "observações ou null",
          "is_best_set": true
        }
      ]
    }
  ]
}`;

    const extractionModel = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const extractionResult = await extractionModel.generateContent([
      systemPrompt,
      `\n\nTranscrição da sessão:\n\n${transcription}`
    ]);

    const extractedData = JSON.parse(extractionResult.response.text());
    console.log("✅ Structured data extraction completed");

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        data: extractedData
      }),
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
