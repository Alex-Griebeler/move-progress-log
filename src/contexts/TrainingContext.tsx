/**
 * Training Context - AUD-003
 * Gerencia estado global de recomendações de treino e alternativas selecionadas
 * Persiste escolhas do usuário entre navegações
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TrainingAlternative {
  emoji: string;
  type: string;
  description: string;
}

interface TrainingContextValue {
  selectedAlternative: TrainingAlternative | null;
  setSelectedAlternative: (alternative: TrainingAlternative | null) => void;
  clearSelectedAlternative: () => void;
}

const TrainingContext = createContext<TrainingContextValue | undefined>(undefined);

interface TrainingProviderProps {
  children: ReactNode;
}

export const TrainingProvider: React.FC<TrainingProviderProps> = ({ children }) => {
  const [selectedAlternative, setSelectedAlternativeState] = useState<TrainingAlternative | null>(null);

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
