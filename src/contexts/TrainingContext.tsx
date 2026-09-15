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

/** Check-in v3 (spec v7 → v9.2): a avaliação é o PSR cru — o sinal
 *  normalizado {value, zone} é DERIVADO no consumo (toPsrSignal) e a matriz
 *  de concordância roda no funil; nada disso é armazenado (v6.1-M7).
 *  Escopada por fingerprint: mudou score/zona/carga/critical/strain-alto,
 *  a modulação é invalidada na tela (o valor do PSR preenchido é preservado
 *  pra reconfirmação — U4). */
export interface ConductAssessment {
  studentId: string;
  source: "oura" | "whoop";
  snapshotDate: string;
  fingerprint: string;
  psr: number | null;
}

/** Estado do check-in do dia (máquina resolveCheckInState): registrado com
 *  sucesso (done) ou pulado (skipped) — escopado por fingerprint + dia SP;
 *  QUALQUER divergência destrói (o setter troca por null, nunca "esconde" —
 *  A→B→A não ressuscita, v6.1-M8/v8.1). */
export interface CheckInRecord {
  studentId: string;
  state: "done" | "skipped";
  conductFingerprint: string;
  spDay: string;
  /** ISO UTC do registro (done) — alimenta o "registrado 08:10 · Refazer". */
  registeredAtIso: string | null;
  /** Conduta (trainingType) que está de fato NO BANCO pra este check-in —
   *  vem do commit, da re-persistência ou da linha reidratada (`conduta=`).
   *  A tela nunca PRESUME que uma alternativa retida foi gravada: compara
   *  com isto e re-persiste quando diverge (confirmação final 2, blocker 1). */
  persistedConductType: string | null;
}

interface TrainingContextValue {
  selectedAlternative: TrainingAlternative | null;
  setSelectedAlternative: (alternative: TrainingAlternative | null) => void;
  clearSelectedAlternative: () => void;
  conductAssessment: ConductAssessment | null;
  setConductAssessment: (assessment: ConductAssessment | null) => void;
  checkInRecord: CheckInRecord | null;
  setCheckInRecord: (record: CheckInRecord | null) => void;
}

const TrainingContext = createContext<TrainingContextValue | undefined>(undefined);

interface TrainingProviderProps {
  children: ReactNode;
}

export const TrainingProvider: React.FC<TrainingProviderProps> = ({ children }) => {
  const [selectedAlternative, setSelectedAlternativeState] = useState<TrainingAlternative | null>(null);
  const [conductAssessment, setConductAssessment] = useState<ConductAssessment | null>(null);
  const [checkInRecord, setCheckInRecord] = useState<CheckInRecord | null>(null);

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
        checkInRecord,
        setCheckInRecord,
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
