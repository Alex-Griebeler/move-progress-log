import { useState, useEffect, useCallback } from 'react';
import { notify } from '@/lib/notify';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { scopedDraftKey } from '@/lib/draftStorage';
import type { PrescriptionDraftExercise, PrescriptionType } from './usePrescriptionDraft';

interface PrescriptionDraft {
  id: string;
  timestamp: string;
  name: string;
  objective: string;
  prescriptionType?: PrescriptionType;
  exercises: PrescriptionDraftExercise[];
}

const DRAFT_HISTORY_BASE = 'prescription_draft_history_';
const MAX_DRAFTS = 10;

export function usePrescriptionDraftHistory() {
  // Histórico por treinador (ver lib/draftStorage).
  const { userId } = useAuth();
  const DRAFT_HISTORY_KEY = scopedDraftKey(DRAFT_HISTORY_BASE, userId);
  const [draftHistory, setDraftHistory] = useState<PrescriptionDraft[]>([]);

  const loadHistory = useCallback(() => {
    if (!DRAFT_HISTORY_KEY) { setDraftHistory([]); return; }
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
    } else {
      setDraftHistory([]);
    }
  }, [DRAFT_HISTORY_KEY]);

  // Carregar histórico ao montar
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveDraftToHistory = useCallback((draft: Omit<PrescriptionDraft, 'id' | 'timestamp'>) => {
    if (!DRAFT_HISTORY_KEY) return null;
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
  }, [DRAFT_HISTORY_KEY]);

  const deleteDraft = useCallback((draftId: string) => {
    if (!DRAFT_HISTORY_KEY) return;
    setDraftHistory(prev => {
      const updated = prev.filter(d => d.id !== draftId);
      localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [DRAFT_HISTORY_KEY]);

  const clearAllDrafts = useCallback(() => {
    if (DRAFT_HISTORY_KEY) localStorage.removeItem(DRAFT_HISTORY_KEY);
    setDraftHistory([]);
    notify.success("Histórico limpo", {
      description: "Todos os rascunhos foram removidos",
    });
  }, [DRAFT_HISTORY_KEY]);

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
