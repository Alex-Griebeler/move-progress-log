import { useState, useEffect, useCallback, useRef } from 'react';
import { notify } from '@/lib/notify';

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

interface SessionDraft {
  timestamp: string;
  date: string;
  time: string;
  trainer: string;
  prescriptionId: string | null;
  selectedStudents: Student[];
  studentExercises: StudentExercises;
}

const DRAFT_KEY = 'session_draft_v1';
const DEBOUNCE_MS = 1000;

export function useSessionDraft() {
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Carregar rascunho ao montar
  useEffect(() => {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionDraft;
        setDraft(parsed);
        setLastSaved(new Date(parsed.timestamp));
        
        notify.info("Rascunho encontrado", {
          description: "Seus dados foram restaurados automaticamente",
        });
      } catch (error) {
        console.error('Erro ao carregar rascunho:', error);
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  // Salvar rascunho com debounce
  const saveDraft = useCallback((data: Partial<SessionDraft>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
      const draftData: SessionDraft = {
        timestamp: new Date().toISOString(),
        date: data.date || '',
        time: data.time || '',
        trainer: data.trainer || '',
        prescriptionId: data.prescriptionId || null,
        selectedStudents: data.selectedStudents || [],
        studentExercises: data.studentExercises || {},
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setDraft(draftData);
      setLastSaved(new Date());
      setIsSaving(false);
    }, DEBOUNCE_MS);
  }, []);

  // Limpar rascunho
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(null);
    setLastSaved(null);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  // Verificar se há mudanças não salvas
  const hasUnsavedChanges = useCallback((currentData: Partial<SessionDraft>) => {
    if (!draft) return false;
    
    return (
      currentData.date !== draft.date ||
      currentData.time !== draft.time ||
      currentData.trainer !== draft.trainer ||
      JSON.stringify(currentData.studentExercises) !== JSON.stringify(draft.studentExercises)
    );
  }, [draft]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    draft,
    saveDraft,
    clearDraft,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
  };
}
