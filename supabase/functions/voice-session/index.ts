import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

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

let sessionContext: SessionContext | null = null;

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

INSTRUÇÕES:
1. Extraia dados de MÚLTIPLOS alunos do áudio
2. O treinador falará de forma NATURAL/MISTA
3. Identifique sempre o nome do aluno para cada exercício
4. Repetições são OBRIGATÓRIAS - pergunte se não foram mencionadas
5. Séries: NULL se não mencionado (usará prescrito)
6. Peso corporal: se aluno tem peso, use o valor; senão NULL
7. Converta libras para kg (1 lb = 0.453592 kg)
8. Detecte adaptações: "X substituindo Y"
9. Confirme TODOS os dados antes de chamar a function tool

10. **OBSERVAÇÕES CLÍNICAS IMPORTANTES**: 
    - Se o treinador mencionar DOR, DESCONFORTO, LIMITAÇÃO DE MOVIMENTO, 
      DÉFICIT DE MOBILIDADE, ASSIMETRIAS, HIPERATIVAÇÃO MUSCULAR, ou qualquer questão 
      relacionada à saúde/biomecânica do aluno
    - Extraia essas observações separadamente no campo "clinical_observations"
    - Categorize como: "dor", "mobilidade", "força", "técnica" ou "geral"
    - Classifique severidade: "baixa", "média" ou "alta"
    
    Exemplos:
    - "sentiu dor no joelho esquerdo" → categoria: "dor", severidade: "média"
    - "déficit de mobilidade no quadril" → categoria: "mobilidade", severidade: "média"
    - "hiperativação dos flexores do quadril" → categoria: "técnica", severidade: "média"
    - "dificuldade para agachar até embaixo" → categoria: "mobilidade", severidade: "baixa"`;
};

const buildTools = (context: SessionContext) => {
  return [
    {
      type: "function",
      name: "record_group_session",
      description: "Registra sessão de treino em grupo após confirmação",
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

  // Validate authentication - check for token in Authorization header or query parameter
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || tokenFromQuery;

  if (!token) {
    return new Response('Autenticação obrigatória', { 
      status: 401, 
      headers: corsHeaders 
    });
  }

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    console.error('Authentication error:', authError);
    return new Response('Token inválido', { 
      status: 401, 
      headers: corsHeaders 
    });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;

  socket.onopen = async () => {
    console.log("Client connected");
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      socket.close(1008, 'API key not configured');
      return;
    }

    try {
      const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          instructions: "Aguardando contexto da sessão...",
          tools: []
        }),
      });

      if (!tokenResponse.ok) {
        socket.close(1008, 'Failed to authenticate');
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
        console.log("Connected to OpenAI");
      };

      openAISocket.onmessage = (event) => {
        socket.send(event.data);
      };

      openAISocket.onerror = (error) => {
        console.error("OpenAI error:", error);
        socket.send(JSON.stringify({ type: "error", error: "OpenAI connection failed" }));
      };

      openAISocket.onclose = () => {
        socket.close();
      };

    } catch (error) {
      console.error("Error:", error);
      socket.close(1011, 'Internal error');
    }
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'session.context') {
        console.log("Received context:", message.context);
        
        const { data: prescription, error } = await supabaseClient
          .from('workout_prescriptions')
          .select(`*, prescription_exercises (id, sets, reps, order_index, exercises_library (name))`)
          .eq('id', message.context.prescriptionId)
          .single();
        
        if (error) {
          socket.send(JSON.stringify({ type: 'error', error: 'Erro ao buscar prescrição' }));
          return;
        }
        
        sessionContext = {
          prescriptionId: message.context.prescriptionId,
          students: message.context.students,
          prescriptionExercises: prescription.prescription_exercises.map((ex: any) => ({
            id: ex.id,
            exercise_name: ex.exercises_library.name,
            sets: ex.sets,
            reps: ex.reps,
            order_index: ex.order_index
          })),
          date: message.context.date,
          time: message.context.time
        };
        
        if (openAISocket?.readyState === WebSocket.OPEN) {
          openAISocket.send(JSON.stringify({
            type: 'session.update',
            session: {
              instructions: buildInstructions(sessionContext),
              tools: buildTools(sessionContext)
            }
          }));
        }
        
        socket.send(JSON.stringify({ type: 'session.context_received' }));
        return;
      }
      
      if (openAISocket?.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  socket.onclose = () => {
    console.log("Client disconnected");
    openAISocket?.close();
    sessionContext = null;
  };

  return response;
});
