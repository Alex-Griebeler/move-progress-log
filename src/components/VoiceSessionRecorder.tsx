import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
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
  onRecordingStarted?: () => void;
}

export function VoiceSessionRecorder({ 
  prescriptionId,
  selectedStudents,
  date,
  time,
  onSessionData,
  onError,
  autoStart = false,
  onRecordingStarted
}: VoiceSessionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasAutoStartedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const componentMountedRef = useRef(false);

  // Track component lifecycle
  useEffect(() => {
    console.log('🔵 VoiceSessionRecorder: Componente MONTADO');
    console.log('   autoStart prop:', autoStart);
    componentMountedRef.current = true;
    
    return () => {
      console.log('🔴 VoiceSessionRecorder: Componente DESMONTADO');
      componentMountedRef.current = false;
      
      // Cleanup: parar gravação e liberar recursos
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [autoStart]);

  const startRecording = useCallback(async () => {
    console.log('📍 startRecording: Função chamada');
    console.log('   Estado atual: isRecording:', isRecording, '| isProcessing:', isProcessing, '| isStarting:', isStarting);
    console.log('   componentMountedRef.current (no início):', componentMountedRef.current);
    
    if (!componentMountedRef.current) {
      console.warn('⚠️ Componente foi desmontado antes de iniciar gravação');
      return;
    }
    
    if (isRecording || isProcessing || isStarting) {
      console.log('⚠️ Blocked: Already recording, processing, or starting');
      return;
    }

    setIsStarting(true);
    console.log('✅ Starting state set to true');
    
    let permissionToastId: string | number | undefined;

    try {
      console.log('🎤 Tentando obter stream de mídia...');
      setTranscript("");
      
      permissionToastId = sonnerToast.loading("Solicitando acesso ao microfone...", {
        description: "Aguarde enquanto verificamos as permissões"
      });
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      console.log('   Stream de mídia obtido. Verificando componentMountedRef novamente...');
      if (!componentMountedRef.current) {
        console.warn('   ⚠️ Componente desmontado APÓS obter stream');
        stream.getTracks().forEach(track => track.stop());
        if (permissionToastId) sonnerToast.dismiss(permissionToastId);
        return;
      }
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("🔄 Processing audio...");
        setIsProcessing(true);
        setIsRecording(false);
        
        let processingToastId: string | number | undefined;
        
        try {
          // Etapa 1: Preparando áudio
          processingToastId = sonnerToast.loading("Processando gravação...", {
            description: "Etapa 1/3: Preparando arquivo de áudio"
          });
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          await new Promise((resolve, reject) => {
            reader.onloadend = resolve;
            reader.onerror = reject;
          });
          
          const base64Audio = (reader.result as string).split(',')[1];
          
          // Etapa 2: Transcrevendo
          sonnerToast.loading("Transcrevendo áudio...", {
            id: processingToastId,
            description: "Etapa 2/3: Convertendo fala em texto com IA"
          });
          
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

          // Etapa 3: Processando dados
          sonnerToast.loading("Analisando dados...", {
            id: processingToastId,
            description: "Etapa 3/3: Extraindo informações da sessão"
          });

          console.log("✅ Processing completed:", data);
          
          if (data.success) {
            setTranscript(data.transcription);
            onSessionData(data.data);
            
            sonnerToast.dismiss(processingToastId);
            toast({
              title: "Gravação processada com sucesso! ✅",
              description: "Revise os dados extraídos e confirme para salvar a sessão.",
            });
          } else {
            throw new Error(data.error || 'Erro ao processar gravação');
          }
        } catch (error) {
          console.error("❌ Error processing:", error);
          
          if (processingToastId) sonnerToast.dismiss(processingToastId);
          
          const errorMsg = error instanceof Error ? error.message : "Erro ao processar gravação";
          sonnerToast.error("Erro no processamento", {
            description: errorMsg,
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
      
      console.log('   MediaRecorder pronto. Chamando mediaRecorder.start()...');
      mediaRecorder.start();
      console.log('   MediaRecorder INICIADO. Atualizando estados...');
      
      setIsStarting(false);
      setIsRecording(true);
      console.log('   Estados atualizados: isStarting: false, isRecording: true');
      
      if (permissionToastId) sonnerToast.dismiss(permissionToastId);
      
      onRecordingStarted?.();
      console.log('   Callback onRecordingStarted executado (se fornecido)');
      
      sonnerToast.success("Gravação iniciada! 🎙️", {
        description: "Fale sobre a sessão de treino. Clique em 'Parar' quando terminar.",
      });
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      if (permissionToastId) sonnerToast.dismiss(permissionToastId);
      
      setIsStarting(false);
      setIsRecording(false);
      console.log('❌ Error occurred, state reset');
      
      const errorMsg = error instanceof Error ? error.message : "Não foi possível iniciar a gravação";
      sonnerToast.error("Erro ao acessar microfone", {
        description: errorMsg + ". Verifique as permissões do navegador.",
      });
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [isRecording, isProcessing, isStarting, prescriptionId, selectedStudents, date, time, onSessionData, onError, onRecordingStarted, toast]);

  // Auto-start com requestAnimationFrame para sincronizar com paint do navegador
  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) {
      return;
    }
    
    hasAutoStartedRef.current = true;
    console.log('🟢 useEffect autoStart: Detectado autoStart=true. Agendando início...');

    const requestFrameId = requestAnimationFrame(() => {
      console.log('  🟢 requestAnimationFrame: Executando no próximo frame. Agendando setTimeout...');
      const timeoutId = setTimeout(() => {
        if (componentMountedRef.current) {
          console.log('  🟢 setTimeout (300ms): Disparado. Chamando startRecording()');
          startRecording();
        } else {
          console.log('  ⚠️ setTimeout (300ms): Componente desmontado antes do disparo');
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    });

    return () => {
      cancelAnimationFrame(requestFrameId);
    };
  }, [autoStart, startRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log("🛑 Stopping recording...");
      mediaRecorderRef.current.stop();
    }
  }, []);

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
