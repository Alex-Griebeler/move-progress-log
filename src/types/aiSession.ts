/**
 * Tipos para Geração de Sessões por IA
 * Fabrik Performance - Back to Basics
 * 
 * Estrutura do Mesociclo:
 * - 4 semanas com 3 treinos semanais (A/B/C)
 * - A: Segunda e Quinta | B: Terça e Sexta | C: Quarta e Sábado
 * - Treinos se repetem, ajustando volume e intensidade por ciclo (S1-S4)
 */

import type { 
  PeriodizationCycle, 
  TrainingValence,
  TrainingMethod,
  MovementPattern,
  RiskLevel,
  WorkoutSlot,
} from "@/constants/backToBasics";

// ============================================================================
// CONFIGURAÇÃO POR SLOT (A/B/C)
// ============================================================================

export interface WorkoutSlotConfig {
  slot: WorkoutSlot;
  valences: TrainingValence[]; // máx 2
}

// ============================================================================
// INPUT PARA GERAÇÃO DO MESOCICLO
// ============================================================================

export interface MesocycleGenerationInput {
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workouts: WorkoutSlotConfig[]; // 3 slots: A, B, C
  excludeExercises?: string[]; // IDs de exercícios a evitar
  groupReadiness?: number; // MEL-IA-002: 0-100, média do readiness do grupo
}

// ============================================================================
// EXERCÍCIO GERADO
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
// BLOCO DE EXERCÍCIOS
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
// SESSÃO INDIVIDUAL GERADA (Treino A, B ou C)
// ============================================================================

export interface GeneratedWorkout {
  id: string;
  slot: WorkoutSlot;
  name: string; // Gerado por LLM
  valences: TrainingValence[];
  totalDuration: number; // minutos (sempre 55 min)
  phases: SessionPhase[];
  coveredPatterns: MovementPattern[]; // Padrões de movimento trabalhados
  coreTriplanarCheck: {
    anti_extensao: boolean;
    anti_flexao_lateral: boolean;
    anti_rotacao: boolean;
  };
  mindfulnessScript?: string; // Gerado por LLM
  motivationalPhrase?: string; // Gerado por LLM
}

// ============================================================================
// MESOCICLO COMPLETO (3 treinos para 4 semanas)
// ============================================================================

export interface GeneratedMesocycle {
  id: string;
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workouts: GeneratedWorkout[]; // 3 treinos (A, B, C)
  createdAt: string;
  metadata: {
    groupReadiness?: number | null; // MEL-IA-002
    volumeMultiplier?: number; // MEL-IA-002
    totalPatternsBalance: Record<string, number>;
    recommendedProgression: {
      s1: { volumeMultiplier: number; intensityMultiplier: number };
      s2: { volumeMultiplier: number; intensityMultiplier: number };
      s3: { volumeMultiplier: number; intensityMultiplier: number };
      s4: { volumeMultiplier: number; intensityMultiplier: number };
    };
  };
}

// ============================================================================
// RESPOSTA DA EDGE FUNCTION
// ============================================================================

export interface MesocycleGenerationResponse {
  success: boolean;
  mesocycle?: GeneratedMesocycle;
  error?: string;
  warnings?: string[];
}

// ============================================================================
// PROTOCOLO DE RESPIRAÇÃO (Obrigatório em toda sessão)
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

// ============================================================================
// TEMPLATE SALVO (para reutilização)
// ============================================================================

export interface SavedMesocycleTemplate {
  id: string;
  trainerId: string;
  name: string;
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workoutConfigs: WorkoutSlotConfig[];
  isFavorite: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}
