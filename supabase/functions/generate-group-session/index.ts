/**
 * Edge Function: Geração de Mesociclo com IA
 * Fabrik Performance - Back to Basics
 * 
 * MEL-IA-002: Conecta Oura readiness ao volume do mesociclo
 * Refatorado para usar functional_group (taxonomia de 2 níveis)
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
  groupReadiness?: number; // MEL-IA-002: 0-100, média do readiness do grupo
}

interface Exercise {
  id: string;
  name: string;
  movement_pattern: string;
  functional_group: string | null;
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
// CONSTANTES - GRUPOS FUNCIONAIS (Nível 1 da taxonomia)
// ============================================================================

const MANDATORY_GROUPS = {
  // Força - full body via grupos funcionais
  lower: ["dominancia_joelho", "dominancia_quadril"],
  upperPush: ["empurrar"],
  upperPull: ["puxar"],
  carry: ["carregar"],
  
  // Core triplanar - OBRIGATÓRIO
  core: {
    anti_extensao: "estabilidade_core",
    anti_flexao_lateral: "estabilidade_core",
    anti_rotacao: "estabilidade_core",
  },
  
  // Preparação
  mobility: ["mobilidade"],
  activation: ["ativacao"],
};

// Movement patterns específicos para core triplanar (Nível 2)
const CORE_TRIPLANAR_PATTERNS = {
  anti_extensao: ["core_anti_extensao", "core_geral"],
  anti_flexao_lateral: ["core_anti_flexao_lateral", "core_geral"],
  anti_rotacao: ["core_anti_rotacao", "core_geral"],
};

// Configuração de volume/intensidade por valência
const VALENCE_CONFIG = {
  potencia: { sets: "3-4", reps: "3-5", interval: 120, pse: "7-8" },
  forca: { sets: "4-5", reps: "4-6", interval: 90, pse: "8-9" },
  hipertrofia: { sets: "3-4", reps: "8-12", interval: 60, pse: "7-8" },
  condicionamento: { sets: "3", reps: "12-15", interval: 30, pse: "6-7" },
};

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
// MEL-IA-002: VOLUME MULTIPLIER BASEADO EM READINESS
// ============================================================================

function calcVolumeMultiplier(groupReadiness?: number): number {
  if (!groupReadiness || groupReadiness <= 0) return 1.0;
  
  // RS 85-100: pode aumentar volume (+10%)
  if (groupReadiness >= 85) return 1.1;
  // RS 65-84: volume normal
  if (groupReadiness >= 65) return 1.0;
  // RS 45-64: reduzir 20%
  if (groupReadiness >= 45) return 0.8;
  // RS 25-44: reduzir 40%
  if (groupReadiness >= 25) return 0.6;
  // RS 0-24: mínimo
  return 0.5;
}

function applyVolumeMultiplier(sets: string, multiplier: number): string {
  if (multiplier === 1.0) return sets;
  
  // Parse "3-4" or "3"
  const parts = sets.split("-").map(Number);
  if (parts.some(isNaN)) return sets;
  
  const adjusted = parts.map(v => Math.max(1, Math.round(v * multiplier)));
  return adjusted.length > 1 ? `${adjusted[0]}-${adjusted[1]}` : `${adjusted[0]}`;
}

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
    if (ex.risk_level === "high") return groupLevel === "avancado";
    if (ex.risk_level === "medium") return groupLevel !== "iniciante";
    return true;
  });
}

/**
 * Seleciona exercícios por GRUPO FUNCIONAL (Nível 1 da taxonomia)
 * Pool muito maior que o antigo filtro por movement_pattern
 */
function selectExercisesByGroup(
  exercises: Exercise[],
  functionalGroups: string[],
  count: number,
  excludeIds: string[] = []
): Exercise[] {
  const matching = exercises.filter(
    (ex) => ex.functional_group && functionalGroups.includes(ex.functional_group) && !excludeIds.includes(ex.id)
  );
  return shuffleArray(matching).slice(0, count);
}

/**
 * Seleciona exercícios por MOVEMENT PATTERN (Nível 2) para seleção específica
 */
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
// MOTOR DE GERAÇÃO (refatorado para functional_group)
// ============================================================================

function buildLMFPhase(exercises: Exercise[]): SessionPhase {
  const lmfExercises = selectExercisesByGroup(exercises, MANDATORY_GROUPS.mobility, 3);
  
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
      notes: "Foco nas áreas de maior tensão - foam roller, bola, stick",
    }],
  };
}

