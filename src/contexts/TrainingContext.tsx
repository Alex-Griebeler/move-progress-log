/**
 * Training Context - AUD-003
 * Gerencia estado global de recomendações de treino e alternativas selecionadas
 * Persiste escolhas do usuário entre navegações
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TrainingAlternative {
  /** Opcional desde o redesign (coerência visual: sem emoji como UI). */
  emoji?: string;
  type: string;
  description: string;
  /** Semântica operacional (R8b): a escolha vira CONDUTA pelo funil do
   *  effectiveConduct — nunca contorna percepção/pisos/zona 4. */
  targetZone?: 0 | 1 | 2 | 3 | 4;
  targetLoadDecision?: "increase" | "maintain" | "reduce" | "block";
  targetAdjustmentPercent?: number | null;
  /** Escopo da escolha (R7/R8b): sem casar {studentId, date, fingerprint},
   *  a seleção vazava entre alunas — e uma recomendação que MUDOU no mesmo
   *  dia (score/CRITICAL/contexto) não pode herdar a alternativa antiga. */
  studentId?: string;
  date?: string;
  fingerprint?: string;
}

/** Avaliação de percepção da aluna (R8b) — global mas escopada por
 *  fingerprint COMPLETO: mudou score/zona/carga/critical/contexto, a
 *  modulação é invalidada na tela (o histórico persiste no banco). */
export interface ConductAssessment {
  studentId: string;
  source: "oura" | "whoop";
  snapshotDate: string;
  fingerprint: string;
  perception: "nao_informada" | "pior" | "condizente" | "melhor";
  symptoms: boolean | null;
  symptomsAcknowledged: boolean;
}

interface TrainingContextValue {
  selectedAlternative: TrainingAlternative | null;
  setSelectedAlternative: (alternative: TrainingAlternative | null) => void;
  clearSelectedAlternative: () => void;
  conductAssessment: ConductAssessment | null;
  setConductAssessment: (assessment: ConductAssessment | null) => void;
}

const TrainingContext = createContext<TrainingContextValue | undefined>(undefined);

interface TrainingProviderProps {
  children: ReactNode;
}

export const TrainingProvider: React.FC<TrainingProviderProps> = ({ children }) => {
  const [selectedAlternative, setSelectedAlternativeState] = useState<TrainingAlternative | null>(null);
  const [conductAssessment, setConductAssessment] = useState<ConductAssessment | null>(null);

  const setSelectedAlternative = useCallback((alternative: TrainingAlternative | null) => {
    setSelectedAlternativeState(alternative);
  }, []);

  const clearSelectedAlternative = useCallback(() => {
    setSelectedAlternativeState(null);
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        selectedAlternative,
        conductAssessment,
        setConductAssessment,
        setSelectedAlternative,
        clearSelectedAlternative,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
};

export const useTrainingContext = (): TrainingContextValue => {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error('useTrainingContext must be used within a TrainingProvider');
  }
  return context;
};
