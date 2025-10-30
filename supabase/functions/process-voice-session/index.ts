import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

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
    
    const { audio, prescriptionId, students, date, time } = await req.json();
    
    if (!audio || !prescriptionId || !students || !date || !time) {
      throw new Error('Parâmetros obrigatórios faltando');
    }

    console.log("🎤 Processing audio...");
    
    // 1️⃣ Transcrever áudio usando OpenAI Whisper
    const binaryAudio = processBase64Chunks(audio);
    const audioBlob = new Blob([binaryAudio], { type: 'audio/webm' });
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error('Erro ao transcrever áudio');
    }

    const { text: transcription } = await whisperResponse.json();
    console.log("✅ Transcription completed:", transcription.substring(0, 100) + "...");

    // 2️⃣ Buscar detalhes da prescrição
    const { data: prescription, error: prescError } = await supabaseClient
      .from('workout_prescriptions')
      .select(`*, prescription_exercises (id, sets, reps, order_index, exercises_library (name))`)
      .eq('id', prescriptionId)
      .single();
    
    if (prescError) {
      console.error('Error fetching prescription:', prescError);
      throw new Error('Erro ao buscar prescrição');
    }

    const studentsInfo = students
      .map((s: any) => `  - ${s.name}${s.weight_kg ? ` (peso: ${s.weight_kg} kg)` : ' (peso não cadastrado)'}`)
      .join('\n');
    
    const exercisesInfo = prescription.prescription_exercises
      .map((ex: any) => `  ${ex.order_index + 1}. ${ex.exercises_library.name}: ${ex.sets} séries × ${ex.reps} reps`)
      .join('\n');

    // 3️⃣ Processar com Lovable AI para extrair dados estruturados
    console.log("🤖 Processing with Lovable AI...");
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
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
3. Séries: use NULL se não mencionado (usará prescrito)
4. Peso corporal: se aluno tem peso cadastrado, use o valor; senão NULL
5. Converta libras para kg (1 lb = 0.453592 kg)
6. Detecte adaptações: "X substituindo Y"
7. Extraia observações clínicas: DOR, DESCONFORTO, LIMITAÇÕES, DÉFICITS DE MOBILIDADE
8. Categorize observações: "dor", "mobilidade", "força", "técnica", "geral"
9. Severidade: "baixa", "média", "alta"`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transcrição da sessão:\n\n${transcription}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_session_data",
              description: "Extrai dados estruturados da sessão de treino",
              parameters: {
                type: "object",
                properties: {
                  sessions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        student_name: { type: "string" },
                        clinical_observations: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              observation_text: { type: "string" },
                              category: { 
                                type: "string",
                                enum: ["dor", "mobilidade", "força", "técnica", "geral"]
                              },
                              severity: {
                                type: "string",
                                enum: ["baixa", "média", "alta"]
                              }
                            },
                            required: ["observation_text", "category", "severity"]
                          }
                        },
                        exercises: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              prescribed_exercise_name: { type: "string" },
                              executed_exercise_name: { type: "string" },
                              sets: { type: "number" },
                              reps: { type: "number" },
                              load_kg: { type: "number" },
                              load_breakdown: { type: "string" },
                              observations: { type: "string" },
                              is_best_set: { type: "boolean", default: true }
                            },
                            required: ["executed_exercise_name", "reps", "load_breakdown"]
                          }
                        }
                      },
                      required: ["student_name", "exercises"]
                    }
                  }
                },
                required: ["sessions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_session_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      throw new Error('Erro ao processar com AI');
    }

    const aiResult = await aiResponse.json();
    console.log("✅ AI processing completed");

    // Extrair dados da resposta da função
    const toolCall = aiResult.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('AI não retornou dados estruturados');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

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
