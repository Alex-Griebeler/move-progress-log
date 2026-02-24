/**
 * Edge Function: Geração de Mesociclo com IA
 * Fabrik Performance - Back to Basics
 * 
 * MEL-IA-002: Conecta Oura readiness ao volume do mesociclo
 * Refatorado para usar movement_pattern (taxonomia simplificada de 2 níveis)
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
  movement_pattern: string | null;
  functional_group: string | null;
  risk_level: string | null;
  level: string | null;
  category: string | null;
  subcategory: string | null;
  movement_plane: string | null;
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
  subcategory?: string;
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
// CONSTANTES - AGRUPAMENTOS POR PADRÃO DE MOVIMENTO (somente força)
// Para Core, Mobilidade, LMF, Pliometria e Respiração: filtrar por `category`.
// ============================================================================

const SESSION_PATTERN_GROUPS = {
  lower_knee: ["dominancia_joelho", "lunge"],
  lower_hip: ["cadeia_posterior"],
  upper_push: ["empurrar"],
  upper_pull: ["puxar"],
  carry: ["carregar"],
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
 * Seleciona exercícios por PADRÃO DE MOVIMENTO (somente força)
 */
function selectExercisesByPattern(
  exercises: Exercise[],
  patterns: string[],
  count: number,
  excludeIds: string[] = []
): Exercise[] {
  const matching = exercises.filter(
    (ex) => ex.movement_pattern && patterns.includes(ex.movement_pattern) && !excludeIds.includes(ex.id)
  );
  return shuffleArray(matching).slice(0, count);
}

/**
 * Seleciona exercícios por CATEGORIA (para Core, Mobilidade, LMF, Pliometria, Respiração)
 */
function selectExercisesByCategory(
  exercises: Exercise[],
  category: string,
  count: number,
  excludeIds: string[] = []
): Exercise[] {
  const matching = exercises.filter(
    (ex) => ex.category === category && !excludeIds.includes(ex.id)
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
    movementPattern: exercise.movement_pattern || exercise.category || "unknown",
    subcategory: exercise.subcategory || undefined,
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
  const lmfExercises = selectExercisesByCategory(exercises, "lmf", 3);
  
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
  const mobilityExercises = selectExercisesByCategory(exercises, "mobilidade", 4);
  
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
  // Ativação: exercises from core_ativacao with activation subcategories (not triplanar core)
  const ACTIVATION_SUBCATEGORIES = ["ativacao_escapular", "ativacao_gluteos", "escapula", "gluteos_estabilidade", "pe_tornozelo", "corretivos_quadril"];
  const activationExercises = exercises.filter(
    (ex) => ex.category === "core_ativacao" && ex.subcategory && ACTIVATION_SUBCATEGORIES.includes(ex.subcategory)
  );
  const selected = shuffleArray(activationExercises).slice(0, 3);
  
  return {
    id: generateUUID(),
    name: SESSION_STRUCTURE.phases.ativacao.name,
    order: 3,
    duration: SESSION_STRUCTURE.phases.ativacao.duration,
    blocks: [{
      id: generateUUID(),
      name: "Ativação Neuromuscular",
      method: "circuito",
      exercises: selected.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "2", reps: "10", interval: 20 })
      ),
      restBetweenSets: 20,
    }],
  };
}

