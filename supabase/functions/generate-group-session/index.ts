/**
 * Edge Function: Geração de Mesociclo com IA
 * Fabrik Performance - Back to Basics
 * 
 * Gera 3 treinos (A/B/C) de uma vez para o mesociclo de 4 semanas.
 * 
 * Regras fundamentais:
 * - Cada sessão é FULL BODY (todos os padrões de movimento)
 * - Máx 2 valências por sessão
 * - LMF, respiração, mobilidade e core triplanar são OBRIGATÓRIOS
 * - IA rastreia padrões já cobertos para evitar redundância
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// TIPOS
// ============================================================================

interface WorkoutSlotConfig {
  slot: "A" | "B" | "C";
  valences: string[];
}

interface MesocycleInput {
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workouts: WorkoutSlotConfig[];
  excludeExercises?: string[];
}

interface Exercise {
  id: string;
  name: string;
  movement_pattern: string;
  risk_level: string | null;
  level: string | null;
  category: string | null;
  equipment_required: string[] | null;
  default_sets: string | null;
  default_reps: string | null;
  plyometric_phase: number | null;
}

interface GeneratedExercise {
  id: string;
  exerciseLibraryId: string;
  name: string;
  movementPattern: string;
  sets: string;
  reps: string;
  interval: number;
  pse?: string;
  executionCues?: string;
  riskLevel: string;
  equipment?: string[];
}

interface ExerciseBlock {
  id: string;
  name: string;
  method: string;
  exercises: GeneratedExercise[];
  restBetweenSets: number;
  notes?: string;
}

interface SessionPhase {
  id: string;
  name: string;
  order: number;
  duration: number;
  blocks: ExerciseBlock[];
  notes?: string;
}

interface GeneratedWorkout {
  id: string;
  slot: "A" | "B" | "C";
  name: string;
  valences: string[];
  totalDuration: number;
  phases: SessionPhase[];
  coveredPatterns: string[];
  coreTriplanarCheck: {
    anti_extensao: boolean;
    anti_flexao_lateral: boolean;
    anti_rotacao: boolean;
  };
  mindfulnessScript?: string;
  motivationalPhrase?: string;
}

// ============================================================================
// CONSTANTES - PADRÕES DE MOVIMENTO OBRIGATÓRIOS (FULL BODY)
// ============================================================================

const MANDATORY_PATTERNS = {
  // Força - todos obrigatórios em cada sessão
  lower: ["dominancia_joelho", "dominancia_quadril"],
  upperPush: ["empurrar_horizontal", "empurrar_vertical"],
  upperPull: ["puxar_horizontal", "puxar_vertical"],
  carry: ["carregar"],
  
  // Core triplanar - OBRIGATÓRIO
  core: {
    anti_extensao: ["core_anti_extensao"],
    anti_flexao_lateral: ["core_anti_flexao_lateral"],
    anti_rotacao: ["core_anti_rotacao"],
  },
  
  // Preparação - OBRIGATÓRIO
  lmf: ["lmf"],
  mobility: ["mobilidade_tornozelo", "mobilidade_quadril", "mobilidade_toracica", "mobilidade_integrada"],
  activation: ["ativacao_escapula", "ativacao_gluteos", "ativacao_flexores_quadril"],
};

// Configuração de volume/intensidade por valência
const VALENCE_CONFIG = {
  potencia: { sets: "3-4", reps: "3-5", interval: 120, pse: "7-8" },
  forca: { sets: "4-5", reps: "4-6", interval: 90, pse: "8-9" },
  hipertrofia: { sets: "3-4", reps: "8-12", interval: 60, pse: "7-8" },
  condicionamento: { sets: "3", reps: "12-15", interval: 30, pse: "6-7" },
};

// Sessão padrão de 55 minutos
const SESSION_STRUCTURE = {
  totalDuration: 55,
  phases: {
    lmf: { duration: 3, name: "LMF" },
    mobilidade: { duration: 5, name: "Mobilidade" },
    ativacao: { duration: 5, name: "Ativação" },
    core: { duration: 7, name: "Core Triplanar" },
    principal: { duration: 30, name: "Principal" },
    respiracao: { duration: 5, name: "Respiração/Mindfulness" },
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function filterByLevel(exercises: Exercise[], groupLevel: string): Exercise[] {
  const levelOrder = { iniciante: 1, intermediario: 2, avancado: 3 };
  const groupLevelValue = levelOrder[groupLevel as keyof typeof levelOrder] || 2;

  return exercises.filter((ex) => {
    if (!ex.level) return true;
    const levelMap: Record<string, number> = {
      "Iniciante": 1,
      "Iniciante/Intermediário": 1.5,
      "Intermediário": 2,
      "Intermediário/Avançado": 2.5,
      "Avançado": 3,
      "Todos os níveis": 0,
    };
    const exLevelValue = levelMap[ex.level] || 2;
    return exLevelValue === 0 || exLevelValue <= groupLevelValue;
  });
}

function filterByRisk(exercises: Exercise[], groupLevel: string): Exercise[] {
  return exercises.filter((ex) => {
    if (ex.risk_level === "high") {
      return groupLevel === "avancado";
    }
    if (ex.risk_level === "medium") {
      return groupLevel !== "iniciante";
    }
    return true;
  });
}

function selectExercisesByPattern(
  exercises: Exercise[],
  patterns: string[],
  count: number,
  excludeIds: string[] = []
): Exercise[] {
  const matching = exercises.filter(
    (ex) => patterns.includes(ex.movement_pattern) && !excludeIds.includes(ex.id)
  );
  return shuffleArray(matching).slice(0, count);
}

function mapToGeneratedExercise(
  exercise: Exercise,
  overrides: Partial<GeneratedExercise> = {}
): GeneratedExercise {
  return {
    id: generateUUID(),
    exerciseLibraryId: exercise.id,
    name: exercise.name,
    movementPattern: exercise.movement_pattern,
    sets: exercise.default_sets || "3",
    reps: exercise.default_reps || "10",
    interval: 60,
    riskLevel: exercise.risk_level || "low",
    equipment: exercise.equipment_required || [],
    ...overrides,
  };
}

// ============================================================================
// MOTOR DE GERAÇÃO
// ============================================================================

function buildLMFPhase(exercises: Exercise[]): SessionPhase {
  const lmfExercises = selectExercisesByPattern(exercises, MANDATORY_PATTERNS.lmf, 3);
  
  return {
    id: generateUUID(),
    name: SESSION_STRUCTURE.phases.lmf.name,
    order: 1,
    duration: SESSION_STRUCTURE.phases.lmf.duration,
    blocks: [{
      id: generateUUID(),
      name: "Liberação Miofascial",
      method: "autoliberacao",
      exercises: lmfExercises.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "1", reps: "30-60s", interval: 0 })
      ),
      restBetweenSets: 0,
      notes: "Foco nas áreas de maior tensão",
    }],
  };
}

function buildMobilityPhase(exercises: Exercise[]): SessionPhase {
  const mobilityExercises = selectExercisesByPattern(exercises, MANDATORY_PATTERNS.mobility, 4);
  
  return {
    id: generateUUID(),
    name: SESSION_STRUCTURE.phases.mobilidade.name,
    order: 2,
    duration: SESSION_STRUCTURE.phases.mobilidade.duration,
    blocks: [{
      id: generateUUID(),
      name: "Mobilidade Articular",
      method: "circuito",
      exercises: mobilityExercises.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "1", reps: "8-10", interval: 15 })
      ),
      restBetweenSets: 15,
    }],
  };
}

function buildActivationPhase(exercises: Exercise[]): SessionPhase {
  const activationExercises = selectExercisesByPattern(exercises, MANDATORY_PATTERNS.activation, 3);
  
  return {
    id: generateUUID(),
    name: SESSION_STRUCTURE.phases.ativacao.name,
    order: 3,
    duration: SESSION_STRUCTURE.phases.ativacao.duration,
    blocks: [{
      id: generateUUID(),
      name: "Ativação Neuromuscular",
      method: "circuito",
      exercises: activationExercises.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "2", reps: "10", interval: 20 })
      ),
      restBetweenSets: 20,
    }],
  };
}

function buildCorePhase(exercises: Exercise[]): SessionPhase {
  const blocks: ExerciseBlock[] = [];
  
  // Garantir 1 exercício de cada tipo de core
  const antiExtensao = selectExercisesByPattern(exercises, MANDATORY_PATTERNS.core.anti_extensao, 1);
  const antiFlexaoLateral = selectExercisesByPattern(exercises, MANDATORY_PATTERNS.core.anti_flexao_lateral, 1);
  const antiRotacao = selectExercisesByPattern(exercises, MANDATORY_PATTERNS.core.anti_rotacao, 1);
  
  const coreExercises = [...antiExtensao, ...antiFlexaoLateral, ...antiRotacao];
  
  if (coreExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Core Triplanar",
      method: "circuito",
      exercises: coreExercises.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "2", reps: "10-12", interval: 30 })
      ),
      restBetweenSets: 30,
    });
  }
  
  return {
    id: generateUUID(),
    name: SESSION_STRUCTURE.phases.core.name,
    order: 4,
    duration: SESSION_STRUCTURE.phases.core.duration,
    blocks,
  };
}

function buildMainPhase(
  exercises: Exercise[],
  valences: string[],
  coveredPatterns: Set<string>
): { phase: SessionPhase; newCoveredPatterns: string[] } {
  const blocks: ExerciseBlock[] = [];
  const usedIds: string[] = [];
  const newCoveredPatterns: string[] = [];
  
  // Determinar configuração baseada nas valências
  const primaryValence = valences[0] as keyof typeof VALENCE_CONFIG;
  const config = VALENCE_CONFIG[primaryValence] || VALENCE_CONFIG.forca;
  const method = valences.includes("condicionamento") ? "circuito" : "tradicional";
  
  // Padrões que ainda precisam ser cobertos nesta sessão
  const allForcePatterns = [
    ...MANDATORY_PATTERNS.lower,
    ...MANDATORY_PATTERNS.upperPush,
    ...MANDATORY_PATTERNS.upperPull,
    ...MANDATORY_PATTERNS.carry,
  ];
  
  const patternsToCover = allForcePatterns.filter((p) => !coveredPatterns.has(p));
  
  // Bloco A - Membros Inferiores
  const lowerPatterns = MANDATORY_PATTERNS.lower.filter((p) => !coveredPatterns.has(p));
  if (lowerPatterns.length > 0) {
    const lowerExercises = selectExercisesByPattern(exercises, lowerPatterns, 2, usedIds);
    lowerExercises.forEach((ex) => {
      usedIds.push(ex.id);
      newCoveredPatterns.push(ex.movement_pattern);
    });
    
    if (lowerExercises.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: "Bloco A - Membros Inferiores",
        method,
        exercises: lowerExercises.map((ex) =>
          mapToGeneratedExercise(ex, { 
            sets: config.sets, 
            reps: config.reps, 
            interval: config.interval,
            pse: config.pse,
          })
        ),
        restBetweenSets: config.interval,
      });
    }
  }
  
  // Bloco B - Membros Superiores (empurrar + puxar)
  const pushPatterns = MANDATORY_PATTERNS.upperPush.filter((p) => !coveredPatterns.has(p));
  const pullPatterns = MANDATORY_PATTERNS.upperPull.filter((p) => !coveredPatterns.has(p));
  
  const pushExercises = selectExercisesByPattern(exercises, pushPatterns, 1, usedIds);
  pushExercises.forEach((ex) => {
    usedIds.push(ex.id);
    newCoveredPatterns.push(ex.movement_pattern);
  });
  
  const pullExercises = selectExercisesByPattern(exercises, pullPatterns, 1, usedIds);
  pullExercises.forEach((ex) => {
    usedIds.push(ex.id);
    newCoveredPatterns.push(ex.movement_pattern);
  });
  
  const upperExercises = [...pushExercises, ...pullExercises];
  if (upperExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Bloco B - Membros Superiores",
      method: valences.length > 1 ? "superset" : method,
      exercises: upperExercises.map((ex) =>
        mapToGeneratedExercise(ex, { 
          sets: config.sets, 
          reps: config.reps, 
          interval: config.interval,
          pse: config.pse,
        })
      ),
      restBetweenSets: config.interval,
    });
  }
  
  // Bloco C - Carry (carregamento)
  const carryPatterns = MANDATORY_PATTERNS.carry.filter((p) => !coveredPatterns.has(p));
  if (carryPatterns.length > 0) {
    const carryExercises = selectExercisesByPattern(exercises, carryPatterns, 1, usedIds);
    carryExercises.forEach((ex) => {
      usedIds.push(ex.id);
      newCoveredPatterns.push(ex.movement_pattern);
    });
    
    if (carryExercises.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: "Bloco C - Carregamento",
        method: "tradicional",
        exercises: carryExercises.map((ex) =>
          mapToGeneratedExercise(ex, { 
            sets: "3", 
            reps: "20-30m", 
            interval: 60,
            pse: config.pse,
          })
        ),
        restBetweenSets: 60,
      });
    }
  }
  
  return {
    phase: {
      id: generateUUID(),
      name: SESSION_STRUCTURE.phases.principal.name,
      order: 5,
      duration: SESSION_STRUCTURE.phases.principal.duration,
      blocks,
    },
    newCoveredPatterns,
  };
}

function buildBreathingPhase(): SessionPhase {
  return {
    id: generateUUID(),
    name: SESSION_STRUCTURE.phases.respiracao.name,
    order: 6,
    duration: SESSION_STRUCTURE.phases.respiracao.duration,
    blocks: [{
      id: generateUUID(),
      name: "Respiração Guiada",
      method: "respiracao",
      exercises: [],
      restBetweenSets: 0,
      notes: "Box Breathing: 4s inspira, 4s segura, 4s expira, 4s segura. 5 ciclos.",
    }],
  };
}

function checkCoreTriplanar(phases: SessionPhase[]): {
  anti_extensao: boolean;
  anti_flexao_lateral: boolean;
  anti_rotacao: boolean;
} {
  const allPatterns = phases
    .flatMap((p) => p.blocks)
    .flatMap((b) => b.exercises)
    .map((e) => e.movementPattern);

  return {
    anti_extensao: MANDATORY_PATTERNS.core.anti_extensao.some((p) => allPatterns.includes(p)),
    anti_flexao_lateral: MANDATORY_PATTERNS.core.anti_flexao_lateral.some((p) => allPatterns.includes(p)),
    anti_rotacao: MANDATORY_PATTERNS.core.anti_rotacao.some((p) => allPatterns.includes(p)),
  };
}

function generateWorkoutName(slot: string, valences: string[]): string {
  const slotNames: Record<string, string> = {
    A: "Power",
    B: "Build", 
    C: "Flow",
  };
  
  const valenceNames: Record<string, string> = {
    potencia: "Explosive",
    forca: "Strength",
    hipertrofia: "Hyper",
    condicionamento: "MetCon",
  };
  
  const base = slotNames[slot] || slot;
  const suffix = valences.map((v) => valenceNames[v] || v).join(" + ");
  
  return `${base} ${suffix}`;
}

// ============================================================================
// GERAÇÃO DO WORKOUT COMPLETO
// ============================================================================

function generateSingleWorkout(
  exercises: Exercise[],
  config: WorkoutSlotConfig
): GeneratedWorkout {
  const coveredPatterns = new Set<string>();
  
  // Construir fases obrigatórias
  const lmfPhase = buildLMFPhase(exercises);
  const mobilityPhase = buildMobilityPhase(exercises);
  const activationPhase = buildActivationPhase(exercises);
  const corePhase = buildCorePhase(exercises);
  
  // Rastrear padrões cobertos nas fases de preparação
  [lmfPhase, mobilityPhase, activationPhase, corePhase].forEach((phase) => {
    phase.blocks.forEach((block) => {
      block.exercises.forEach((ex) => {
        coveredPatterns.add(ex.movementPattern);
      });
    });
  });
  
  // Fase principal com rastreamento de padrões
  const { phase: mainPhase, newCoveredPatterns } = buildMainPhase(
    exercises,
    config.valences,
    coveredPatterns
  );
  newCoveredPatterns.forEach((p) => coveredPatterns.add(p));
  
  // Fase de respiração
  const breathingPhase = buildBreathingPhase();
  
  const phases = [lmfPhase, mobilityPhase, activationPhase, corePhase, mainPhase, breathingPhase];
  
  return {
    id: generateUUID(),
    slot: config.slot,
    name: generateWorkoutName(config.slot, config.valences),
    valences: config.valences,
    totalDuration: SESSION_STRUCTURE.totalDuration,
    phases,
    coveredPatterns: Array.from(coveredPatterns),
    coreTriplanarCheck: checkCoreTriplanar(phases),
  };
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: MesocycleInput = await req.json();
    
    // Validar input
    if (!input.groupLevel || !input.workouts || input.workouts.length !== 3) {
      return new Response(
        JSON.stringify({ success: false, error: "Input inválido. Necessário: groupLevel e 3 workouts (A/B/C)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar exercícios da biblioteca
    const { data: allExercises, error: exercisesError } = await supabase
      .from("exercises_library")
      .select("id, name, movement_pattern, risk_level, level, category, equipment_required, default_sets, default_reps, plyometric_phase");

    if (exercisesError) {
      throw new Error(`Erro ao buscar exercícios: ${exercisesError.message}`);
    }

    // Filtrar por nível e risco
    let exercises = filterByLevel(allExercises || [], input.groupLevel);
    exercises = filterByRisk(exercises, input.groupLevel);

    // Excluir exercícios específicos se solicitado
    if (input.excludeExercises?.length) {
      exercises = exercises.filter((ex) => !input.excludeExercises!.includes(ex.id));
    }

    if (exercises.length < 20) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Biblioteca de exercícios insuficiente. Necessário pelo menos 20 exercícios." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Gerar os 3 treinos
    const workouts: GeneratedWorkout[] = [];
    const warnings: string[] = [];
    
    for (const workoutConfig of input.workouts) {
      const workout = generateSingleWorkout(exercises, workoutConfig);
      workouts.push(workout);
      
      // Verificar core triplanar
      const { anti_extensao, anti_flexao_lateral, anti_rotacao } = workout.coreTriplanarCheck;
      if (!anti_extensao || !anti_flexao_lateral || !anti_rotacao) {
        warnings.push(`Treino ${workoutConfig.slot}: Core triplanar incompleto. Revise a seleção de exercícios.`);
      }
    }

    // Montar resposta do mesociclo
    const mesocycle = {
      id: generateUUID(),
      groupLevel: input.groupLevel,
      workouts,
      createdAt: new Date().toISOString(),
      metadata: {
        totalPatternsBalance: {}, // TODO: calcular balanço de padrões
        recommendedProgression: {
          s1: { volumeMultiplier: 0.7, intensityMultiplier: 0.7 },
          s2: { volumeMultiplier: 1.0, intensityMultiplier: 0.85 },
          s3: { volumeMultiplier: 1.0, intensityMultiplier: 0.95 },
          s4: { volumeMultiplier: 1.0, intensityMultiplier: 1.0 },
        },
      },
    };

    return new Response(
      JSON.stringify({ success: true, mesocycle, warnings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na geração do mesociclo:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
