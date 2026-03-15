import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const MAX_SESSION_STUDENTS = 10;

// V-02: Client initialized inside handler to prevent shared state between requests

// ═══════════════════════════════════════════════════════════════
// SHARED: manter sincronizado com process-voice-session/index.ts
// ═══════════════════════════════════════════════════════════════

/** Constantes de conversão de unidades */
const POUND_TO_KG_CONVERSION = 0.4536;

/** Correções terminológicas padrão para transcrição PT-BR */
const TERMINOLOGY_CORRECTIONS: Record<string, string> = {
  'alteres': 'halteres',
  'querobel': 'kettlebell',
  'ketobel': 'kettlebell',
  'quetobell': 'kettlebell',
  'quetobel': 'kettlebell',
  'sandbeg': 'sandbag',
  'land mine': 'landmine',
};

/** Categorias clínicas para observações extraídas */
const CLINICAL_CATEGORIES = ['dor', 'mobilidade', 'força', 'técnica', 'geral'] as const;

/** Níveis de severidade para observações clínicas */
const SEVERITY_LEVELS = {
  ALTA: 'alta',   // Dor aguda, limitações severas
  MEDIA: 'média', // Desconfortos, déficits de ativação
  BAIXA: 'baixa', // Comentários técnicos leves, fadiga normal
} as const;

/** Regras de carga por tipo de equipamento */
const EQUIPMENT_LOAD_RULES = {
  KETTLEBELL_DUPLO: 'Multiplicar por 2 (soma de ambos)',
  HALTERES_DUPLO: 'Multiplicar por 2 (soma de ambos)',
  BARRA_BILATERAL: 'Se "de cada lado" → multiplicar por 2 + barra',
  LANDMINE: 'Apenas carga adicionada, NÃO multiplicar por 2',
  SANDBAG: 'Carga direta, sem multiplicação',
  PESO_CORPORAL: 'Usar weight_kg do aluno se disponível, senão null',
  ELASTICO: 'NUNCA converter para kg, registrar como observação',
} as const;

// ═══════════════════════════════════════════════════════════════
// FIM SHARED
// ═══════════════════════════════════════════════════════════════

interface SessionContext {
  prescriptionId: string;
  students: Array<{
    id: string;
    name: string;
    weight_kg?: number;
  }>;
  prescriptionExercises: Array<{
    id: string;
    exercise_name: string;
    sets: string;
    reps: string;
    order_index: number;
  }>;
  date: string;
  time: string;
}

interface IncomingSessionContext {
  prescriptionId: string;
  students: Array<{ id: string }>;
  date: string;
  time: string;
}

function normalizeIncomingSessionContext(input: unknown): IncomingSessionContext | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const payload = input as Record<string, unknown>;
  const prescriptionId = typeof payload.prescriptionId === 'string' ? payload.prescriptionId.trim() : '';
  const date = typeof payload.date === 'string' ? payload.date.trim() : '';
  const time = typeof payload.time === 'string' ? payload.time.trim() : '';

  if (!UUID_RE.test(prescriptionId) || !DATE_RE.test(date) || !TIME_RE.test(time)) {
    return null;
  }

  if (!Array.isArray(payload.students) || payload.students.length === 0 || payload.students.length > MAX_SESSION_STUDENTS) {
    return null;
  }

  const uniqueIds = new Set<string>();
  const students = payload.students.map((student) => {
    if (!student || typeof student !== 'object' || Array.isArray(student)) {
      return null;
    }

    const studentRecord = student as Record<string, unknown>;
    const id = typeof studentRecord.id === 'string' ? studentRecord.id.trim() : '';
    if (!UUID_RE.test(id) || uniqueIds.has(id)) {
      return null;
    }

    uniqueIds.add(id);
    return { id };
  });

  if (students.some((student) => student === null)) {
    return null;
  }

  return {
    prescriptionId,
    students: students as Array<{ id: string }>,
    date,
    time,
  };
}

// Session context is now scoped per-connection (inside serve handler)
// to prevent race conditions between concurrent WebSocket connections

