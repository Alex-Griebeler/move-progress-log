import { useState, useRef } from "react";
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
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (isRecording || isProcessing) {
      console.log("⚠️ Already recording or processing");
      return;
    }

    try {
      console.log("🎤 Starting audio recording...");
      setTranscript("");
      
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

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Gravação iniciada",
        description: "Fale sobre a sessão de treino. Clique em 'Parar' quando terminar.",
      });
      
    } catch (error) {
      console.error("❌ Error starting recording:", error);
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
          {!isRecording && !isProcessing ? (
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
