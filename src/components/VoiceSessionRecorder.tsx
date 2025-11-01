import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  autoStart?: boolean;
}

export function VoiceSessionRecorder({ 
  prescriptionId,
  selectedStudents,
  date,
  time,
  onSessionData,
  onError,
  autoStart = false
}: VoiceSessionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasAutoStartedRef = useRef(false);

  // Auto-start quando autoStart=true (apenas uma vez)
  useEffect(() => {
    if (autoStart && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      console.log("🚀 Auto-starting recording...");
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        startRecording();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  const startRecording = async () => {
    console.log("🔍 startRecording called, checking state...");
    console.log("  isRecording:", isRecording);
    console.log("  isProcessing:", isProcessing);
    console.log("  isStarting:", isStarting);
    
    if (isRecording || isProcessing || isStarting) {
      console.log("⚠️ Blocked: Already recording, processing, or starting");
      return;
    }

    // Set starting state immediately
    setIsStarting(true);
    console.log("✅ Starting state set to true");

    try {
      console.log("🎤 Starting audio recording...");
      setTranscript("");
      
      toast({
        title: "Solicitando permissões",
        description: "Aguardando acesso ao microfone...",
      });
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("🔄 Processing audio...");
        setIsProcessing(true);
        setIsRecording(false);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Converter para base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          await new Promise((resolve, reject) => {
            reader.onloadend = resolve;
            reader.onerror = reject;
          });
          
          const base64Audio = (reader.result as string).split(',')[1];
          
          // Enviar para processamento
          const { data, error } = await supabase.functions.invoke('process-voice-session', {
            body: {
              audio: base64Audio,
              prescriptionId,
              students: selectedStudents,
              date,
              time
            }
          });

          if (error) {
            throw error;
          }

          console.log("✅ Processing completed:", data);
          
          if (data.success) {
            setTranscript(data.transcription);
            onSessionData(data.data);
            
            toast({
              title: "Gravação processada",
              description: "Revise os dados e confirme para salvar",
            });
          } else {
            throw new Error(data.error || 'Erro ao processar gravação');
          }
        } catch (error) {
          console.error("❌ Error processing:", error);
          const errorMsg = error instanceof Error ? error.message : "Erro ao processar gravação";
          toast({
            title: "Erro",
            description: errorMsg,
            variant: "destructive",
          });
          if (onError) {
            onError(errorMsg);
          }
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      // CRITICAL: Start MediaRecorder FIRST, then update state
      mediaRecorder.start();
      console.log("✅ MediaRecorder started");
      
      // NOW update state after MediaRecorder is actually recording
      setIsRecording(true);
      setIsStarting(false);
      console.log("✅ Recording state updated");
      
      toast({
        title: "Gravação iniciada",
        description: "Fale sobre a sessão de treino. Clique em 'Parar' quando terminar.",
      });
      
    } catch (error) {
      console.error("❌ Error starting recording:", error);
      
      // Reset state on error
      setIsStarting(false);
      setIsRecording(false);
      console.log("❌ Error occurred, state reset");
      
      const errorMsg = error instanceof Error ? error.message : "Não foi possível iniciar a gravação";
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      });
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
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
          {isStarting ? (
            <Button disabled size="lg" className="gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Iniciando gravação...
            </Button>
          ) : !isRecording && !isProcessing ? (
            <Button onClick={startRecording} size="lg" className="gap-2">
              <Mic className="h-5 w-5" />
              Iniciar Gravação
            </Button>
          ) : isProcessing ? (
            <Button disabled size="lg" className="gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processando gravação...
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
            <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{transcript}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
