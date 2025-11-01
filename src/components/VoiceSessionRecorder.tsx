import { useState, useRef, useEffect, useCallback } from "react";
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
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();
  
  const audioChunksRef = useRef<Blob[]>([]);
  const hasAutoStartedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Attach handlers to MediaRecorder
  const attachRecorderHandlers = useCallback((mr: MediaRecorder) => {
    audioChunksRef.current = [];

    const handleDataAvailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    const handleStart = () => {
      console.log("✅ MediaRecorder 'start' event fired");
      setIsRecording(true);
      setIsStarting(false);
      toast({
        title: "Gravação iniciada",
        description: "Fale sobre a sessão de treino. Clique em 'Parar' quando terminar.",
      });
    };

    const handleStop = async () => {
      console.log("🔄 MediaRecorder 'stop' event fired, processing audio...");
      setIsProcessing(true);
      setIsRecording(false);
      
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        await new Promise((resolve, reject) => {
          reader.onloadend = resolve;
          reader.onerror = reject;
        });
        
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('process-voice-session', {
          body: {
            audio: base64Audio,
            prescriptionId,
            students: selectedStudents,
            date,
            time
          }
        });

        if (error) throw error;

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
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    };

    mr.addEventListener('dataavailable', handleDataAvailable);
    mr.addEventListener('start', handleStart);
    mr.addEventListener('stop', handleStop);

    return () => {
      mr.removeEventListener('dataavailable', handleDataAvailable);
      mr.removeEventListener('start', handleStart);
      mr.removeEventListener('stop', handleStop);
    };
  }, [prescriptionId, selectedStudents, date, time, onSessionData, onError, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [recorder]);

  const startRecording = useCallback(async () => {
    console.log("🔍 startRecording called, checking state...");
    console.log("  isRecording:", isRecording);
    console.log("  isProcessing:", isProcessing);
    console.log("  isStarting:", isStarting);
    
    if (isRecording || isProcessing || isStarting) {
      console.log("⚠️ Blocked: Already recording, processing, or starting");
      return;
    }

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
      
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      const detach = attachRecorderHandlers(mr);
      setRecorder(mr);
      
      console.log("✅ MediaRecorder created, starting...");
      mr.start();
      
    } catch (error) {
      console.error("❌ Error starting recording:", error);
      
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
  }, [isRecording, isProcessing, isStarting, attachRecorderHandlers, toast, onError]);

  // Auto-start com requestAnimationFrame duplo para garantir paint estável
  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    console.log("🚀 Auto-starting recording...");
    let raf1 = 0, raf2 = 0;
    
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        startRecording();
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [autoStart, startRecording]);

  const stopRecording = useCallback(() => {
    if (recorder && recorder.state !== 'inactive') {
      console.log("🛑 Stopping recording...");
      recorder.stop();
    }
  }, [recorder]);

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
