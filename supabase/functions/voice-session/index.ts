import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  console.log("Starting WebSocket connection to OpenAI Realtime API");

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;

  socket.onopen = async () => {
    console.log("Client WebSocket opened");
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found');
      socket.close(1008, 'API key not configured');
      return;
    }

    try {
      // Get ephemeral token from OpenAI
      console.log("Requesting ephemeral token from OpenAI");
      const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          instructions: `Você é um assistente especializado em registrar sessões de treino. 
          
Quando o usuário falar sobre uma sessão de treino, extraia as seguintes informações:
- Nome do aluno
- Data do treino (formato: YYYY-MM-DD)
- Hora do treino (formato: HH:MM)
- Lista de exercícios com:
  - Nome do exercício
  - Repetições realizadas
  - Carga total em kg (converta libras para kg se necessário: 1 lb = 0.453592 kg)
  - Composição detalhada da carga (ex: "35 lbs de cada lado + barra de 15 kg")
  - Observações se houver

IMPORTANTE: 
- Sempre confirme os dados extraídos com o usuário antes de finalizar
- Se faltar alguma informação, pergunte ao usuário
- Converta todas as cargas para kg
- Use formato de data YYYY-MM-DD e hora HH:MM
- Seja preciso com os números`,
          tools: [
            {
              type: "function",
              name: "create_workout_session",
              description: "Cria uma nova sessão de treino com os dados extraídos da fala do usuário",
              parameters: {
                type: "object",
                properties: {
                  student_name: {
                    type: "string",
                    description: "Nome do aluno"
                  },
                  date: {
                    type: "string",
                    description: "Data do treino no formato YYYY-MM-DD"
                  },
                  time: {
                    type: "string",
                    description: "Hora do treino no formato HH:MM"
                  },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        reps: { type: "number" },
                        load_kg: { type: "number" },
                        load_breakdown: { type: "string" },
                        observations: { type: "string" }
                      },
                      required: ["name", "reps", "load_kg"]
                    }
                  }
                },
                required: ["student_name", "date", "time", "exercises"]
              }
            }
          ]
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Failed to get ephemeral token:", errorText);
        socket.close(1008, 'Failed to authenticate with OpenAI');
        return;
      }

      const tokenData = await tokenResponse.json();
      const ephemeralKey = tokenData.client_secret?.value;

      if (!ephemeralKey) {
        console.error("No ephemeral key in response");
        socket.close(1008, 'No ephemeral key received');
        return;
      }

      console.log("Ephemeral token received, connecting to Realtime API");

      // Connect to OpenAI Realtime API with ephemeral token
      const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
      openAISocket = new WebSocket(url, [
        "realtime",
        `openai-insecure-api-key.${ephemeralKey}`,
        "openai-beta.realtime-v1"
      ]);

      openAISocket.onopen = () => {
        console.log("Connected to OpenAI Realtime API");
      };

      openAISocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("OpenAI message type:", message.type);

          // Forward all messages to client
          socket.send(event.data);
        } catch (error) {
          console.error("Error processing OpenAI message:", error);
        }
      };

      openAISocket.onerror = (error) => {
        console.error("OpenAI WebSocket error:", error);
        socket.send(JSON.stringify({
          type: "error",
          error: "Connection to OpenAI failed"
        }));
      };

      openAISocket.onclose = () => {
        console.log("OpenAI WebSocket closed");
        socket.close();
      };

    } catch (error) {
      console.error("Error connecting to OpenAI:", error);
      socket.close(1011, 'Internal server error');
    }
  };

  socket.onmessage = (event) => {
    try {
      // Forward client messages to OpenAI
      if (openAISocket?.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      }
    } catch (error) {
      console.error("Error forwarding message to OpenAI:", error);
    }
  };

  socket.onclose = () => {
    console.log("Client WebSocket closed");
    openAISocket?.close();
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
    openAISocket?.close();
  };

  return response;
});