const buildInstructions = (context: SessionContext): string => {
  const studentsInfo = context.students
    .map(s => `  - ${s.name}${s.weight_kg ? ` (peso: ${s.weight_kg} kg)` : ' (peso não cadastrado)'}`)
    .join('\n');
  
  const exercisesInfo = context.prescriptionExercises
    .map(ex => `  ${ex.order_index + 1}. ${ex.exercise_name}: ${ex.sets} séries × ${ex.reps} reps`)
    .join('\n');
  
  return `Você é um assistente especializado em registrar sessões de treino EM GRUPO.

CONTEXTO DA SESSÃO:
📅 Data: ${context.date}
⏰ Hora: ${context.time}

👥 ALUNOS PRESENTES:
${studentsInfo}

💪 EXERCÍCIOS PRESCRITOS:
${exercisesInfo}

CORREÇÕES TERMINOLÓGICAS OBRIGATÓRIAS:
${Object.entries(TERMINOLOGY_CORRECTIONS).map(([k, v]) => `- "${k}" → "${v}"`).join('\n')}

INSTRUÇÕES:
1. Ouça o treinador descrever a sessão de treino
2. Faça perguntas de confirmação se necessário
3. Identifique o nome do aluno para cada exercício
4. Repetições são OBRIGATÓRIAS - pergunte se não foram mencionadas
5. Séries: NULL se não mencionado (usará prescrito)
6. Peso corporal: se aluno tem peso, use o valor; senão NULL
7. Converta libras para kg (1 lb = ${POUND_TO_KG_CONVERSION} kg)
8. Detecte adaptações: "X substituindo Y"

9. **REGRAS DE CARGA POR EQUIPAMENTO**:
${Object.entries(EQUIPMENT_LOAD_RULES).map(([k, v]) => `   - ${k}: ${v}`).join('\n')}

10. **OBSERVAÇÕES CLÍNICAS**:
    - Extraia DOR, DESCONFORTO, LIMITAÇÕES, DÉFICITS DE MOBILIDADE
    - Categorize: ${CLINICAL_CATEGORIES.map(c => `"${c}"`).join(', ')}
    - Severidade: ${Object.values(SEVERITY_LEVELS).map(s => `"${s}"`).join(', ')}
    - ALTA: Dor aguda, limitações severas
    - MÉDIA: Desconfortos, déficits de ativação
    - BAIXA: Comentários técnicos leves

11. **IMPORTANTE**: Quando o treinador terminar de descrever a sessão:
    - Confirme todos os dados
    - CHAME a função "extract_session_data" com todos os dados coletados
    - Os dados serão enviados para revisão antes de salvar`;
};