function buildCorePhase(exercises: Exercise[]): SessionPhase {
  const blocks: ExerciseBlock[] = [];
  const usedIds: string[] = [];
  
  // Core triplanar: filter by category=core_ativacao and subcategory for triplanar types
  const corePool = exercises.filter(
    (ex) => ex.category === "core_ativacao" && ex.subcategory && ["anti_extensao", "anti_flexao_lateral", "anti_rotacao"].includes(ex.subcategory)
  );
  
  // Try to get one exercise per subcategory (anti_extensao, anti_flexao_lateral, anti_rotacao)
  const subcategoryTargets = ["anti_extensao", "anti_flexao_lateral", "anti_rotacao"];
  const coreExercises: Exercise[] = [];
  
  for (const target of subcategoryTargets) {
    const candidates = corePool.filter(
      (ex) => ex.subcategory === target && !usedIds.includes(ex.id)
    );
    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      coreExercises.push(picked);
      usedIds.push(picked.id);
    } else {
      // Fallback: pick any core exercise not yet used
      const fallback = corePool.filter((ex) => !usedIds.includes(ex.id));
      if (fallback.length > 0) {
        const picked = fallback[Math.floor(Math.random() * fallback.length)];
        coreExercises.push(picked);
        usedIds.push(picked.id);
      }
    }
  }
  
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
  slot: "A" | "B" | "C",
  groupLevel: string,
  coveredPatterns: Set<string>,
  volumeMultiplier: number
): { phase: SessionPhase; newCoveredPatterns: string[] } {
  const blocks: ExerciseBlock[] = [];
  const usedIds: string[] = [];
  const newCoveredPatterns: string[] = [];
  
  const primaryValence = valences[0] as keyof typeof VALENCE_CONFIG;
  const config = VALENCE_CONFIG[primaryValence] || VALENCE_CONFIG.forca;
  const method = valences.includes("condicionamento") ? "circuito" : "tradicional";
  
  const adjustedSets = applyVolumeMultiplier(config.sets, volumeMultiplier);

  // ── Slot-based differentiation ──
  // A: Lower-dominant (3 lower + 1 upper + carry)
  // B: Upper-dominant (1 lower + 3 upper + carry)
  // C: Full-body balanced (1 lower + 1 upper + pliometria + carry)
  
  const slotConfig = {
    A: { lowerCount: 3, upperPushCount: 1, upperPullCount: 0, includePlyometrics: false },
    B: { lowerCount: 1, upperPushCount: 1, upperPullCount: 2, includePlyometrics: false },
    C: { lowerCount: 1, upperPushCount: 1, upperPullCount: 1, includePlyometrics: true },
  }[slot];
  
  // Bloco Lower (via movement_pattern)
  if (slotConfig.lowerCount > 0) {
    const lowerExercises = selectExercisesByPattern(
      exercises,
      [...SESSION_PATTERN_GROUPS.lower_knee, ...SESSION_PATTERN_GROUPS.lower_hip],
      slotConfig.lowerCount,
      usedIds
    );
    lowerExercises.forEach((ex) => {
      usedIds.push(ex.id);
      if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern);
    });
    
    if (lowerExercises.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: slot === "A" ? "Bloco A - Membros Inferiores (Foco)" : "Bloco - Membros Inferiores",
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
  }
  
  // Bloco Upper Push
  if (slotConfig.upperPushCount > 0) {
    const pushExercises = selectExercisesByPattern(exercises, SESSION_PATTERN_GROUPS.upper_push, slotConfig.upperPushCount, usedIds);
    pushExercises.forEach((ex) => { usedIds.push(ex.id); if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern); });
    
    // Bloco Upper Pull
    const pullExercises = selectExercisesByPattern(exercises, SESSION_PATTERN_GROUPS.upper_pull, slotConfig.upperPullCount, usedIds);
    pullExercises.forEach((ex) => { usedIds.push(ex.id); if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern); });
    
    const upperExercises = [...pushExercises, ...pullExercises];
    if (upperExercises.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: slot === "B" ? "Bloco B - Membros Superiores (Foco)" : "Bloco - Membros Superiores",
        method: upperExercises.length > 1 ? "superset" : method,
        exercises: upperExercises.map((ex) =>
          mapToGeneratedExercise(ex, { 
            sets: adjustedSets, reps: config.reps, 
            interval: config.interval, pse: config.pse,
          })
        ),
        restBetweenSets: config.interval,
      });
    }
  }
  
  // Bloco Pliometria/Potência (Slot C only, or when valence includes potencia)
  const canDoPlyometrics = slotConfig.includePlyometrics || valences.includes("potencia");
  const levelAllowsPlyometrics = groupLevel !== "iniciante";
  
  if (canDoPlyometrics && levelAllowsPlyometrics) {
    const plyoExercises = selectExercisesByCategory(exercises, "potencia_pliometria", 2, usedIds);
    plyoExercises.forEach((ex) => usedIds.push(ex.id));
    
    if (plyoExercises.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: "Bloco - Potência & Pliometria",
        method: "tradicional",
        exercises: plyoExercises.map((ex) =>
          mapToGeneratedExercise(ex, { 
            sets: applyVolumeMultiplier("3", volumeMultiplier),
            reps: "5-8", interval: 90, pse: "7-8",
          })
        ),
        restBetweenSets: 90,
        notes: "Execução explosiva com técnica perfeita. Priorizar qualidade sobre volume.",
      });
    }
  }
  
  // Bloco Carry (sempre presente)
  const carryExercises = selectExercisesByPattern(exercises, SESSION_PATTERN_GROUPS.carry, 1, usedIds);
  carryExercises.forEach((ex) => { usedIds.push(ex.id); if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern); });
  
  if (carryExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Bloco - Carregamento",
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
  const coreExercises = phases
    .flatMap((p) => p.blocks)
    .filter((b) => b.name === "Core Triplanar")
    .flatMap((b) => b.exercises);

  const subcategories = new Set(coreExercises.map((ex) => ex.subcategory).filter(Boolean));

  return {
    anti_extensao: subcategories.has("anti_extensao"),
    anti_flexao_lateral: subcategories.has("anti_flexao_lateral"),
    anti_rotacao: subcategories.has("anti_rotacao"),
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
  groupLevel: string,
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
    exercises, config.valences, config.slot, groupLevel, coveredPatterns, volumeMultiplier
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
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: "Autenticação obrigatória" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const input: MesocycleInput = await req.json();
    
    if (!input.groupLevel || !input.workouts || input.workouts.length !== 3) {
      return new Response(
        JSON.stringify({ success: false, error: "Input inválido. Necessário: groupLevel e 3 workouts (A/B/C)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar exercícios incluindo movement_plane e subcategory
    const { data: allExercises, error: exercisesError } = await supabase
      .from("exercises_library")
      .select("id, name, movement_pattern, functional_group, risk_level, level, category, subcategory, movement_plane, equipment_required, default_sets, default_reps, plyometric_phase");

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
    // Volume multiplier applied

    const workouts: GeneratedWorkout[] = [];
    const warnings: string[] = [];
    
    // MEL-IA-002: avisar se readiness baixo
    if (input.groupReadiness && input.groupReadiness < 45) {
      warnings.push(`Readiness médio do grupo baixo (${input.groupReadiness}). Volume reduzido automaticamente em ${Math.round((1 - volumeMultiplier) * 100)}%.`);
    }
    
    for (const workoutConfig of input.workouts) {
      const workout = generateSingleWorkout(exercises, workoutConfig, input.groupLevel, volumeMultiplier);
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
    // Error generating mesocycle
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
