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

interface SessionInput {
  format: "tradicional" | "time_efficient";
  cycle: "s1" | "s2" | "s3" | "s4";
  valences: string[];
  groupLevel: "iniciante" | "intermediario" | "avancado";
  focus: "inferior" | "superior" | "full_body";
  includePlyometrics: boolean;
  includeLMF: boolean;
  excludeExercises?: string[];
  preferredEquipment?: string[];
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

// ============================================================================
// CONSTANTES DO BACK TO BASICS
// ============================================================================

const CYCLE_CONFIG = {
  s1: { volume: 0.65, pse: "5-6", methods: ["circuito"], allowPlyometrics: false },
  s2: { volume: 0.85, pse: "6-7", methods: ["tradicional", "superset"], allowPlyometrics: true },
  s3: { volume: 1.0, pse: "7-8", methods: ["emom", "cluster", "triset"], allowPlyometrics: true },
  s4: { volume: 1.0, pse: "8-9", methods: ["amrap", "for_time"], allowPlyometrics: true },
};

const FORMAT_CONFIG = {
  tradicional: {
    totalDuration: 50,
    phases: {
      preparacao: { duration: 10, stages: 6 },
      ativacao: { duration: 7 },
      principal: { duration: 28 },
      cooldown: { duration: 5 },
    },
  },
  time_efficient: {
    totalDuration: 30,
    phases: {
      preparacao: { duration: 5, stages: 3 },
      principal: { duration: 22 },
      cooldown: { duration: 3 },
    },
  },
};

const CORE_PATTERNS = {
  anti_extensao: ["core_anti_extensao"],
  anti_flexao_lateral: ["core_anti_flexao_lateral"],
  anti_rotacao: ["core_anti_rotacao"],
};

const LOWER_BODY_PATTERNS = ["dominancia_joelho", "dominancia_quadril"];
const UPPER_PUSH_PATTERNS = ["empurrar_horizontal", "empurrar_vertical"];
const UPPER_PULL_PATTERNS = ["puxar_horizontal", "puxar_vertical"];
const MOBILITY_PATTERNS = [
  "mobilidade_tornozelo",
  "mobilidade_quadril",
  "mobilidade_toracica",
  "mobilidade_integrada",
];
const ACTIVATION_PATTERNS = [
  "ativacao_escapula",
  "ativacao_gluteos",
  "ativacao_flexores_quadril",
];
const PLYOMETRIC_PATTERNS = [
  "pliometria_bilateral_linear",
  "pliometria_unilateral_linear",
  "pliometria_unilateral_lateral",
  "pliometria_unilateral_lateral_medial",
];

// ============================================================================
// MOTOR DETERMINÍSTICO
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
    const exLevelValue = levelOrder[ex.level as keyof typeof levelOrder] || 2;
    return exLevelValue <= groupLevelValue;
  });
}

function filterByRisk(
  exercises: Exercise[],
  groupLevel: string,
  cycle: string
): Exercise[] {
  return exercises.filter((ex) => {
    if (ex.risk_level === "high") {
      // Alto risco apenas para avançado em ciclos S3/S4
      return groupLevel === "avancado" && (cycle === "s3" || cycle === "s4");
    }
    if (ex.risk_level === "medium") {
      // Médio risco para intermediário+ ou ciclos S2+
      return (
        groupLevel !== "iniciante" ||
        cycle === "s2" ||
        cycle === "s3" ||
        cycle === "s4"
      );
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

function buildPreparationPhase(
  exercises: Exercise[],
  format: "tradicional" | "time_efficient"
): SessionPhase {
  const config = FORMAT_CONFIG[format];
  const blocks: ExerciseBlock[] = [];

  // 1. Mobilidade
  const mobilityExercises = selectExercisesByPattern(
    exercises,
    MOBILITY_PATTERNS,
    format === "tradicional" ? 3 : 2
  );
  if (mobilityExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Mobilidade Articular",
      method: "circuito",
      exercises: mobilityExercises.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "1", reps: "8-10", interval: 15 })
      ),
      restBetweenSets: 15,
    });
  }

  // 2. Ativação
  const activationExercises = selectExercisesByPattern(
    exercises,
    ACTIVATION_PATTERNS,
    format === "tradicional" ? 3 : 2,
    mobilityExercises.map((e) => e.id)
  );
  if (activationExercises.length > 0) {
    blocks.push({
      id: generateUUID(),
      name: "Ativação Neuromuscular",
      method: "circuito",
      exercises: activationExercises.map((ex) =>
        mapToGeneratedExercise(ex, { sets: "2", reps: "10", interval: 20 })
      ),
      restBetweenSets: 20,
    });
  }

  return {
    id: generateUUID(),
    name: "Preparação",
    order: 1,
    duration: config.phases.preparacao.duration,
    blocks,
  };
}

