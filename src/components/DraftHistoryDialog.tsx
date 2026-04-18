import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  History, 
  Trash2, 
  RotateCcw, 
  Users, 
  Calendar, 
  Clock, 
  User, 
  Dumbbell,
  AlertCircle,
  Trash
} from "lucide-react";
import { SessionDraft, useSessionDraftHistory } from "@/hooks/useSessionDraftHistory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatSessionTime } from "@/utils/sessionTime";
import { formatSessionDate } from "@/utils/sessionDate";

interface DraftHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestoreDraft: (draft: SessionDraft) => void;
}

export function DraftHistoryDialog({
  open,
  onOpenChange,
  onRestoreDraft,
}: DraftHistoryDialogProps) {
  const { 
    draftHistory, 
    deleteDraft, 
    clearAllDrafts, 
    getTotalExerciseCount 
  } = useSessionDraftHistory();
  
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const handleRestore = (draft: SessionDraft) => {
    onRestoreDraft(draft);
    onOpenChange(false);
  };

  const handleDelete = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este rascunho?')) {
      deleteDraft(draftId);
      if (selectedDraftId === draftId) {
        setSelectedDraftId(null);
      }
    }
  };

  const handleClearAll = () => {
    if (window.confirm(`Tem certeza que deseja excluir todos os ${draftHistory.length} rascunhos?`)) {
      clearAllDrafts();
      setSelectedDraftId(null);
    }
  };

  const selectedDraft = draftHistory.find(d => d.id === selectedDraftId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Rascunhos
          </DialogTitle>
          <DialogDescription>
            Restaure ou remova rascunhos salvos anteriormente
          </DialogDescription>
        </DialogHeader>

        {draftHistory.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum rascunho salvo no histórico. Os rascunhos são salvos automaticamente enquanto você preenche os dados.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Lista de rascunhos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {draftHistory.length} rascunho(s) salvo(s)
                </p>
                {draftHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-8 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash className="h-3 w-3 mr-1" />
                    Limpar Tudo
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {draftHistory.map((draft) => (
                    <Card
                      key={draft.id}
                      className={`cursor-pointer transition-colors hover:border-primary ${
                        selectedDraftId === draft.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedDraftId(draft.id)}
                    >
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium truncate">
                              {draft.trainer || 'Sem treinador'}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(draft.timestamp), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(draft.id, e)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatSessionDate(draft.date)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            {formatSessionTime(draft.time)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Users className="h-3 w-3" />
                            {draft.selectedStudents.length}
                          </Badge>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Dumbbell className="h-3 w-3" />
                            {getTotalExerciseCount(draft)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Detalhes do rascunho selecionado */}
            <div className="space-y-3">
              {selectedDraft ? (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Detalhes do Rascunho</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Treinador:</span>
                          <span>{selectedDraft.trainer || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Data:</span>
                          <span>{formatSessionDate(selectedDraft.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Horário:</span>
                          <span>{formatSessionTime(selectedDraft.time)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-2">Alunos ({selectedDraft.selectedStudents.length})</p>
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {selectedDraft.selectedStudents.map((student) => {
                              const exerciseCount = selectedDraft.studentExercises[student.id]?.length || 0;
                              return (
                                <div
                                  key={student.id}
                                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                                >
                                  <span>{student.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {exerciseCount} exercício(s)
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="pt-2 text-xs text-muted-foreground">
                        <p>
                          Salvo em:{" "}
                          {new Date(selectedDraft.timestamp).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={() => handleRestore(selectedDraft)}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar Este Rascunho
                  </Button>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Selecione um rascunho na lista ao lado para ver os detalhes e restaurá-lo.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
