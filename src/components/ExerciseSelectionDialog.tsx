import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { matchesSearch, normalizeForSearch } from "@/utils/searchNormalize";
import { useExercisesLibrary } from "@/hooks/useExercisesLibrary";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { logger } from "@/utils/logger";

interface ExerciseSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExerciseName: string;
  onExerciseSelected: (exerciseId: string, exerciseName: string) => void;
  autoSuggest?: boolean;
  /** Pre-filter by category (e.g. forca_hipertrofia) */
  initialCategory?: string | null;
  /** Pre-filter by movement pattern (e.g. cadeia_posterior) */
  initialMovementPattern?: string | null;
}

export function ExerciseSelectionDialog({
  open,
  onOpenChange,
  currentExerciseName,
  onExerciseSelected,
  autoSuggest = false,
  initialCategory,
  initialMovementPattern,
}: ExerciseSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestedExercise, setSuggestedExercise] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  
  const { data: exercises, isLoading } = useExercisesLibrary();

  const fetchAISuggestion = useCallback(async () => {
    if (!exercises || exercises.length === 0) return;
    
    setIsLoadingSuggestion(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-exercise', {
        body: {
          exerciseName: currentExerciseName,
          allExercises: exercises.map(ex => ({ id: ex.id, name: ex.name })),
        }
      });

      if (error) throw error;

      if (data.success && data.suggested) {
        setSuggestedExercise(data.suggested);
        notify.success("Sugestão encontrada", {
          description: `Exercício similar: ${data.suggested.name}`,
        });
      } else {
        notify.info("Nenhuma sugestão encontrada", {
          description: "Selecione manualmente da lista abaixo",
        });
      }
    } catch (error) {
      logger.error('Erro ao buscar sugestão:', error);
      notify.error("Erro ao buscar sugestão", {
        description: "Selecione manualmente da lista",
      });
    } finally {
      setIsLoadingSuggestion(false);
    }
  }, [currentExerciseName, exercises]);

  // Buscar sugestão automática ao abrir (se autoSuggest=true)
  useEffect(() => {
    if (open && autoSuggest && currentExerciseName && exercises && exercises.length > 0) {
      fetchAISuggestion();
    }
  }, [open, autoSuggest, currentExerciseName, exercises, fetchAISuggestion]);

  // Smart sorting: same movement_pattern first, then same category, then rest
  const filteredExercises = (() => {
    const normalizedCurrent = normalizeForSearch(currentExerciseName);
    const base = exercises?.filter(ex =>
      matchesSearch(ex.name, searchTerm) &&
      normalizeForSearch(ex.name) !== normalizedCurrent
    ) || [];

    if (!initialMovementPattern && !initialCategory) {
      return base.sort((a, b) => a.name.localeCompare(b.name));
    }

    return base.sort((a, b) => {
      const aPattern = a.movement_pattern === initialMovementPattern;
      const bPattern = b.movement_pattern === initialMovementPattern;
      const aCategory = a.category === initialCategory;
      const bCategory = b.category === initialCategory;

      // Same pattern first
      if (aPattern && !bPattern) return -1;
      if (!aPattern && bPattern) return 1;
      // Then same category
      if (aCategory && !bCategory) return -1;
      if (!aCategory && bCategory) return 1;
      return a.name.localeCompare(b.name);
    });
  })();

  const handleSelect = (exerciseId: string, exerciseName: string) => {
    onExerciseSelected(exerciseId, exerciseName);
    onOpenChange(false);
  };

  const handleAcceptSuggestion = () => {
    if (suggestedExercise) {
      handleSelect(suggestedExercise.id, suggestedExercise.name);
    }
  };

  const handleRejectSuggestion = () => {
    setSuggestedExercise(null);
    notify.info("Sugestão rejeitada", {
      description: "Selecione manualmente da lista abaixo",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolher exercício cadastrado</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Exercício mencionado: <strong>{currentExerciseName}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sugestão da IA */}
          {isLoadingSuggestion && (
            <Card className="p-4 border-primary/30" role="status">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" aria-hidden="true" />
                <p className="text-sm text-foreground">
                  Buscando exercício parecido no catálogo…
                </p>
              </div>
            </Card>
          )}

          {suggestedExercise && !isLoadingSuggestion && (
            <Card className="p-4 border-primary/30">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h4 className="font-semibold text-foreground">
                    Sugestão do catálogo
                  </h4>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {suggestedExercise.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O mais parecido com o que foi citado
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleRejectSuggestion}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Não é este
                    </Button>
                    <Button
                      onClick={handleAcceptSuggestion}
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Usar este
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Campo de busca */}
          <div className="space-y-2">
            <Label htmlFor="search-exercise">Buscar exercício</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-exercise"
                placeholder="Digite para filtrar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de exercícios */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exercícios cadastrados</Label>
              <Badge variant="secondary">
                {filteredExercises.length} {filteredExercises.length === 1 ? 'exercício' : 'exercícios'}
              </Badge>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-4 space-y-2">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8" role="status">
                    Carregando exercícios…
                  </p>
                ) : filteredExercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum exercício encontrado
                  </p>
                ) : (
                  filteredExercises.map((exercise, idx) => {
                    const isSamePattern = !!initialMovementPattern && exercise.movement_pattern === initialMovementPattern;
                    const isSameCategory = !!initialCategory && exercise.category === initialCategory;
                    const prevExercise = idx > 0 ? filteredExercises[idx - 1] : null;
                    const prevIsSamePattern = prevExercise && !!initialMovementPattern && prevExercise.movement_pattern === initialMovementPattern;
                    
                    // Show separator between groups
                    const showSeparator = idx > 0 && !isSamePattern && prevIsSamePattern;

                    return (
                      <div key={exercise.id}>
                        {showSeparator && (
                          <div className="border-t border-border my-2 pt-2">
                            <p className="text-xs text-muted-foreground mb-1">Outros exercícios</p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className={`w-full justify-start hover:bg-accent ${isSamePattern ? 'border-primary/40 bg-primary/5' : ''}`}
                          onClick={() => handleSelect(exercise.id, exercise.name)}
                        >
                          <span className="truncate">{exercise.name}</span>
                          {isSamePattern && (
                            <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                              mesmo padrão
                            </Badge>
                          )}
                          {!isSamePattern && isSameCategory && (
                            <Badge variant="outline" className="ml-auto text-xs shrink-0">
                              mesma categoria
                            </Badge>
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
