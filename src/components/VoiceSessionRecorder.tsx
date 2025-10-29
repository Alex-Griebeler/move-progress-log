import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder, encodeAudioForAPI, playAudioData } from "@/utils/VoiceRecorder";

interface VoiceSessionRecorderProps {
  prescriptionId?: string;
  selectedStudents?: Array<{
    id: string;
    name: string;
    weight_kg?: number;
  }>;
  date?: string;
  time?: string;
  onSessionData: (data: any) => void;
  onError?: (error: string) => void;
}

export function VoiceSessionRecorder({ 
  prescriptionId,
  selectedStudents,
  date,
  time,
  onSessionData,
  onError
}: VoiceSessionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const { toast } = useToast();
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const projectId = "zrgfrdmywxlemcuiqtqg";

  useEffect(() => {
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    
    return () => {
      stopRecording();
      audioContextRef.current?.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      setTranscript("");
      setAiResponse("");

      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to WebSocket
      const wsUrl = `wss://${projectId}.supabase.co/functions/v1/voice-session`;
      console.log("Connecting to:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("WebSocket connected");
        
        // Se for sessão em grupo, enviar contexto primeiro
        if (prescriptionId && selectedStudents && date && time) {
          console.log("Sending session context");
          ws.send(JSON.stringify({
            type: 'session.context',
            context: {
              prescriptionId,
              students: selectedStudents,
              date,
              time
            }
          }));
        }
        
        setIsConnecting(false);
        setIsRecording(true);

        // Start audio recording
        recorderRef.current = new AudioRecorder((audioData) => {
          if (ws.readyState === WebSocket.OPEN) {
            const encoded = encodeAudioForAPI(audioData);
            ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encoded
            }));
          }
        });

        await recorderRef.current.start();
        
        toast({
          title: "Gravação iniciada",
          description: "Fale sobre a sessão de treino",
        });
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Message type:", message.type);

          switch (message.type) {
            case 'session.context_received':
              console.log("Server confirmed context receipt");
              setTranscript(prev => prev + "\n✅ Contexto da sessão enviado\n");
              break;

            case 'response.audio.delta':
              if (message.delta) {
                const binaryString = atob(message.delta);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                if (audioContextRef.current) {
                  await playAudioData(audioContextRef.current, bytes);
                }
              }
              break;

            case 'conversation.item.input_audio_transcription.completed':
              setTranscript(prev => prev + " " + message.transcript);
              break;

            case 'response.text.delta':
              setAiResponse(prev => prev + message.delta);
              break;

            case 'response.function_call_arguments.done':
              console.log("Function call completed:", message.arguments);
              try {
                const sessionData = JSON.parse(message.arguments);
                onSessionData(sessionData);
                
                toast({
                  title: "Dados extraídos",
                  description: "Sessão pronta para ser registrada",
                });
              } catch (e) {
                console.error("Error parsing session data:", e);
                if (onError) {
                  onError("Erro ao processar dados da sessão");
                }
              }
              break;

            case 'error':
              console.error("OpenAI error:", message.error);
              const errorMsg = message.error?.message || "Erro na comunicação";
              toast({
                title: "Erro",
                description: errorMsg,
                variant: "destructive",
              });
              if (onError) {
                onError(errorMsg);
              }
              break;
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        const errorMsg = "Não foi possível conectar ao servidor";
        toast({
          title: "Erro de conexão",
          description: errorMsg,
          variant: "destructive",
        });
        if (onError) {
          onError(errorMsg);
        }
        setIsConnecting(false);
        setIsRecording(false);
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setIsRecording(false);
        setIsConnecting(false);
      };

    } catch (error) {
      console.error("Error starting recording:", error);
      const errorMsg = "Não foi possível iniciar a gravação";
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      });
      if (onError) {
        onError(errorMsg);
      }
      setIsConnecting(false);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    
    setIsRecording(false);
    
    toast({
      title: "Gravação finalizada",
      description: "Processando dados...",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Registro por Voz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          {!isRecording && !isConnecting ? (
            <Button onClick={startRecording} size="lg" className="gap-2">
              <Mic className="h-5 w-5" />
              Iniciar Gravação
            </Button>
          ) : isConnecting ? (
            <Button disabled size="lg" className="gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Conectando...
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
              <MicOff className="h-5 w-5" />
              Parar Gravação
            </Button>
          )}
        </div>

        {isRecording && (
          <div className="text-center text-sm text-muted-foreground animate-pulse">
            🎤 Gravando... Fale sobre a sessão de treino
          </div>
        )}

        {transcript && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Transcrição:</h4>
            <p className="text-sm bg-muted p-3 rounded-md">{transcript}</p>
          </div>
        )}

        {aiResponse && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Assistente:</h4>
            <p className="text-sm bg-primary/10 p-3 rounded-md">{aiResponse}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
