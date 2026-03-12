import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

interface VoiceSessionRecorderProps {
  prescriptionId?: string;
  selectedStudents?: Array<{
    id: string;
    name: string;
    weight_kg?: number;
  }>;
  date?: string;
  time?: string;
  onSessionData: (data: unknown) => void;
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
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [accumulatedSegments, setAccumulatedSegments] = useState<unknown[]>([]);
  const [currentSegment, setCurrentSegment] = useState(1);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const allSegmentsRef = useRef<Blob[][]>([]);
  const hasAutoStartedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const componentMountedRef = useRef(false);

  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [autoStart]);

  /**
   * Handler compartilhado para o evento onstop do MediaRecorder.
   * Extrai, transcreve e consolida todos os segmentos de áudio.
   */
  const handleRecorderStop = useCallback(async () => {
    logger.debug("VoiceRecorder", "Processing audio segment...");

    if (isPaused) {
      logger.debug("VoiceRecorder", "Paused - storing current segment");
      allSegmentsRef.current.push([...audioChunksRef.current]);
      audioChunksRef.current = [];
      return;
    }

    setIsProcessing(true);
    setIsRecording(false);

    let processingToastId: string | number | undefined;

    try {
      allSegmentsRef.current.push([...audioChunksRef.current]);

      processingToastId = sonnerToast.loading("Processando gravações...", {
        description: `Etapa 1/3: Consolidando ${allSegmentsRef.current.length} segmento(s) de áudio`
      });

      const segmentsData = [];

      for (let i = 0; i < allSegmentsRef.current.length; i++) {
        const segmentChunks = allSegmentsRef.current[i];
        const audioBlob = new Blob(segmentChunks, { type: 'audio/webm' });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);

        await new Promise((resolve, reject) => {
          reader.onloadend = resolve;
          reader.onerror = reject;
        });

        const base64Audio = (reader.result as string).split(',')[1];

        sonnerToast.loading(`Transcrevendo segmento ${i + 1}/${allSegmentsRef.current.length}...`, {
          id: processingToastId,
          description: "Etapa 2/3: Convertendo fala em texto com IA"
        });

        const { data, error } = await supabase.functions.invoke('process-voice-session', {
          body: {
            audio: base64Audio,
            prescriptionId,
            students: selectedStudents,
            date,
            time,
            segmentNumber: i + 1,
            totalSegments: allSegmentsRef.current.length
          }
        });

        if (error) throw error;

        if (data.success) {
          segmentsData.push(data);
        } else {
          throw new Error(data.error || `Erro ao processar segmento ${i + 1}`);
        }
      }

      sonnerToast.loading("Consolidando informações...", {
        id: processingToastId,
        description: "Etapa 3/3: Mesclando dados de todos os segmentos"
      });

      const fullTranscript = segmentsData
        .map((seg, idx) => `[Segmento ${idx + 1}]\n${seg.transcription}`)
        .join('\n\n');

      const consolidatedData = {
        sessions: segmentsData.flatMap(seg => seg.data?.sessions || [])
      };

      logger.debug("VoiceRecorder", "Segments consolidated", {
        totalSegments: segmentsData.length,
        totalSessions: consolidatedData.sessions.length,
      });

      setTranscript(fullTranscript);
      setAccumulatedSegments(segmentsData);
      onSessionData(consolidatedData);

      sonnerToast.dismiss(processingToastId);
      toast({
        title: `${allSegmentsRef.current.length} segmento(s) processado(s) com sucesso! ✅`,
        description: "Revise os dados consolidados e confirme para salvar a sessão.",
      });

      allSegmentsRef.current = [];
    } catch (error) {
      logger.error("VoiceRecorder", "Error processing", error);

      if (processingToastId) sonnerToast.dismiss(processingToastId);

      const errorMsg = error instanceof Error ? error.message : "Erro ao processar gravação";
      sonnerToast.error("Erro no processamento", { description: errorMsg });

      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsProcessing(false);
      setCurrentSegment(1);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isPaused, prescriptionId, selectedStudents, date, time, onSessionData, onError, toast]);

  /**
   * Configura um novo MediaRecorder no stream fornecido,
   * vinculando os handlers compartilhados.
   */
  const setupMediaRecorder = useCallback((stream: MediaStream): MediaRecorder => {
    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = handleRecorderStop;

    return mediaRecorder;
  }, [handleRecorderStop]);

  const startRecording = useCallback(async () => {
    if (!componentMountedRef.current) return;
    if (isRecording || isProcessing || isStarting) return;

    setIsStarting(true);

    let permissionToastId: string | number | undefined;

    try {
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

      if (!componentMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        if (permissionToastId) sonnerToast.dismiss(permissionToastId);
        return;
      }

      streamRef.current = stream;

      const mediaRecorder = setupMediaRecorder(stream);
      mediaRecorder.start();

      setIsStarting(false);
      setIsRecording(true);

      if (permissionToastId) sonnerToast.dismiss(permissionToastId);

      onRecordingStarted?.();

      sonnerToast.success("Gravação iniciada! 🎙️", {
        description: "Fale sobre a sessão de treino. Clique em 'Parar' quando terminar.",
      });

    } catch (error) {
      logger.error("VoiceRecorder", "Error starting recording", error);

      if (permissionToastId) sonnerToast.dismiss(permissionToastId);

      setIsStarting(false);
      setIsRecording(false);

      const errorMsg = error instanceof Error ? error.message : "Não foi possível iniciar a gravação";
      sonnerToast.error("Erro ao acessar microfone", {
        description: errorMsg + ". Verifique as permissões do navegador.",
      });

      if (onError) {
        onError(errorMsg);
      }
    }
  }, [isRecording, isProcessing, isStarting, setupMediaRecorder, onRecordingStarted, onError]);

  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    const requestFrameId = requestAnimationFrame(() => {
      const timeoutId = setTimeout(() => {
        if (componentMountedRef.current) {
          startRecording();
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    });

    return () => cancelAnimationFrame(requestFrameId);
  }, [autoStart, startRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setIsPaused(true);
      mediaRecorderRef.current.stop();
      sonnerToast.info("Gravação pausada", {
        description: "Clique em 'Retomar' para continuar gravando",
      });
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!isPaused) return;
    
    setIsPaused(false);
    setCurrentSegment(prev => prev + 1);

    try {
      const stream = streamRef.current;
      if (!stream) throw new Error("Stream não disponível");

      const mediaRecorder = setupMediaRecorder(stream);
      mediaRecorder.start();
      setIsRecording(true);

      sonnerToast.success(`Gravação retomada - Segmento ${currentSegment}`, {
        description: "Continue falando sobre a sessão de treino",
      });
    } catch (error) {
      logger.error("VoiceRecorder", "Error resuming recording", error);

      const errorMsg = error instanceof Error ? error.message : "Erro ao retomar gravação";
      sonnerToast.error("Erro ao retomar", { description: errorMsg });

      if (onError) {
        onError(errorMsg);
      }
    }
  }, [isPaused, currentSegment, setupMediaRecorder, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsPaused(false);
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
        <div className="flex flex-col gap-3">
          <div className="flex justify-center gap-2">
            {isStarting ? (
              <Button disabled size="lg" className="gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Iniciando gravação...
              </Button>
            ) : !isRecording && !isProcessing && !isPaused ? (
              <Button onClick={startRecording} size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Iniciar Gravação
              </Button>
            ) : isProcessing ? (
              <Button disabled size="lg" className="gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando gravação...
              </Button>
            ) : isPaused ? (
              <>
                <Button onClick={resumeRecording} size="lg" className="gap-2">
                  <Play className="h-5 w-5" />
                  Retomar Gravação
                </Button>
                <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                  <MicOff className="h-5 w-5" />
                  Finalizar
                </Button>
              </>
            ) : (
              <>
                <Button onClick={pauseRecording} variant="secondary" size="lg" className="gap-2">
                  <Pause className="h-5 w-5" />
                  Pausar
                </Button>
                <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                  <MicOff className="h-5 w-5" />
                  Finalizar
                </Button>
              </>
            )}
          </div>

          {(isRecording || isPaused) && (
            <div className="text-center space-y-1">
              {isRecording && (
                <div className="text-sm text-muted-foreground animate-pulse">
                  🎤 Gravando segmento {currentSegment}... Fale sobre a sessão de treino
                </div>
              )}
              {isPaused && (
                <div className="text-sm text-warning">
                  ⏸️ Gravação pausada - Segmento {currentSegment - 1} finalizado
                </div>
              )}
              {allSegmentsRef.current.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {allSegmentsRef.current.length} segmento(s) gravado(s)
                </div>
              )}
            </div>
          )}
        </div>

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
