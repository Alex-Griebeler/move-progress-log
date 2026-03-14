import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/utils/logger";

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
      setHasUnsavedChanges(false);
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
    setHasUnsavedChanges(true);
    if (!autoSave) {
      onTranscriptionChange(value);
    }
  };

  const handleManualSave = async () => {
    await saveTranscription(editedText);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              Segmento {segmentOrder}
            </CardTitle>
            <CardDescription>
              Edite a transcrição conforme necessário
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
                Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
            {!isSaving && hasUnsavedChanges && !autoSave && (
              <Badge variant="outline">
                Não salvo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Transcrição Original
          </label>
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
            {rawTranscription}
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">
            Transcrição Editada
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
              ? "Salvamento automático ativado - suas alterações são salvas automaticamente"
              : "Clique em 'Salvar Edição' para salvar suas alterações"
            }
          </p>
        </div>

        {!autoSave && (
          <Button 
            onClick={handleManualSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Edição
          </Button>
        )}
      </CardContent>
    </Card>
  );
}