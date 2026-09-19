import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/utils/logger";
import { formatTimeSP } from "@/utils/displayFormat";

interface TranscriptionEditorProps {
  segmentId?: string;
  segmentOrder: number;
  rawTranscription: string;
  initialEditedTranscription?: string;
  onTranscriptionChange: (transcription: string) => void;
  autoSave?: boolean;
}

export function TranscriptionEditor({
  segmentId,
  segmentOrder,
  rawTranscription,
  initialEditedTranscription,
  onTranscriptionChange,
  autoSave = true,
}: TranscriptionEditorProps) {
  const [editedText, setEditedText] = useState(initialEditedTranscription || rawTranscription);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);


  const debouncedText = useDebounce(editedText, 2000);

  const saveTranscription = useCallback(async (text: string) => {
    if (!segmentId || !autoSave) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('session_audio_segments')
        .update({ edited_transcription: text })
        .eq('id', segmentId);

      if (error) throw error;

      setLastSaved(new Date());
      onTranscriptionChange(text);
    } catch (error) {
      logger.error('Error saving transcription:', error);
      notify.error("Erro ao salvar", {
        description: "Não foi possível salvar a transcrição editada",
      });
    } finally {
      setIsSaving(false);
    }
  }, [segmentId, autoSave, onTranscriptionChange]);

  useEffect(() => {
    if (debouncedText !== (initialEditedTranscription || rawTranscription)) {
      saveTranscription(debouncedText);
    }
  }, [debouncedText, saveTranscription, initialEditedTranscription, rawTranscription]);

  const handleTextChange = (value: string) => {
    setEditedText(value);
    if (!autoSave) {
      onTranscriptionChange(value);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Trecho {segmentOrder}
            </CardTitle>
            <CardDescription>
              Corrija a transcrição se algo foi entendido errado
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </Badge>
            )}
            {!isSaving && lastSaved && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Salvo {formatTimeSP(lastSaved)}
              </Badge>
            )}

          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Transcrição original
          </label>
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
            {rawTranscription}
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">
            Transcrição corrigida
          </label>
          <Textarea
            value={editedText}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={8}
            placeholder="Edite a transcrição aqui..."
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {autoSave
              ? "As alterações são salvas automaticamente."
              : "A correção entra na revisão da sessão."}
          </p>
        </div>


      </CardContent>
    </Card>
  );
}