function buildMobilityPhase(exercises: Exercise[]): SessionPhase {
  const mobilityExercises = selectExercisesByGroup(exercises, MANDATORY_GROUPS.mobility, 4);
  
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
  const activationExercises = selectExercisesByGroup(exercises, MANDATORY_GROUPS.activation, 3);
  
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
  const usedIds: string[] = [];
  
  // Core triplanar: usar movement_pattern (Nível 2) para especificidade
  let antiExtensao = selectExercisesByPattern(exercises, CORE_TRIPLANAR_PATTERNS.anti_extensao, 1, usedIds);
  if (antiExtensao.length === 0) {
    antiExtensao = selectExercisesByGroup(exercises, [MANDATORY_GROUPS.core.anti_extensao], 1, usedIds);
  }
  antiExtensao.forEach((ex) => usedIds.push(ex.id));
  
  let antiFlexaoLateral = selectExercisesByPattern(exercises, CORE_TRIPLANAR_PATTERNS.anti_flexao_lateral, 1, usedIds);
  if (antiFlexaoLateral.length === 0) {
    antiFlexaoLateral = selectExercisesByGroup(exercises, [MANDATORY_GROUPS.core.anti_flexao_lateral], 1, usedIds);
  }
  antiFlexaoLateral.forEach((ex) => usedIds.push(ex.id));
  
  let antiRotacao = selectExercisesByPattern(exercises, CORE_TRIPLANAR_PATTERNS.anti_rotacao, 1, usedIds);
  if (antiRotacao.length === 0) {
    antiRotacao = selectExercisesByGroup(exercises, [MANDATORY_GROUPS.core.anti_rotacao], 1, usedIds);
  }
  antiRotacao.forEach((ex) => usedIds.push(ex.id));
  
  const coreExercises = [...antiExtensao, ...antiFlexaoLateral, ...antiRotacao];
  
  console.log(`[Core Phase] Selected ${coreExercises.length} exercises:`, coreExercises.map(e => e.name));
  
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
  coveredPatterns: Set<string>,
  volumeMultiplier: number
): { phase: SessionPhase; newCoveredPatterns: string[] } {
  const blocks: ExerciseBlock[] = [];
  const usedIds: string[] = [];
  const newCoveredPatterns: string[] = [];
  
  const primaryValence = valences[0] as keyof typeof VALENCE_CONFIG;
  const config = VALENCE_CONFIG[primaryValence] || VALENCE_CONFIG.forca;
  const method = valences.includes("condicionamento") ? "circuito" : "tradicional";
  
  // MEL-IA-002: aplicar volumeMultiplier aos sets
  const adjustedSets = applyVolumeMultiplier(config.sets, volumeMultiplier);
  
  // Bloco A - Membros Inferiores (via functional_group)
  const lowerExercises = selectExercisesByGroup(exercises, MANDATORY_GROUPS.lower, 2, usedIds);
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
          sets: adjustedSets, reps: config.reps, 
          interval: config.interval, pse: config.pse,
        })
      ),
      restBetweenSets: config.interval,
    });
  }
  
  // Bloco B - Membros Superiores (empurrar + puxar via functional_group)
  const pushExercises = selectExercisesByGroup(exercises, MANDATORY_GROUPS.upperPush, 1, usedIds);
  pushExercises.forEach((ex) => { usedIds.push(ex.id); newCoveredPatterns.push(ex.movement_pattern); });
  
  const pullExercises = selectExercisesByGroup(exercises, MANDATORY_GROUPS.upperPull, 1, usedIds);
  pullExercises.forEach((ex) => { usedIds.push(ex.id); newCoveredPatterns.push(ex.movement_pattern); });
  
  const upperExercises = [...pushExercises, ...pullExercises];
  if (upperExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Bloco B - Membros Superiores",
      method: valences.length > 1 ? "superset" : method,
      exercises: upperExercises.map((ex) =>
        mapToGeneratedExercise(ex, { 
          sets: adjustedSets, reps: config.reps, 
          interval: config.interval, pse: config.pse,
        })
      ),
      restBetweenSets: config.interval,
    });
  }
  
  // Bloco C - Carry (via functional_group)
  const carryExercises = selectExercisesByGroup(exercises, MANDATORY_GROUPS.carry, 1, usedIds);
  carryExercises.forEach((ex) => { usedIds.push(ex.id); newCoveredPatterns.push(ex.movement_pattern); });
  
  if (carryExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Bloco C - Carregamento",
      method: "tradicional",
      exercises: carryExercises.map((ex) =>
        mapToGeneratedExercise(ex, { 
          sets: applyVolumeMultiplier("3", volumeMultiplier), 
          reps: "20-30m", interval: 60, pse: config.pse,
        })
      ),
      restBetweenSets: 60,
    });
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
    anti_extensao: CORE_TRIPLANAR_PATTERNS.anti_extensao.some((p) => allPatterns.includes(p)),
    anti_flexao_lateral: CORE_TRIPLANAR_PATTERNS.anti_flexao_lateral.some((p) => allPatterns.includes(p)),
    anti_rotacao: CORE_TRIPLANAR_PATTERNS.anti_rotacao.some((p) => allPatterns.includes(p)),
  };
}

