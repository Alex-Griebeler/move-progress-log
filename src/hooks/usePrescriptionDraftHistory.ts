import { useState, useEffect, useCallback } from 'react';
import { notify } from '@/lib/notify';
import { logger } from '@/utils/logger';

interface PrescriptionDraft {
  id: string;
  timestamp: string;
  name: string;
  objective: string;
  exercises: Array<{
    id: string;
    exercise_library_id: string;
    sets: string;
    reps: string;
    interval_seconds: string;
    pse: string;
    training_method: string;
    observations: string;
    group_with_previous: boolean;
    should_track: boolean;
    adaptations: Array<{
      type: "regression_1" | "regression_2" | "regression_3";
      exercise_library_id: string;
    }>;
    showAdaptations: boolean;
  }>;
}

const DRAFT_HISTORY_KEY = 'prescription_draft_history_v1';
const MAX_DRAFTS = 10;

export function usePrescriptionDraftHistory() {
  const [draftHistory, setDraftHistory] = useState<PrescriptionDraft[]>([]);

  // Carregar histórico ao montar
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = useCallback(() => {
    const stored = localStorage.getItem(DRAFT_HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PrescriptionDraft[];
        const sorted = parsed.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setDraftHistory(sorted);
      } catch (error) {
        logger.error('Erro ao carregar histórico de rascunhos:', error);
        localStorage.removeItem(DRAFT_HISTORY_KEY);
        setDraftHistory([]);
      }
    }
  }, []);

  const saveDraftToHistory = useCallback((draft: Omit<PrescriptionDraft, 'id' | 'timestamp'>) => {
    const newDraft: PrescriptionDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...draft,
    };

    setDraftHistory(prev => {
      const updated = [newDraft, ...prev];
      const limited = updated.slice(0, MAX_DRAFTS);
      localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(limited));
      return limited;
    });

    return newDraft.id;
  }, []);

  const deleteDraft = useCallback((draftId: string) => {
    setDraftHistory(prev => {
      const updated = prev.filter(d => d.id !== draftId);
      localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAllDrafts = useCallback(() => {
    localStorage.removeItem(DRAFT_HISTORY_KEY);
    setDraftHistory([]);
    notify.success("Histórico limpo", {
      description: "Todos os rascunhos foram removidos",
    });
  }, []);

  const getDraft = useCallback((draftId: string): PrescriptionDraft | null => {
    return draftHistory.find(d => d.id === draftId) || null;
  }, [draftHistory]);

  const getTotalExerciseCount = useCallback((draft: PrescriptionDraft): number => {
    return draft.exercises.length;
  }, []);

  return {
    draftHistory,
    saveDraftToHistory,
    deleteDraft,
    clearAllDrafts,
    getDraft,
    getTotalExerciseCount,
    loadHistory,
  };
}