function buildCorePhase(exercises: Exercise[]): SessionPhase {
  const blocks: ExerciseBlock[] = [];
  const usedIds: string[] = [];

  // Core triplanar obrigatório
  for (const [type, patterns] of Object.entries(CORE_PATTERNS)) {
    const coreExercises = selectExercisesByPattern(exercises, patterns, 1, usedIds);
    if (coreExercises.length > 0) {
      usedIds.push(coreExercises[0].id);
    }
  }

  const coreExercises = selectExercisesByPattern(
    exercises,
    [...CORE_PATTERNS.anti_extensao, ...CORE_PATTERNS.anti_flexao_lateral, ...CORE_PATTERNS.anti_rotacao],
    3
  );

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
    name: "Ativação / Core",
    order: 2,
    duration: 7,
    blocks,
  };
}

function buildMainPhase(
  exercises: Exercise[],
  input: SessionInput,
  cycleConfig: typeof CYCLE_CONFIG.s1
): SessionPhase {
  const blocks: ExerciseBlock[] = [];
  const usedIds: string[] = [];
  const method = shuffleArray(cycleConfig.methods)[0];

  // Estação A - Membros Inferiores
  if (input.focus === "inferior" || input.focus === "full_body") {
    const lowerExercises = selectExercisesByPattern(
      exercises,
      LOWER_BODY_PATTERNS,
      input.focus === "full_body" ? 2 : 3,
      usedIds
    );
    lowerExercises.forEach((ex) => usedIds.push(ex.id));

    if (lowerExercises.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: "Estação A - Membros Inferiores",
        method,
        exercises: lowerExercises.map((ex) =>
          mapToGeneratedExercise(ex, { 
            sets: "3-4", 
            reps: input.valences.includes("forca") ? "4-6" : "8-12",
            interval: 90,
            pse: cycleConfig.pse,
          })
        ),
        restBetweenSets: 90,
      });
    }
  }

  // Estação B - Membros Superiores
  if (input.focus === "superior" || input.focus === "full_body") {
    const pushExercises = selectExercisesByPattern(
      exercises,
      UPPER_PUSH_PATTERNS,
      1,
      usedIds
    );
    pushExercises.forEach((ex) => usedIds.push(ex.id));

    const pullExercises = selectExercisesByPattern(
      exercises,
      UPPER_PULL_PATTERNS,
      1,
      usedIds
    );
    pullExercises.forEach((ex) => usedIds.push(ex.id));

    const upperExercises = [...pushExercises, ...pullExercises];

    if (upperExercises.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: "Estação B - Membros Superiores",
        method,
        exercises: upperExercises.map((ex) =>
          mapToGeneratedExercise(ex, {
            sets: "3",
            reps: input.valences.includes("hipertrofia") ? "8-12" : "6-8",
            interval: 75,
            pse: cycleConfig.pse,
          })
        ),
        restBetweenSets: 75,
      });
    }
  }

  // Estação C - Pliometria (se permitido)
  if (
    input.includePlyometrics &&
    cycleConfig.allowPlyometrics &&
    input.groupLevel !== "iniciante"
  ) {
    const plyoExercises = selectExercisesByPattern(
      exercises,
      PLYOMETRIC_PATTERNS,
      2,
      usedIds
    );

    if (plyoExercises.length > 0) {
      blocks.push({
        id: generateUUID(),
        name: "Estação C - Potência/Pliometria",
        method: "tradicional",
        exercises: plyoExercises.map((ex) =>
          mapToGeneratedExercise(ex, {
            sets: "3",
            reps: "5-6",
            interval: 120,
            pse: cycleConfig.pse,
          })
        ),
        restBetweenSets: 120,
        notes: "Foco em qualidade de movimento e potência máxima",
      });
    }
  }

  return {
    id: generateUUID(),
    name: "Principal",
    order: 3,
    duration: FORMAT_CONFIG[input.format].phases.principal.duration,
    blocks,
  };
}

function buildCooldownPhase(): SessionPhase {
  return {
    id: generateUUID(),
    name: "Cool Down",
    order: 4,
    duration: 5,
    blocks: [
      {
        id: generateUUID(),
        name: "Respiração e Mindfulness",
        method: "respiracao",
        exercises: [],
        restBetweenSets: 0,
        notes: "Protocolo de respiração guiada para recuperação",
      },
    ],
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
    anti_extensao: CORE_PATTERNS.anti_extensao.some((p) => allPatterns.includes(p)),
    anti_flexao_lateral: CORE_PATTERNS.anti_flexao_lateral.some((p) =>
      allPatterns.includes(p)
    ),
    anti_rotacao: CORE_PATTERNS.anti_rotacao.some((p) => allPatterns.includes(p)),
  };
}

// ============================================================================
// CAMADA LLM - GERAÇÃO DE LINGUAGEM
// ============================================================================