const buildTools = (context: SessionContext) => {
  return [
    {
      type: "function",
      name: "extract_session_data",
      description: "Extrai dados da sessão para revisão (NÃO salva ainda)",
      parameters: {
        type: "object",
        properties: {
          sessions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                student_name: {
                  type: "string",
                  description: `Nome do aluno: ${context.students.map(s => s.name).join(", ")}`
                },
                clinical_observations: {
                  type: "array",
                  description: "Observações clínicas importantes (dores, limitações, déficits)",
                  items: {
                    type: "object",
                    properties: {
                      observation_text: { 
                        type: "string",
                        description: "Descrição da observação clínica"
                      },
                      category: { 
                        type: "string",
                        enum: ["dor", "mobilidade", "força", "técnica", "geral"],
                        description: "Categoria da observação"
                      },
                      severity: {
                        type: "string",
                        enum: ["baixa", "média", "alta"],
                        description: "Severidade/importância da observação"
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
                      prescribed_exercise_name: { type: "string", nullable: true },
                      executed_exercise_name: { type: "string" },
                      sets: { type: "number", nullable: true },
                      reps: { type: "number" },
                      load_kg: { type: "number", nullable: true },
                      load_breakdown: { type: "string" },
                      observations: { type: "string", nullable: true },
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
  ];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // BUG-008: Authenticate via Authorization header only — never accept token from URL query
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Autenticação obrigatória' }), { 
      status: 401, 
      headers: jsonHeaders
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), { 
      status: 401, 
      headers: jsonHeaders
    });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;
  // Per-connection context — prevents race conditions between concurrent users
  let sessionContext: SessionContext | null = null;
  // V-02: Create client per connection to prevent shared state
  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  socket.onopen = async () => {
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'session.context') {
        const incomingContext = normalizeIncomingSessionContext(message.context);
        if (!incomingContext) {
          socket.send(JSON.stringify({ type: 'error', error: 'Contexto de sessão inválido' }));
          return;
        }
        
        const { data: prescription, error } = await supabaseClient
          .from('workout_prescriptions')
          .select('id, trainer_id, prescription_exercises (id, sets, reps, order_index, exercises_library (name))')
          .eq('id', incomingContext.prescriptionId)
          .single();
        
        if (error) {
          socket.send(JSON.stringify({ type: 'error', error: 'Erro ao buscar prescrição' }));
          return;
        }

        if (!prescription || prescription.trainer_id !== user.id) {
          socket.send(JSON.stringify({ type: 'error', error: 'Acesso não autorizado à prescrição' }));
          return;
        }

        const studentIds = incomingContext.students.map((student) => student.id);
        const { data: studentRecords, error: studentError } = await supabaseClient
          .from('students')
          .select('id, name, weight_kg, trainer_id')
          .in('id', studentIds);

        if (studentError || !studentRecords || studentRecords.length !== studentIds.length) {
          socket.send(JSON.stringify({ type: 'error', error: 'Erro ao validar alunos da sessão' }));
          return;
        }

        if (studentRecords.some((student) => student.trainer_id !== user.id)) {
          socket.send(JSON.stringify({ type: 'error', error: 'Acesso não autorizado a um ou mais alunos' }));
          return;
        }

        const studentsById = new Map(studentRecords.map((student) => [student.id, student]));
        const trustedStudents = studentIds.map((studentId) => {
          const student = studentsById.get(studentId);
          return {
            id: studentId,
            name: student?.name ?? 'Aluno',
            weight_kg: student?.weight_kg ?? undefined,
          };
        });
        
        sessionContext = {
          prescriptionId: incomingContext.prescriptionId,
          students: trustedStudents,
          prescriptionExercises: prescription.prescription_exercises.map((ex: Record<string, unknown>) => ({
            id: ex.id as string,
            exercise_name: (ex.exercises_library as Record<string, unknown>).name as string,
            sets: ex.sets as string,
            reps: ex.reps as string,
            order_index: ex.order_index as number
          })),
          date: incomingContext.date,
          time: incomingContext.time
        };

        // NOW initialize OpenAI with full configuration
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          socket.close(1008, 'API key not configured');
          return;
        }
        if (!sessionContext) {
          socket.send(JSON.stringify({ type: 'error', error: 'Contexto de sessão não inicializado' }));
          socket.close(1008, 'Session context missing');
          return;
        }

        const instructions = buildInstructions(sessionContext);
        const tools = buildTools(sessionContext);

        const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-realtime-preview-2024-12-17",
            voice: "alloy",
            modalities: ["text", "audio"],
            instructions,
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 2000
            },
            tools,
            tool_choice: "auto",
            temperature: 0.8
          }),
        });

        if (!tokenResponse.ok) {
          socket.close(1008, 'Failed to create session');
          return;
        }

        const tokenData = await tokenResponse.json();
        const ephemeralKey = tokenData.client_secret?.value;

        if (!ephemeralKey) {
          socket.close(1008, 'No ephemeral key');
          return;
        }

        const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
        openAISocket = new WebSocket(url, [
          "realtime",
          `openai-insecure-api-key.${ephemeralKey}`,
          "openai-beta.realtime-v1"
        ]);

        openAISocket.onopen = () => {
          socket.send(JSON.stringify({ type: 'session.context_received' }));
        };

        openAISocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          // Se for uma chamada de função completa, enviar os dados extraídos
          if (data.type === 'response.function_call_arguments.done') {
            try {
              const functionArgs = JSON.parse(data.arguments);
              
              // Enviar os dados estruturados para o frontend
              socket.send(JSON.stringify({
                type: 'session.data_extracted',
                data: functionArgs.sessions
              }));
              
              // Enviar output da função para o OpenAI continuar
              socket.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: data.call_id,
                  output: JSON.stringify({ success: true, message: 'Dados recebidos para revisão' })
                }
              }));
            } catch (_e) {
              // Error processing function call - silently handled
            }
          }
          
          socket.send(event.data);
        };

        openAISocket.onerror = (_error) => {
          socket.send(JSON.stringify({ type: "error", error: "OpenAI connection failed" }));
        };

        openAISocket.onclose = () => {
          socket.close();
        };
        
        return;
      }
      
      if (openAISocket?.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      }
    } catch (_error) {
      // Message handling error - connection will be cleaned up on close
    }
  };

  socket.onclose = () => {
    openAISocket?.close();
    sessionContext = null;
  };

  return response;
});
