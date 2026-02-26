/**
 * Edge Function: Geração de Mesociclo com IA
 * Fabrik Performance - Back to Basics
 *
 * Correções aplicadas:
 * #1  Anti-repetição A/B/C (usedExerciseIds acumulado)
 * #2  Breathing real do banco (breathing_protocols)
 * #3  Validação de equipamento (equipment_inventory)
 * #4  Progressão S1-S4 aplicada (gera 4 semanas de metadata)
 * #5  Campos LLM via Lovable AI (executionCues, mindfulnessScript, motivationalPhrase)
 * #6  Métodos avançados para condicionamento (EMOM/AMRAP/For Time)
 * #7  totalPatternsBalance populado
 * #8  Progressão pliométrica respeitada
 * #9  Campos não usados removidos da query
 * #10 (callback é frontend — não se aplica aqui)
 * #11 Usa anon key + RLS para exercises_library
 * #12 Seleção ponderada por diversidade de equipamento/plano
 * #13 functional_group removido
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
  groupReadiness?: number;
}

interface Exercise {
  id: string;
  name: string;
  movement_pattern: string | null;
  risk_level: string | null;
  level: string | null;
  category: string | null;
  subcategory: string | null;
  movement_plane: string | null;
  equipment_required: string[] | null;
  default_sets: string | null;
  default_reps: string | null;
  numeric_level: number | null;
}

interface BreathingProtocol {
  id: string;
  name: string;
  technique: string;
  rhythm: string | null;
  duration_seconds: number;
  instructions: string;
  when_to_use: string[] | null;
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
// CONSTANTES
// ============================================================================

const SESSION_PATTERN_GROUPS: Record<string, string[]> = {
  lower_knee: ["dominancia_joelho", "lunge"],
  lower_hip: ["cadeia_posterior"],
  upper_push: ["empurrar"],
  upper_pull: ["puxar"],
  carry: ["carregar"],
};

const VALENCE_CONFIG: Record<string, { sets: string; reps: string; interval: number; pse: string }> = {
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

const ACTIVATION_SUBCATEGORIES = [
  "ativacao_escapular", "ativacao_gluteos", "escapula",
  "gluteos_estabilidade", "pe_tornozelo", "corretivos_quadril",
];

const CORE_TRIPLANAR_SUBCATEGORIES = ["anti_extensao", "anti_flexao_lateral", "anti_rotacao"];

// #6: Métodos por ciclo para condicionamento
const METCON_METHODS_BY_CYCLE: Record<string, string[]> = {
  s1: ["circuito"],
  s2: ["circuito"],
  s3: ["emom", "circuito"],
  s4: ["amrap", "for_time", "emom"],
};

// #4: Periodização S1-S4
const PERIODIZATION = {
  s1: { volumeMultiplier: 0.7, intensityMultiplier: 0.7, pse: "5-6", plyometrics: "none" },
  s2: { volumeMultiplier: 1.0, intensityMultiplier: 0.85, pse: "6-7", plyometrics: "low" },
  s3: { volumeMultiplier: 1.0, intensityMultiplier: 0.95, pse: "7-8", plyometrics: "full" },
  s4: { volumeMultiplier: 1.0, intensityMultiplier: 1.0, pse: "8-9", plyometrics: "full" },
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

// #12: Seleção ponderada — prioriza diversidade de plano de movimento e equipamento
function weightedSelect(exercises: Exercise[], count: number): Exercise[] {
  if (exercises.length <= count) return exercises;

  const scored = exercises.map((ex) => {
    let score = Math.random(); // base aleatória
    // Bonus por ter equipamento definido (mais variado)
    if (ex.equipment_required && ex.equipment_required.length > 0) score += 0.1;
    // Bonus por plano diferente do sagital (mais diverso)
    if (ex.movement_plane && ex.movement_plane !== "sagittal") score += 0.15;
    return { ex, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.ex);
}

function calcVolumeMultiplier(groupReadiness?: number): number {
  if (!groupReadiness || groupReadiness <= 0) return 1.0;
  if (groupReadiness >= 85) return 1.1;
  if (groupReadiness >= 65) return 1.0;
  if (groupReadiness >= 45) return 0.8;
  if (groupReadiness >= 25) return 0.6;
  return 0.5;
}

function applyVolumeMultiplier(sets: string, multiplier: number): string {
  if (multiplier === 1.0) return sets;
  const parts = sets.split("-").map(Number);
  if (parts.some(isNaN)) return sets;
  const adjusted = parts.map((v) => Math.max(1, Math.round(v * multiplier)));
  return adjusted.length > 1 ? `${adjusted[0]}-${adjusted[1]}` : `${adjusted[0]}`;
}

function filterByLevel(exercises: Exercise[], groupLevel: string): Exercise[] {
  const levelOrder: Record<string, number> = { iniciante: 1, intermediario: 2, avancado: 3 };
  const groupLevelValue = levelOrder[groupLevel] || 2;

  return exercises.filter((ex) => {
    // #8: Prefer numeric_level when available
    if (ex.numeric_level != null) {
      const maxNumeric = groupLevel === "iniciante" ? 3 : groupLevel === "intermediario" ? 6 : 9;
      return ex.numeric_level <= maxNumeric;
    }
    if (!ex.level) return true;
    const levelMap: Record<string, number> = {
      Iniciante: 1, "Iniciante/Intermediário": 1.5, Intermediário: 2,
      "Intermediário/Avançado": 2.5, Avançado: 3, "Todos os níveis": 0,
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

// #3: Validação de equipamento
function filterByAvailableEquipment(exercises: Exercise[], availableEquipment: Set<string>): Exercise[] {
  if (availableEquipment.size === 0) return exercises; // skip if no inventory data
  return exercises.filter((ex) => {
    if (!ex.equipment_required || ex.equipment_required.length === 0) return true;
    return ex.equipment_required.every((eq) => availableEquipment.has(eq.toLowerCase()));
  });
}

// #12: Seleção por pattern com anti-repetição e ponderação
function selectExercisesByPattern(
  exercises: Exercise[], patterns: string[], count: number, excludeIds: Set<string>
): Exercise[] {
  const matching = exercises.filter(
    (ex) => ex.movement_pattern && patterns.includes(ex.movement_pattern) && !excludeIds.has(ex.id)
  );
  return weightedSelect(matching, count);
}

function selectExercisesByCategory(
  exercises: Exercise[], category: string, count: number, excludeIds: Set<string>
): Exercise[] {
  const matching = exercises.filter(
    (ex) => ex.category === category && !excludeIds.has(ex.id)
  );
  return weightedSelect(matching, count);
}

function mapToGeneratedExercise(
  exercise: Exercise, overrides: Partial<GeneratedExercise> = {}
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
// FASES DE GERAÇÃO
// ============================================================================

function buildLMFPhase(exercises: Exercise[], excludeIds: Set<string>): SessionPhase {
  const selected = selectExercisesByCategory(exercises, "lmf", 3, excludeIds);
  selected.forEach((ex) => excludeIds.add(ex.id));

  return {
    id: generateUUID(),
    name: SESSION_STRUCTURE.phases.lmf.name,
    order: 1,
    duration: SESSION_STRUCTURE.phases.lmf.duration,
    blocks: [{
      id: generateUUID(),
      name: "Liberação Miofascial",
      method: "autoliberacao",
      exercises: selected.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "1", reps: "30-60s", interval: 0 })
      ),
      restBetweenSets: 0,
      notes: "Foco nas áreas de maior tensão - foam roller, bola, stick",
    }],
  };
}

function buildMobilityPhase(exercises: Exercise[], excludeIds: Set<string>): SessionPhase {
  const selected = selectExercisesByCategory(exercises, "mobilidade", 4, excludeIds);
  selected.forEach((ex) => excludeIds.add(ex.id));

  return {
    id: generateUUID(),
    name: SESSION_STRUCTURE.phases.mobilidade.name,
    order: 2,
    duration: SESSION_STRUCTURE.phases.mobilidade.duration,
    blocks: [{
      id: generateUUID(),
      name: "Mobilidade Articular",
      method: "circuito",
      exercises: selected.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "1", reps: "8-10", interval: 15 })
      ),
      restBetweenSets: 15,
    }],
  };
}

function buildActivationPhase(exercises: Exercise[], excludeIds: Set<string>): SessionPhase {
  const pool = exercises.filter(
    (ex) => ex.category === "core_ativacao" &&
      ex.subcategory && ACTIVATION_SUBCATEGORIES.includes(ex.subcategory) &&
      !excludeIds.has(ex.id)
  );
  const selected = weightedSelect(pool, 3);
  selected.forEach((ex) => excludeIds.add(ex.id));

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

function buildCorePhase(exercises: Exercise[], excludeIds: Set<string>): SessionPhase {
  const corePool = exercises.filter(
    (ex) => ex.category === "core_ativacao" &&
      ex.subcategory && CORE_TRIPLANAR_SUBCATEGORIES.includes(ex.subcategory) &&
      !excludeIds.has(ex.id)
  );

  const coreExercises: Exercise[] = [];
  for (const target of CORE_TRIPLANAR_SUBCATEGORIES) {
    const candidates = corePool.filter(
      (ex) => ex.subcategory === target && !excludeIds.has(ex.id)
    );
    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      coreExercises.push(picked);
      excludeIds.add(picked.id);
    } else {
      const fallback = corePool.filter((ex) => !excludeIds.has(ex.id));
      if (fallback.length > 0) {
        const picked = fallback[Math.floor(Math.random() * fallback.length)];
        coreExercises.push(picked);
        excludeIds.add(picked.id);
      }
    }
  }

  const blocks: ExerciseBlock[] = [];
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
  groupLevel: string,
  excludeIds: Set<string>,
  volumeMultiplier: number
): { phase: SessionPhase; newCoveredPatterns: string[] } {
  const blocks: ExerciseBlock[] = [];
  const newCoveredPatterns: string[] = [];

  const primaryValence = valences[0] as keyof typeof VALENCE_CONFIG;
  const config = VALENCE_CONFIG[primaryValence] || VALENCE_CONFIG.forca;

  // #6: método depende da valência + será refinado por ciclo no metadata
  const method = valences.includes("condicionamento") ? "circuito" : "tradicional";
  const adjustedSets = applyVolumeMultiplier(config.sets, volumeMultiplier);

  // Bloco Lower (knee + hip)
  const kneeExercises = selectExercisesByPattern(exercises, SESSION_PATTERN_GROUPS.lower_knee, 1, excludeIds);
  kneeExercises.forEach((ex) => { excludeIds.add(ex.id); if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern); });

  const hipExercises = selectExercisesByPattern(exercises, SESSION_PATTERN_GROUPS.lower_hip, 1, excludeIds);
  hipExercises.forEach((ex) => { excludeIds.add(ex.id); if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern); });

  const lowerExercises = [...kneeExercises, ...hipExercises];
  if (lowerExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Bloco - Membros Inferiores",
      method: lowerExercises.length > 1 ? "superset" : method,
      exercises: lowerExercises.map((ex) =>
        mapToGeneratedExercise(ex, { sets: adjustedSets, reps: config.reps, interval: config.interval, pse: config.pse })
      ),
      restBetweenSets: config.interval,
    });
  }

  // Bloco Upper (push + pull)
  const pushExercises = selectExercisesByPattern(exercises, SESSION_PATTERN_GROUPS.upper_push, 1, excludeIds);
  pushExercises.forEach((ex) => { excludeIds.add(ex.id); if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern); });

  const pullExercises = selectExercisesByPattern(exercises, SESSION_PATTERN_GROUPS.upper_pull, 1, excludeIds);
  pullExercises.forEach((ex) => { excludeIds.add(ex.id); if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern); });

  const upperExercises = [...pushExercises, ...pullExercises];
  if (upperExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Bloco - Membros Superiores",
      method: upperExercises.length > 1 ? "superset" : method,
      exercises: upperExercises.map((ex) =>
        mapToGeneratedExercise(ex, { sets: adjustedSets, reps: config.reps, interval: config.interval, pse: config.pse })
      ),
      restBetweenSets: config.interval,
    });
  }

  // #8: Bloco Pliometria/Potência — respeita nível numérico
  if (valences.includes("potencia") && groupLevel !== "iniciante") {
    const maxPlyoLevel = groupLevel === "avancado" ? 19 : 11; // avançado: todas fases; intermediário: até fase 11
    const plyoPool = exercises.filter(
      (ex) => ex.category === "potencia_pliometria" && !excludeIds.has(ex.id) &&
        (ex.numeric_level == null || ex.numeric_level <= maxPlyoLevel)
    );
    const plyoSelected = weightedSelect(plyoPool, 2);
    plyoSelected.forEach((ex) => excludeIds.add(ex.id));

    if (plyoSelected.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: "Bloco - Potência & Pliometria",
        method: "tradicional",
        exercises: plyoSelected.map((ex) =>
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

  // Bloco Carry
  const carryExercises = selectExercisesByPattern(exercises, SESSION_PATTERN_GROUPS.carry, 1, excludeIds);
  carryExercises.forEach((ex) => { excludeIds.add(ex.id); if (ex.movement_pattern) newCoveredPatterns.push(ex.movement_pattern); });

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

// #2: Breathing phase from database
function buildBreathingPhase(protocols: BreathingProtocol[]): SessionPhase {
  const postWorkout = protocols.filter(
    (p) => p.when_to_use && p.when_to_use.includes("post_workout")
  );
  const pool = postWorkout.length > 0 ? postWorkout : protocols;
  const selected = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;

  const notes = selected
    ? `${selected.name}: ${selected.instructions}${selected.rhythm ? ` Ritmo: ${selected.rhythm}` : ""}. ${Math.round(selected.duration_seconds / 60)} min.`
    : "Box Breathing: 4s inspira, 4s segura, 4s expira, 4s segura. 5 ciclos.";

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
      notes,
    }],
  };
}

function checkCoreTriplanar(phases: SessionPhase[]) {
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

// #7: Popular totalPatternsBalance
function calcPatternsBalance(workouts: GeneratedWorkout[]): Record<string, number> {
  const balance: Record<string, number> = {};
  for (const w of workouts) {
    for (const p of w.coveredPatterns) {
      balance[p] = (balance[p] || 0) + 1;
    }
  }
  return balance;
}

// #5: LLM enrichment via Lovable AI
async function enrichWithLLM(workouts: GeneratedWorkout[]): Promise<void> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return; // graceful degradation

  try {
    // Build a compact prompt with all exercises
    const exerciseList = workouts.flatMap((w) =>
      w.phases.flatMap((p) =>
        p.blocks.flatMap((b) =>
          b.exercises.map((ex) => ({
            workoutSlot: w.slot,
            exerciseId: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            movementPattern: ex.movementPattern,
          }))
        )
      )
    );

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um treinador funcional especialista da Fabrik Performance. 
Gere orientações de execução (execution cues) para cada exercício, um script de mindfulness para o final de cada treino e uma frase motivacional para cada treino.
Responda APENAS com JSON válido no formato especificado pela tool.
Use linguagem profissional mas acessível. Cues devem ter no máximo 2 frases. 
Mindfulness scripts devem ter 3-4 frases focando em respiração e consciência corporal.
Frases motivacionais devem ser inspiradoras e alinhadas com a filosofia Body & Mind Fitness.`,
          },
          {
            role: "user",
            content: `Gere cues de execução para estes exercícios e scripts para cada treino:\n${JSON.stringify(exerciseList)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_enrichment",
              description: "Define execution cues, mindfulness scripts and motivational phrases",
              parameters: {
                type: "object",
                properties: {
                  exerciseCues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exerciseId: { type: "string" },
                        cue: { type: "string" },
                      },
                      required: ["exerciseId", "cue"],
                      additionalProperties: false,
                    },
                  },
                  workoutEnrichments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        slot: { type: "string", enum: ["A", "B", "C"] },
                        mindfulnessScript: { type: "string" },
                        motivationalPhrase: { type: "string" },
                      },
                      required: ["slot", "mindfulnessScript", "motivationalPhrase"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["exerciseCues", "workoutEnrichments"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_enrichment" } },
      }),
    });

    if (!response.ok) {
      console.error("LLM enrichment failed:", response.status);
      return;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return;

    const enrichment = JSON.parse(toolCall.function.arguments);

    // Apply exercise cues
    const cueMap = new Map<string, string>();
    for (const c of enrichment.exerciseCues || []) {
      cueMap.set(c.exerciseId, c.cue);
    }

    for (const w of workouts) {
      // Apply workout-level enrichments
      const we = (enrichment.workoutEnrichments || []).find(
        (e: { slot: string }) => e.slot === w.slot
      );
      if (we) {
        w.mindfulnessScript = we.mindfulnessScript;
        w.motivationalPhrase = we.motivationalPhrase;
      }

      // Apply exercise cues
      for (const phase of w.phases) {
        for (const block of phase.blocks) {
          for (const ex of block.exercises) {
            const cue = cueMap.get(ex.id);
            if (cue) ex.executionCues = cue;
          }
        }
      }
    }
  } catch (err) {
    console.error("LLM enrichment error:", err);
    // Non-blocking: workouts still valid without LLM content
  }
}

// ============================================================================
// GERAÇÃO DO WORKOUT COMPLETO
// ============================================================================

function generateSingleWorkout(
  exercises: Exercise[],
  config: WorkoutSlotConfig,
  groupLevel: string,
  volumeMultiplier: number,
  breathingProtocols: BreathingProtocol[],
  globalExcludeIds: Set<string> // #1: anti-repetição global
): GeneratedWorkout {
  // Use a local copy that inherits global exclusions
  const excludeIds = new Set(globalExcludeIds);

  const lmfPhase = buildLMFPhase(exercises, excludeIds);
  const mobilityPhase = buildMobilityPhase(exercises, excludeIds);
  const activationPhase = buildActivationPhase(exercises, excludeIds);
  const corePhase = buildCorePhase(exercises, excludeIds);

  const coveredPatterns = new Set<string>();
  [lmfPhase, mobilityPhase, activationPhase, corePhase].forEach((phase) => {
    phase.blocks.forEach((block) => {
      block.exercises.forEach((ex) => coveredPatterns.add(ex.movementPattern));
    });
  });

  const { phase: mainPhase, newCoveredPatterns } = buildMainPhase(
    exercises, config.valences, groupLevel, excludeIds, volumeMultiplier
  );
  newCoveredPatterns.forEach((p) => coveredPatterns.add(p));

  const breathingPhase = buildBreathingPhase(breathingProtocols);
  const phases = [lmfPhase, mobilityPhase, activationPhase, corePhase, mainPhase, breathingPhase];

  // #1: Propagate used IDs to global set (main phase exercises only for meaningful anti-repetition)
  mainPhase.blocks.forEach((b) => b.exercises.forEach((ex) => globalExcludeIds.add(ex.exerciseLibraryId)));

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
    // #11: Auth via anon key + getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Autenticação obrigatória" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
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

    // #9: Fetch only used fields (removed functional_group, plyometric_phase)
    const { data: allExercises, error: exercisesError } = await supabase
      .from("exercises_library")
      .select("id, name, movement_pattern, risk_level, level, category, subcategory, movement_plane, equipment_required, default_sets, default_reps, numeric_level");

    if (exercisesError) throw new Error(`Erro ao buscar exercícios: ${exercisesError.message}`);

    // #2: Fetch breathing protocols
    const { data: breathingProtocols } = await supabase
      .from("breathing_protocols")
      .select("id, name, technique, rhythm, duration_seconds, instructions, when_to_use")
      .eq("is_active", true);

    // #3: Fetch available equipment
    const { data: equipmentData } = await supabase
      .from("equipment_inventory")
      .select("name")
      .eq("is_available", true);

    const availableEquipment = new Set<string>(
      (equipmentData || []).map((e: { name: string }) => e.name.toLowerCase())
    );

    // Apply filters
    let exercises = filterByLevel(allExercises || [], input.groupLevel);
    exercises = filterByRisk(exercises, input.groupLevel);
    exercises = filterByAvailableEquipment(exercises, availableEquipment); // #3

    if (input.excludeExercises?.length) {
      exercises = exercises.filter((ex) => !input.excludeExercises!.includes(ex.id));
    }

    if (exercises.length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: "Biblioteca de exercícios insuficiente. Necessário pelo menos 20 exercícios." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const volumeMultiplier = calcVolumeMultiplier(input.groupReadiness);
    const workouts: GeneratedWorkout[] = [];
    const warnings: string[] = [];

    if (input.groupReadiness && input.groupReadiness < 45) {
      warnings.push(
        `Readiness médio do grupo baixo (${input.groupReadiness}). Volume reduzido automaticamente em ${Math.round((1 - volumeMultiplier) * 100)}%.`
      );
    }

    // #1: Global exclude IDs for anti-repetition across A/B/C
    const globalExcludeIds = new Set<string>();

    for (const workoutConfig of input.workouts) {
      const workout = generateSingleWorkout(
        exercises, workoutConfig, input.groupLevel, volumeMultiplier,
        breathingProtocols || [], globalExcludeIds
      );
      workouts.push(workout);

      const { anti_extensao, anti_flexao_lateral, anti_rotacao } = workout.coreTriplanarCheck;
      if (!anti_extensao || !anti_flexao_lateral || !anti_rotacao) {
        warnings.push(`Treino ${workoutConfig.slot}: Core triplanar incompleto. Revise a seleção de exercícios.`);
      }
    }

    // #5: Enrich with LLM (non-blocking for response)
    await enrichWithLLM(workouts);

    // #7: Populate totalPatternsBalance
    const totalPatternsBalance = calcPatternsBalance(workouts);

    // #4 + #6: Build recommended progression with metcon methods
    const buildProgression = () => {
      const progression: Record<string, {
        volumeMultiplier: number;
        intensityMultiplier: number;
        pse: string;
        metconMethod?: string;
      }> = {};

      for (const [cycle, config] of Object.entries(PERIODIZATION)) {
        const hasMetcon = input.workouts.some((w) => w.valences.includes("condicionamento"));
        const metconMethods = METCON_METHODS_BY_CYCLE[cycle];
        progression[cycle] = {
          volumeMultiplier: config.volumeMultiplier * volumeMultiplier,
          intensityMultiplier: config.intensityMultiplier,
          pse: config.pse,
          ...(hasMetcon && metconMethods ? { metconMethod: metconMethods[0] } : {}),
        };
      }
      return progression;
    };

    const mesocycle = {
      id: generateUUID(),
      groupLevel: input.groupLevel,
      workouts,
      createdAt: new Date().toISOString(),
      metadata: {
        groupReadiness: input.groupReadiness ?? null,
        volumeMultiplier,
        totalPatternsBalance,
        recommendedProgression: buildProgression(),
      },
    };

    return new Response(
      JSON.stringify({ success: true, mesocycle, warnings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error generating mesocycle:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
