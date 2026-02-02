/**
 * Tipos para Geração de Sessões por IA
 * Fabrik Performance - Back to Basics
 */

import type { 
  PeriodizationCycle, 
  SessionFormat, 
  TrainingValence, 
  TrainingStation,
  TrainingMethod,
  CoreTriplanarType,
  MovementPattern,
  RiskLevel,
} from "@/constants/backToBasics";

// ============================================================================
// INTERFACE DO EXERCÍCIO GERADO
// ============================================================================

export interface GeneratedExercise {
  id: string;
  exerciseLibraryId: string;
  name: string;
  movementPattern: MovementPattern;
  sets: string;
  reps: string;
  interval: number; // segundos
  pse?: string;
  executionCues?: string; // Gerado por LLM
  riskLevel: RiskLevel;
  equipment?: string[];
}

// ============================================================================
// BLOCO/GRUPO DE EXERCÍCIOS
// ============================================================================

export interface ExerciseBlock {
  id: string;
  name: string;
  method: TrainingMethod;
  exercises: GeneratedExercise[];
  restBetweenSets: number; // segundos
  notes?: string;
}

// ============================================================================
// FASE DA SESSÃO
// ============================================================================

export interface SessionPhase {
  id: string;
  name: string;
  order: number;
  duration: number; // minutos
  blocks: ExerciseBlock[];
  notes?: string;
}

// ============================================================================
// SESSÃO COMPLETA GERADA
// ============================================================================

export interface GeneratedSession {
  id: string;
  name: string; // Gerado por LLM
  format: SessionFormat;
  cycle: PeriodizationCycle;
  valences: TrainingValence[];
  totalDuration: number; // minutos
  phases: SessionPhase[];
  coreTriplanarCheck: {
    anti_extensao: boolean;
    anti_flexao_lateral: boolean;
    anti_rotacao: boolean;
  };
  mindfulnessScript?: string; // Gerado por LLM
  motivationalPhrase?: string; // Gerado por LLM
  stations?: {
    a: ExerciseBlock;
    b: ExerciseBlock;
    c?: ExerciseBlock;
  };
  createdAt: string;
  metadata: {
    groupLevel: string;
    focus: "inferior" | "superior" | "full_body";
    includePlyometrics: boolean;
    includeLMF: boolean;
  };
}

// ============================================================================
// INPUT PARA GERAÇÃO
// ============================================================================

export interface SessionGenerationInput {
  format: SessionFormat;
  cycle: PeriodizationCycle;
  valences: TrainingValence[];
  groupLevel: "iniciante" | "intermediario" | "avancado";
  focus: "inferior" | "superior" | "full_body";
  includePlyometrics: boolean;
  includeLMF: boolean;
  excludeExercises?: string[]; // IDs de exercícios a evitar
  preferredEquipment?: string[];
}

// ============================================================================
// RESPOSTA DA EDGE FUNCTION
// ============================================================================

export interface SessionGenerationResponse {
  success: boolean;
  session?: GeneratedSession;
  error?: string;
  warnings?: string[];
}

// ============================================================================
// TEMPLATE SALVO
// ============================================================================

export interface SavedSessionTemplate {
  id: string;
  trainerId: string;
  name: string;
  format: SessionFormat;
  cycle: PeriodizationCycle;
  valences: TrainingValence[];
  durationMinutes: number;
  phases: SessionPhase[];
  coreTriplanarCheck: {
    anti_extensao: boolean;
    anti_flexao_lateral: boolean;
    anti_rotacao: boolean;
  };
  focus?: string;
  equipmentUsed?: string[];
  isFavorite: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PROTOCOLO DE RESPIRAÇÃO
// ============================================================================

export interface BreathingProtocol {
  id: string;
  name: string;
  category: "respiracao" | "mindfulness" | "meditacao";
  technique: string;
  rhythm: string;
  durationSeconds: number;
  instructions: string;
  benefits: string[];
  whenToUse: ("pre_workout" | "intra_workout" | "post_workout" | "recovery")[];
  audioCues?: string[];
  isActive: boolean;
}

// ============================================================================
// EQUIPAMENTO DO INVENTÁRIO
// ============================================================================

export interface EquipmentInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weightKg?: number;
  weightRange?: string;
  location: string;
  isAvailable: boolean;
  notes?: string;
}