async function generateSessionLanguage(
  phases: SessionPhase[],
  input: SessionInput
): Promise<{ name: string; mindfulnessScript?: string; motivationalPhrase?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    // Fallback sem LLM
    const focusName = {
      inferior: "Lower Power",
      superior: "Upper Strength",
      full_body: "Full Body Flow",
    }[input.focus];
    
    const cycleName = {
      s1: "Recovery",
      s2: "Build",
      s3: "Peak",
      s4: "Overload",
    }[input.cycle];

    return {
      name: `${focusName} ${cycleName}`,
      mindfulnessScript: "Feche os olhos. Inspire por 4 segundos, segure por 4, expire por 4. Repita 4 vezes.",
      motivationalPhrase: "Cada repetição te aproxima da sua melhor versão.",
    };
  }

  try {
    const exerciseNames = phases
      .flatMap((p) => p.blocks)
      .flatMap((b) => b.exercises)
      .map((e) => e.name)
      .slice(0, 8)
      .join(", ");

    const prompt = `Você é um coach de fitness premium da Fabrik Performance. Gere para esta sessão de treino:

Contexto:
- Formato: ${input.format === "tradicional" ? "Tradicional (50 min)" : "Time Efficient (30 min)"}
- Ciclo: ${input.cycle.toUpperCase()} (${input.cycle === "s1" ? "Recuperação" : input.cycle === "s2" ? "Adaptação" : "Choque"})
- Foco: ${input.focus === "inferior" ? "Membros Inferiores" : input.focus === "superior" ? "Membros Superiores" : "Full Body"}
- Valências: ${input.valences.join(", ")}
- Exercícios principais: ${exerciseNames}

Responda APENAS em JSON válido com esta estrutura:
{
  "name": "Nome criativo e elegante para a sessão (máx 4 palavras)",
  "mindfulnessScript": "Script de 30 segundos para respiração guiada no cool down",
  "motivationalPhrase": "Frase motivacional curta para os alunos"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um coach de fitness premium. Responda apenas em JSON válido." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("LLM error:", response.status);
      throw new Error("LLM request failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error("Invalid LLM response format");
  } catch (error) {
    console.error("LLM generation error:", error);
    // Fallback
    return {
      name: `${input.focus === "inferior" ? "Lower" : input.focus === "superior" ? "Upper" : "Full"} ${input.cycle.toUpperCase()} Session`,
      mindfulnessScript: "Respire profundamente. Inspire por 4 segundos, expire por 6. Sinta seu corpo relaxar.",
      motivationalPhrase: "O treino de hoje constrói o sucesso de amanhã.",
    };
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const input: SessionInput = await req.json();

    // Validar valências (máx 2)
    if (input.valences.length > 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Máximo de 2 valências por sessão",
          warnings: ["Valências reduzidas para as 2 primeiras selecionadas"]
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar exercícios da biblioteca
    const { data: allExercises, error: exError } = await supabase
      .from("exercises_library")
      .select("*");

    if (exError) {
      throw new Error(`Erro ao buscar exercícios: ${exError.message}`);
    }

    if (!allExercises || allExercises.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Biblioteca de exercícios vazia. Importe exercícios primeiro." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filtrar exercícios por nível e risco
    let filteredExercises = filterByLevel(allExercises, input.groupLevel);
    filteredExercises = filterByRisk(filteredExercises, input.groupLevel, input.cycle);

    // Excluir exercícios específicos se solicitado
    if (input.excludeExercises?.length) {
      filteredExercises = filteredExercises.filter(
        (ex) => !input.excludeExercises!.includes(ex.id)
      );
    }

    const cycleConfig = CYCLE_CONFIG[input.cycle];
    const warnings: string[] = [];

    // Gerar fases
    const phases: SessionPhase[] = [];

    // 1. Preparação
    phases.push(buildPreparationPhase(filteredExercises, input.format));

    // 2. Core (apenas para formato tradicional)
    if (input.format === "tradicional") {
      phases.push(buildCorePhase(filteredExercises));
    }

    // 3. Principal
    phases.push(buildMainPhase(filteredExercises, input, cycleConfig));

    // 4. Cool Down
    phases.push(buildCooldownPhase());

    // Verificar core triplanar
    const coreCheck = checkCoreTriplanar(phases);
    if (!coreCheck.anti_extensao || !coreCheck.anti_flexao_lateral || !coreCheck.anti_rotacao) {
      warnings.push("Core triplanar incompleto. Considere adicionar exercícios de anti-extensão, anti-flexão lateral ou anti-rotação.");
    }

    // Gerar linguagem via LLM
    const language = await generateSessionLanguage(phases, input);

    // Montar sessão final
    const session = {
      id: generateUUID(),
      name: language.name,
      format: input.format,
      cycle: input.cycle,
      valences: input.valences,
      totalDuration: FORMAT_CONFIG[input.format].totalDuration,
      phases,
      coreTriplanarCheck: coreCheck,
      mindfulnessScript: language.mindfulnessScript,
      motivationalPhrase: language.motivationalPhrase,
      createdAt: new Date().toISOString(),
      metadata: {
        groupLevel: input.groupLevel,
        focus: input.focus,
        includePlyometrics: input.includePlyometrics,
        includeLMF: input.includeLMF,
      },
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        session,
        warnings: warnings.length > 0 ? warnings : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating session:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro ao gerar sessão" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});