import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Pause, Play } from "lucide-react";
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
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [accumulatedSegments, setAccumulatedSegments] = useState<any[]>([]);
  const [currentSegment, setCurrentSegment] = useState(1);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const allSegmentsRef = useRef<Blob[][]>([]);
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
        console.log("🔄 Processing audio segment...");
        
        // Se foi pausado, armazenar o segmento atual
        if (isPaused) {
          console.log("⏸️ Paused - storing current segment");
          allSegmentsRef.current.push([...audioChunksRef.current]);
          audioChunksRef.current = [];
          return;
        }
        
        // Se foi finalizado, processar todos os segmentos
        setIsProcessing(true);
        setIsRecording(false);
        
        let processingToastId: string | number | undefined;
        
        try {
          // Adicionar segmento final
          allSegmentsRef.current.push([...audioChunksRef.current]);
          
          // Etapa 1: Preparando áudios
          processingToastId = sonnerToast.loading("Processando gravações...", {
            description: `Etapa 1/3: Consolidando ${allSegmentsRef.current.length} segmento(s) de áudio`
          });
          
          const segmentsData = [];
          
          // Processar cada segmento separadamente
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
            
            // Etapa 2: Transcrevendo cada segmento
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

          // Etapa 3: Consolidando dados
          sonnerToast.loading("Consolidando informações...", {
            id: processingToastId,
            description: "Etapa 3/3: Mesclando dados de todos os segmentos"
          });

          // Consolidar transcrições
          const fullTranscript = segmentsData
            .map((seg, idx) => `[Segmento ${idx + 1}]\n${seg.transcription}`)
            .join('\n\n');
          
          // 🔍 LOGS DETALHADOS DE CONSOLIDAÇÃO
          console.log('🔍 ========== INÍCIO DA CONSOLIDAÇÃO ==========');
          console.log(`🔍 Total de segmentos processados: ${segmentsData.length}`);
          
          segmentsData.forEach((seg, idx) => {
            console.log(`🔍 Segmento ${idx + 1}:`);
            console.log(`   - Transcrição: ${seg.transcription.substring(0, 100)}...`);
            console.log(`   - Sessões encontradas: ${seg.data?.sessions?.length || 0}`);
            if (seg.data?.sessions) {
              seg.data.sessions.forEach((session, sIdx) => {
                console.log(`     Sessão ${sIdx + 1}: ${session.student_name}`);
                console.log(`       - Observações: ${session.clinical_observations?.length || 0}`);
                console.log(`       - Exercícios: ${session.exercises?.length || 0}`);
              });
            }
          });
          
          // Mesclar dados de sessões
          const consolidatedData = {
            sessions: segmentsData.flatMap(seg => seg.data?.sessions || [])
          };

          console.log(`🔍 ========== RESULTADO DA CONSOLIDAÇÃO ==========`);
          console.log(`🔍 Total de sessões consolidadas: ${consolidatedData.sessions.length}`);
          consolidatedData.sessions.forEach((session, idx) => {
            console.log(`🔍 Sessão consolidada ${idx + 1}:`);
            console.log(`   - Aluno: ${session.student_name}`);
            console.log(`   - Observações: ${session.clinical_observations?.length || 0}`);
            console.log(`   - Exercícios: ${session.exercises?.length || 0}`);
          });
          console.log('🔍 ========== FIM DA CONSOLIDAÇÃO ==========');
          console.log("✅ Dados consolidados completos:", JSON.stringify(consolidatedData, null, 2));
          
          setTranscript(fullTranscript);
          setAccumulatedSegments(segmentsData);
          onSessionData(consolidatedData);
          
          sonnerToast.dismiss(processingToastId);
          toast({
            title: `${allSegmentsRef.current.length} segmento(s) processado(s) com sucesso! ✅`,
            description: "Revise os dados consolidados e confirme para salvar a sessão.",
          });
          
          // Reset refs
          allSegmentsRef.current = [];
          
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
          setCurrentSegment(1);
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

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log("⏸️ Pausing recording...");
      setIsPaused(true);
      mediaRecorderRef.current.stop();
      
      sonnerToast.info("Gravação pausada", {
        description: "Clique em 'Retomar' para continuar gravando",
      });
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!isPaused) return;
    
    console.log("▶️ Resuming recording...");
    setIsPaused(false);
    setCurrentSegment(prev => prev + 1);
    
    try {
      // Criar novo MediaRecorder para continuar gravando
      const stream = streamRef.current;
      if (!stream) {
        throw new Error("Stream não disponível");
      }
      
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("🔄 Processing audio segment...");
        
        if (isPaused) {
          console.log("⏸️ Paused - storing current segment");
          allSegmentsRef.current.push([...audioChunksRef.current]);
          audioChunksRef.current = [];
          return;
        }
        
        // Processar todos os segmentos (código do onstop anterior)
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

          console.log("✅ All segments processed and consolidated:", consolidatedData);
          
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
          setCurrentSegment(1);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      sonnerToast.success(`Gravação retomada - Segmento ${currentSegment}`, {
        description: "Continue falando sobre a sessão de treino",
      });
      
    } catch (error) {
      console.error('❌ Error resuming recording:', error);
      
      const errorMsg = error instanceof Error ? error.message : "Erro ao retomar gravação";
      sonnerToast.error("Erro ao retomar", {
        description: errorMsg,
      });
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [isPaused, currentSegment, prescriptionId, selectedStudents, date, time, onSessionData, onError, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log("🛑 Stopping recording...");
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
                <div className="text-sm text-amber-600">
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