function generateWorkoutName(slot: string, valences: string[]): string {
  const slotNames: Record<string, string> = { A: "Power", B: "Build", C: "Flow" };
  const valenceNames: Record<string, string> = {
    potencia: "Explosive", forca: "Strength", hipertrofia: "Hyper", condicionamento: "MetCon",
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
  config: WorkoutSlotConfig,
  volumeMultiplier: number
): GeneratedWorkout {
  const coveredPatterns = new Set<string>();
  
  const lmfPhase = buildLMFPhase(exercises);
  const mobilityPhase = buildMobilityPhase(exercises);
  const activationPhase = buildActivationPhase(exercises);
  const corePhase = buildCorePhase(exercises);
  
  [lmfPhase, mobilityPhase, activationPhase, corePhase].forEach((phase) => {
    phase.blocks.forEach((block) => {
      block.exercises.forEach((ex) => coveredPatterns.add(ex.movementPattern));
    });
  });
  
  const { phase: mainPhase, newCoveredPatterns } = buildMainPhase(
    exercises, config.valences, coveredPatterns, volumeMultiplier
  );
  newCoveredPatterns.forEach((p) => coveredPatterns.add(p));
  
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
    
    if (!input.groupLevel || !input.workouts || input.workouts.length !== 3) {
      return new Response(
        JSON.stringify({ success: false, error: "Input inválido. Necessário: groupLevel e 3 workouts (A/B/C)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar exercícios incluindo functional_group
    const { data: allExercises, error: exercisesError } = await supabase
      .from("exercises_library")
      .select("id, name, movement_pattern, functional_group, risk_level, level, category, equipment_required, default_sets, default_reps, plyometric_phase");

    if (exercisesError) {
      throw new Error(`Erro ao buscar exercícios: ${exercisesError.message}`);
    }

    let exercises = filterByLevel(allExercises || [], input.groupLevel);
    exercises = filterByRisk(exercises, input.groupLevel);

    if (input.excludeExercises?.length) {
      exercises = exercises.filter((ex) => !input.excludeExercises!.includes(ex.id));
    }

    if (exercises.length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: "Biblioteca de exercícios insuficiente. Necessário pelo menos 20 exercícios." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // MEL-IA-002: calcular volumeMultiplier baseado no readiness do grupo
    const volumeMultiplier = calcVolumeMultiplier(input.groupReadiness);
    console.log(`[MEL-IA-002] groupReadiness: ${input.groupReadiness ?? 'N/A'}, volumeMultiplier: ${volumeMultiplier}`);

    const workouts: GeneratedWorkout[] = [];
    const warnings: string[] = [];
    
    // MEL-IA-002: avisar se readiness baixo
    if (input.groupReadiness && input.groupReadiness < 45) {
      warnings.push(`Readiness médio do grupo baixo (${input.groupReadiness}). Volume reduzido automaticamente em ${Math.round((1 - volumeMultiplier) * 100)}%.`);
    }
    
    for (const workoutConfig of input.workouts) {
      const workout = generateSingleWorkout(exercises, workoutConfig, volumeMultiplier);
      workouts.push(workout);
      
      const { anti_extensao, anti_flexao_lateral, anti_rotacao } = workout.coreTriplanarCheck;
      if (!anti_extensao || !anti_flexao_lateral || !anti_rotacao) {
        warnings.push(`Treino ${workoutConfig.slot}: Core triplanar incompleto. Revise a seleção de exercícios.`);
      }
    }

    const mesocycle = {
      id: generateUUID(),
      groupLevel: input.groupLevel,
      workouts,
      createdAt: new Date().toISOString(),
      metadata: {
        groupReadiness: input.groupReadiness ?? null,
        volumeMultiplier,
        totalPatternsBalance: {},
        recommendedProgression: {
          s1: { volumeMultiplier: 0.7 * volumeMultiplier, intensityMultiplier: 0.7 },
          s2: { volumeMultiplier: 1.0 * volumeMultiplier, intensityMultiplier: 0.85 },
          s3: { volumeMultiplier: 1.0 * volumeMultiplier, intensityMultiplier: 0.95 },
          s4: { volumeMultiplier: 1.0 * volumeMultiplier, intensityMultiplier: 1.0 },
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
