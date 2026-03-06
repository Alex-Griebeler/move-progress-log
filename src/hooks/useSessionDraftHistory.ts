import { useState, useEffect, useCallback } from 'react';
import { notify } from '@/lib/notify';
import { logger } from '@/utils/logger';

interface Student {
  id: string;
  name: string;
  weight_kg?: number;
}

interface StudentExercises {
  [studentId: string]: Array<{
    exercise_name: string;
    sets: number;
    reps: number;
    load_kg: number | null;
    load_breakdown: string;
    observations: string;
  }>;
}

export interface SessionDraft {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  trainer: string;
  prescriptionId: string | null;
  selectedStudents: Student[];
  studentExercises: StudentExercises;
}

const DRAFT_HISTORY_KEY = 'session_draft_history_v1';
const MAX_DRAFTS = 10; // Manter apenas os últimos 10 rascunhos

export function useSessionDraftHistory() {
  const [draftHistory, setDraftHistory] = useState<SessionDraft[]>([]);

  // Carregar histórico ao montar
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = useCallback(() => {
    const stored = localStorage.getItem(DRAFT_HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionDraft[];
        // Ordenar por timestamp (mais recente primeiro)
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

  const saveDraftToHistory = useCallback((draft: Omit<SessionDraft, 'id' | 'timestamp'>) => {
    const newDraft: SessionDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...draft,
    };

    setDraftHistory(prev => {
      // Adicionar novo rascunho no início
      const updated = [newDraft, ...prev];
      
      // Manter apenas os últimos MAX_DRAFTS
      const limited = updated.slice(0, MAX_DRAFTS);
      
      // Salvar no localStorage
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

  const getDraft = useCallback((draftId: string): SessionDraft | null => {
    return draftHistory.find(d => d.id === draftId) || null;
  }, [draftHistory]);

  const getTotalExerciseCount = useCallback((draft: SessionDraft): number => {
    return Object.values(draft.studentExercises).reduce(
      (total, exercises) => total + exercises.length,
      0
    );
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
