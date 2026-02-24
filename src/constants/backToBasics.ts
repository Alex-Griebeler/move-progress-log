/**
 * Back to Basics - Constantes da metodologia de treino
 * Fabrik Performance - Body & Mind Fitness
 * 
 * ESTRUTURA DO MESOCICLO:
 * - 4 semanas com 3 treinos semanais (A/B/C)
 * - Treinos se repetem, ajustando apenas volume e intensidade
 * - A: Segunda e Quinta | B: Terça e Sexta | C: Quarta e Sábado
 */

// ============================================================================
// ESTRUTURA DO MESOCICLO (4 SEMANAS)
// ============================================================================

export const MESOCYCLE_STRUCTURE = {
  weeks: 4,
  workoutsPerWeek: 3,
  workoutSlots: {
    A: { name: "Treino A", days: ["Segunda", "Quinta"], color: "blue" },
    B: { name: "Treino B", days: ["Terça", "Sexta"], color: "green" },
    C: { name: "Treino C", days: ["Quarta", "Sábado"], color: "purple" },
  },
} as const;

export type WorkoutSlot = keyof typeof MESOCYCLE_STRUCTURE.workoutSlots;

// ============================================================================
// GRUPOS FUNCIONAIS (Nível 1 — usado pela IA para montar sessões full-body)
// ============================================================================

export const FUNCTIONAL_GROUPS = {
  empurrar_horizontal: "Empurrar Horizontal",
  empurrar_vertical: "Empurrar Vertical",
  puxar_horizontal: "Puxar Horizontal",
  puxar_vertical: "Puxar Vertical",
  dominancia_joelho: "Dominância de Joelho",
  dominancia_quadril: "Dominância de Quadril",
  carregar: "Carregar",
  core_anti_extensao: "Core Anti-extensão",
  core_anti_flexao_lateral: "Core Anti-flexão Lateral",
  core_anti_rotacao: "Core Anti-rotação",
  core_geral: "Core Geral",
  ativacao: "Ativação",
  mobilidade: "Mobilidade",
  pliometria: "Pliometria",
  locomocao: "Locomoção",
  respiracao: "Respiração",
} as const;

export type FunctionalGroup = keyof typeof FUNCTIONAL_GROUPS;

// ============================================================================
// PADRÕES DE MOVIMENTO (Nível 2 — subcategoria para filtros na UI)
// ============================================================================

export const MOVEMENT_PATTERNS = {
  // Empurrar
  empurrar_horizontal: "Empurrar Horizontal",
  empurrar_vertical: "Empurrar Vertical",
  // Puxar
  puxar_horizontal: "Puxar Horizontal",
  puxar_vertical: "Puxar Vertical",
  // Dominância de Joelho
  dominancia_joelho: "Dominância de Joelho (Geral)",
  agachamento_bilateral: "Agachamento Bilateral",
  agachamento_unilateral: "Agachamento Unilateral",
  agachamento_lateral: "Agachamento Lateral",
  base_assimetrica_split_squat: "Split Squat / Base Assimétrica",
  lunge: "Lunge",
  lunge_slideboard: "Lunge Slideboard",
  flexao_joelhos_nordica: "Flexão Nórdica / Joelhos",
  // Dominância de Quadril
  dominancia_quadril: "Dominância de Quadril (Geral)",
  deadlift_bilateral: "Deadlift Bilateral",
  deadlift_unilateral: "Deadlift Unilateral",
  rdl_stiff: "RDL / Stiff",
  ponte_hip_thrust: "Ponte / Hip Thrust",
  gluteos_estabilidade: "Glúteos / Estabilidade",
  // Carregar
  carregar: "Carregar",
  // Core Triplanar
  core_anti_extensao: "Core Anti-extensão",
  core_anti_flexao_lateral: "Core Anti-flexão Lateral",
  core_anti_rotacao: "Core Anti-rotação",
  core_geral: "Core Geral",
  // Ativação
  ativacao_gluteos: "Ativação Glúteos",
  ativacao_geral: "Ativação Geral",
  escapula: "Ativação Escapular",
  // Mobilidade
  mobilidade_tornozelo: "Mobilidade Tornozelo",
  mobilidade_quadril: "Mobilidade Quadril",
  mobilidade_toracica: "Mobilidade Torácica",
  mobilidade_integrada: "Mobilidade Integrada",
  // Pliometria
  pliometria_bilateral_linear: "Pliometria Bilateral Linear",
  pliometria_unilateral_linear: "Pliometria Unilateral Linear",
  pliometria_unilateral_lateral: "Pliometria Unilateral Lateral",
  pliometria_unilateral_lateral_medial: "Pliometria Unilateral Lat/Med",
  // Outros
  locomocao: "Locomoção",
  respiracao: "Respiração",
} as const;

export type MovementPattern = keyof typeof MOVEMENT_PATTERNS;

// ============================================================================
// MAPEAMENTO PADRÃO DE MOVIMENTO → GRUPO FUNCIONAL
// ============================================================================

export const PATTERN_TO_FUNCTIONAL_GROUP: Record<string, FunctionalGroup> = {
  empurrar_horizontal: "empurrar_horizontal",
  empurrar_vertical: "empurrar_vertical",
  puxar_horizontal: "puxar_horizontal",
  puxar_vertical: "puxar_vertical",
  dominancia_joelho: "dominancia_joelho",
  agachamento_bilateral: "dominancia_joelho",
  agachamento_unilateral: "dominancia_joelho",
  agachamento_lateral: "dominancia_joelho",
  base_assimetrica_split_squat: "dominancia_joelho",
  lunge: "dominancia_joelho",
  lunge_slideboard: "dominancia_joelho",
  flexao_joelhos_nordica: "dominancia_joelho",
  dominancia_quadril: "dominancia_quadril",
  deadlift_bilateral: "dominancia_quadril",
  deadlift_unilateral: "dominancia_quadril",
  rdl_stiff: "dominancia_quadril",
  ponte_hip_thrust: "dominancia_quadril",
  gluteos_estabilidade: "dominancia_quadril",
  carregar: "carregar",
  core_anti_extensao: "core_anti_extensao",
  core_anti_flexao_lateral: "core_anti_flexao_lateral",
  core_anti_rotacao: "core_anti_rotacao",
  core_geral: "core_geral",
  ativacao_gluteos: "ativacao",
  ativacao_geral: "ativacao",
  escapula: "ativacao",
  mobilidade_tornozelo: "mobilidade",
  mobilidade_quadril: "mobilidade",
  mobilidade_toracica: "mobilidade",
  mobilidade_integrada: "mobilidade",
  pliometria_bilateral_linear: "pliometria",
  pliometria_unilateral_linear: "pliometria",
  pliometria_unilateral_lateral: "pliometria",
  pliometria_unilateral_lateral_medial: "pliometria",
  locomocao: "locomocao",
  respiracao: "respiracao",
};

// ============================================================================
// CATEGORIAS DE EXERCÍCIO (apenas as que existem no banco)
// ============================================================================

export const EXERCISE_CATEGORIES = {
  forca: "Força",
  core: "Core",
  mobilidade: "Mobilidade",
  ativacao: "Ativação",
  pliometria: "Pliometria",
  locomocao: "Locomoção",
  respiracao: "Respiração",
} as const;

export type ExerciseCategory = keyof typeof EXERCISE_CATEGORIES;

// ============================================================================
// MAPEAMENTO GRUPO FUNCIONAL → CATEGORIA
// ============================================================================

export const GROUP_TO_CATEGORY: Record<FunctionalGroup, ExerciseCategory> = {
  empurrar_horizontal: "forca",
  empurrar_vertical: "forca",
  puxar_horizontal: "forca",
  puxar_vertical: "forca",
  dominancia_joelho: "forca",
  dominancia_quadril: "forca",
  carregar: "forca",
  core_anti_extensao: "core",
  core_anti_flexao_lateral: "core",
  core_anti_rotacao: "core",
  core_geral: "core",
  ativacao: "ativacao",
  mobilidade: "mobilidade",
  pliometria: "pliometria",
  locomocao: "locomocao",
  respiracao: "respiracao",
};

// ============================================================================
// NÍVEIS DE RISCO
// ============================================================================

export const RISK_LEVELS = {
  low: { label: "Baixo", color: "green" },
  medium: { label: "Médio", color: "yellow" },
  high: { label: "Alto", color: "red" },
} as const;

export type RiskLevel = keyof typeof RISK_LEVELS;

// ============================================================================
// LATERALIDADE
// ============================================================================

export const LATERALITY_OPTIONS = {
  bilateral: "Bilateral",
  unilateral: "Unilateral",
  alternado: "Alternado",
  "base assimétrica": "Base Assimétrica",
} as const;

// ============================================================================
// ESCALA DE NÍVEL NUMÉRICO (1-9)
// ============================================================================

export const NUMERIC_LEVEL_SCALE = {
  1: { label: "Nível 1", category: "Iniciante", description: "Exercícios básicos de aprendizado" },
  2: { label: "Nível 2", category: "Iniciante", description: "Progressão inicial com carga leve" },
  3: { label: "Nível 3", category: "Iniciante", description: "Fundamentos consolidados" },
  4: { label: "Nível 4", category: "Intermediário", description: "Introdução a padrões compostos" },
  5: { label: "Nível 5", category: "Intermediário", description: "Padrões compostos com carga" },
  6: { label: "Nível 6", category: "Intermediário", description: "Movimentos avançados introdutórios" },
  7: { label: "Nível 7", category: "Avançado", description: "Alta complexidade e carga" },
  8: { label: "Nível 8", category: "Avançado", description: "Performance e potência" },
  9: { label: "Nível 9", category: "Avançado", description: "Elite / competição" },
} as const;

export type NumericLevel = keyof typeof NUMERIC_LEVEL_SCALE;

// ============================================================================
// POSIÇÕES DE EXERCÍCIO
// ============================================================================

export const POSITION_OPTIONS = {
  em_pe: "Em pé",
  solo: "Solo",
  ajoelhado: "Ajoelhado",
  semi_ajoelhado: "Semi-ajoelhado",
  sentado: "Sentado",
  decubito_dorsal: "Decúbito Dorsal",
  decubito_ventral: "Decúbito Ventral",
  decubito_lateral: "Decúbito Lateral",
  quadrupede: "Quadrúpede",
  suspenso: "Suspenso",
  prancha: "Prancha",
} as const;

export type ExercisePosition = keyof typeof POSITION_OPTIONS;

// ============================================================================
// PLANOS DE MOVIMENTO
// ============================================================================

export const MOVEMENT_PLANES = {
  sagittal: "Sagital",
  frontal: "Frontal",
  transverse: "Transverso",
} as const;

// ============================================================================
// TIPOS DE CONTRAÇÃO
// ============================================================================

export const CONTRACTION_TYPES = {
  "Concêntrica": "Concêntrica",
  "Excêntrica": "Excêntrica",
  "Isométrica": "Isométrica",
  "Pliométrica / Potência": "Pliométrica / Potência",
  "Mista": "Mista",
} as const;

// ============================================================================
// NÍVEIS DE DIFICULDADE / ALUNOS
// ============================================================================

export const LEVEL_OPTIONS = {
  "Iniciante": "Iniciante",
  "Iniciante/Intermediário": "Iniciante/Intermediário",
  "Intermediário": "Intermediário",
  "Intermediário/Avançado": "Intermediário/Avançado",
  "Avançado": "Avançado",
  "Todos os níveis": "Todos os níveis",
} as const;

export const STUDENT_LEVELS = {
  iniciante: {
    name: "Iniciante",
    monthsTraining: { min: 0, max: 6 },
    plyometricsAllowed: false,
    maxRiskLevel: "medium" as RiskLevel,
  },
  intermediario: {
    name: "Intermediário",
    monthsTraining: { min: 6, max: 24 },
    plyometricsAllowed: true,
    maxRiskLevel: "medium" as RiskLevel,
  },
  avancado: {
    name: "Avançado",
    monthsTraining: { min: 24, max: Infinity },
    plyometricsAllowed: true,
    maxRiskLevel: "high" as RiskLevel,
  },
} as const;

export type StudentLevel = keyof typeof STUDENT_LEVELS;

// ============================================================================
// CICLOS DE PERIODIZAÇÃO (S1-S4) - NOVA ESTRUTURA
// ============================================================================

/**
 * Progressão do Mesociclo:
 * - S1 (Adaptação): Menor volume E menor intensidade
 * - S2 (Desenvolvimento): Volume aumenta até ideal, leve aumento de intensidade
 * - S3 (Choque 1): Mantém volume, aumenta intensidade (cargas)
 * - S4 (Choque 2): Mantém volume, pico de intensidade (cargas máximas)
 * 
 * Para treinos metabólicos: diminuir intervalo OU aumentar carga
 */
export const PERIODIZATION_CYCLES = {
  s1: {
    name: "Adaptação",
    weekNumber: 1,
    volumeMultiplier: 0.7, // 70% do volume ideal
    intensityMultiplier: 0.7, // 70% da intensidade ideal
    pseRange: { min: 5, max: 6 },
    description: "Menor volume e menor intensidade para adaptação neuromuscular",
    strategies: ["Reduzir séries", "Cargas leves", "Intervalos maiores"],
    methods: ["tradicional", "circuito"],
    plyometrics: false,
  },
  s2: {
    name: "Desenvolvimento",
    weekNumber: 2,
    volumeMultiplier: 1.0, // 100% do volume ideal
    intensityMultiplier: 0.85, // 85% da intensidade ideal
    pseRange: { min: 6, max: 7 },
    description: "Volume ideal atingido, leve aumento de intensidade",
    strategies: ["Volume prescrito", "Aumento gradual de carga"],
    methods: ["tradicional", "superset"],
    plyometrics: "low",
  },
  s3: {
    name: "Choque 1",
    weekNumber: 3,
    volumeMultiplier: 1.0, // Mantém volume
    intensityMultiplier: 0.95, // 95% da intensidade
    pseRange: { min: 7, max: 8 },
    description: "Aumento de intensidade via cargas",
    strategies: ["Aumentar cargas", "Manter volume", "Reduzir intervalo (metcon)"],
    methods: ["tradicional", "superset", "triset", "emom", "cluster"],
    plyometrics: true,
  },
  s4: {
    name: "Choque 2",
    weekNumber: 4,
    volumeMultiplier: 1.0, // Mantém volume
    intensityMultiplier: 1.0, // 100% intensidade
    pseRange: { min: 8, max: 9 },
    description: "Pico de intensidade do mesociclo",
    strategies: ["Cargas máximas do ciclo", "Manter volume", "Menor intervalo (metcon)"],
    methods: ["tradicional", "superset", "triset", "emom", "amrap", "for_time", "cluster"],
    plyometrics: true,
  },
} as const;

export type PeriodizationCycle = keyof typeof PERIODIZATION_CYCLES;

// ============================================================================
// ESTRATÉGIAS DE PROGRESSÃO PARA TREINOS METABÓLICOS
// ============================================================================

export const METCON_PROGRESSION_STRATEGIES = {
  reduceRest: {
    name: "Reduzir Intervalo",
    description: "Diminuir tempo de descanso entre séries/estações",
    applicableCycles: ["s3", "s4"] as PeriodizationCycle[],
  },
  increaseLoad: {
    name: "Aumentar Carga",
    description: "Aumentar peso nos exercícios",
    applicableCycles: ["s2", "s3", "s4"] as PeriodizationCycle[],
  },
  increaseReps: {
    name: "Aumentar Repetições",
    description: "Adicionar repetições mantendo carga",
    applicableCycles: ["s2"] as PeriodizationCycle[],
  },
  increaseDensity: {
    name: "Aumentar Densidade",
    description: "Mais trabalho no mesmo tempo",
    applicableCycles: ["s3", "s4"] as PeriodizationCycle[],
  },
} as const;

// ============================================================================
// VALÊNCIAS DE TREINO (4 valências - sem resistência muscular)
// ============================================================================

export const TRAINING_VALENCES = {
  potencia: "Potência",
  forca: "Força",
  hipertrofia: "Hipertrofia",
  condicionamento: "Condicionamento Metabólico",
} as const;

export type TrainingValence = keyof typeof TRAINING_VALENCES;

// Combinações válidas de valências (máx 2 por sessão)
export const VALID_VALENCE_COMBINATIONS: TrainingValence[][] = [
  ["potencia"],
  ["forca"],
  ["hipertrofia"],
  ["condicionamento"],
  ["potencia", "forca"],
  ["forca", "hipertrofia"],
  ["potencia", "condicionamento"],
  ["hipertrofia", "condicionamento"],
];

// ============================================================================
// FORMATOS DE SESSÃO
// ============================================================================

export const SESSION_FORMATS = {
  tradicional: {
    name: "Tradicional",
    duration: 55,
    phases: {
      preparacao: { min: 8, max: 10 },
      ativacao_core: { min: 5, max: 8 },
      principal: { min: 25, max: 30 },
      cooldown: { min: 5, max: 8 },
    },
    maxValences: 2,
    includeLMF: true,
  },
  time_efficient: {
    name: "Time Efficient",
    duration: 30,
    phases: {
      preparacao: { min: 5, max: 5 },
      principal: { min: 20, max: 22 },
      mindfulness: { min: 3, max: 5 },
    },
    maxValences: 1,
    includeLMF: false,
  },
} as const;

export type SessionFormat = keyof typeof SESSION_FORMATS;

// ============================================================================
// FASES DE AQUECIMENTO (6 ETAPAS)
// ============================================================================

export const WARMUP_PHASES = [
  { order: 1, name: "LMF", description: "Liberação Miofascial", duration: "2-3 min" },
  { order: 2, name: "Mobilidade Articular", description: "Tornozelo, quadril, coluna", duration: "2 min" },
  { order: 3, name: "Ativação Muscular", description: "Glúteos, escapular, core", duration: "2 min" },
  { order: 4, name: "Movimento Integrado", description: "Padrões básicos de movimento", duration: "2 min" },
  { order: 5, name: "Potencialização SNC", description: "Movimentos explosivos leves", duration: "1 min" },
  { order: 6, name: "Específico", description: "Preparação para exercício principal", duration: "1-2 min" },
] as const;

// ============================================================================
// FASES DE PLIOMETRIA (19 PROGRESSÕES)
// ============================================================================

export const PLYOMETRIC_PHASES = [
  // Bilateral Linear (1-5)
  { phase: 1, type: "bilateral_linear", name: "Salto no lugar", prerequisites: [] },
  { phase: 2, type: "bilateral_linear", name: "Pogo jump", prerequisites: [1] },
  { phase: 3, type: "bilateral_linear", name: "Box jump baixo", prerequisites: [2] },
  { phase: 4, type: "bilateral_linear", name: "Box jump médio", prerequisites: [3] },
  { phase: 5, type: "bilateral_linear", name: "Depth jump", prerequisites: [4] },
  
  // Unilateral Linear (6-11)
  { phase: 6, type: "unilateral_linear", name: "Single leg hop no lugar", prerequisites: [3] },
  { phase: 7, type: "unilateral_linear", name: "Single leg hop para frente", prerequisites: [6] },
  { phase: 8, type: "unilateral_linear", name: "Single leg bound", prerequisites: [7] },
  { phase: 9, type: "unilateral_linear", name: "Single leg box jump baixo", prerequisites: [8] },
  { phase: 10, type: "unilateral_linear", name: "Single leg box jump médio", prerequisites: [9] },
  { phase: 11, type: "unilateral_linear", name: "Single leg depth jump", prerequisites: [10] },
  
  // Unilateral Lateral (12-15)
  { phase: 12, type: "unilateral_lateral", name: "Lateral hop no lugar", prerequisites: [6] },
  { phase: 13, type: "unilateral_lateral", name: "Lateral bound", prerequisites: [12] },
  { phase: 14, type: "unilateral_lateral", name: "Skater jump", prerequisites: [13] },
  { phase: 15, type: "unilateral_lateral", name: "Lateral box jump", prerequisites: [14] },
  
  // Unilateral Lateral/Medial (16-19)
  { phase: 16, type: "unilateral_lateral_medial", name: "Hop lateral para medial", prerequisites: [12] },
  { phase: 17, type: "unilateral_lateral_medial", name: "Crossover hop", prerequisites: [16] },
  { phase: 18, type: "unilateral_lateral_medial", name: "Diagonal bound", prerequisites: [17] },
  { phase: 19, type: "unilateral_lateral_medial", name: "Reactive agility", prerequisites: [18] },
] as const;

// ============================================================================
// CORE TRIPLANAR - CATEGORIAS
// ============================================================================

export const CORE_TRIPLANAR = {
  anti_extensao: {
    name: "Anti-extensão",
    description: "Resiste à extensão lombar",
    examples: ["Prancha frontal", "Dead bug", "Rollout", "Body saw"],
  },
  anti_flexao_lateral: {
    name: "Anti-flexão Lateral",
    description: "Resiste à inclinação lateral",
    examples: ["Prancha lateral", "Farmer's carry unilateral", "Side plank row"],
  },
  anti_rotacao: {
    name: "Anti-rotação",
    description: "Resiste à rotação do tronco",
    examples: ["Pallof press", "Bird dog", "Renegade row", "Single arm press"],
  },
} as const;

export type CoreTriplanarType = keyof typeof CORE_TRIPLANAR;

// PATTERN_TO_CATEGORY removido — substituído por GROUP_TO_CATEGORY e PATTERN_TO_FUNCTIONAL_GROUP acima

// ============================================================================
// PIRÂMIDE MOBILIDADE/ESTABILIDADE
// ============================================================================

export const MOBILITY_STABILITY_PYRAMID = [
  { joint: "Pé", requirement: "Estável" },
  { joint: "Tornozelo", requirement: "Móvel" },
  { joint: "Joelho", requirement: "Estável" },
  { joint: "Quadril", requirement: "Móvel" },
  { joint: "Lombar", requirement: "Estável" },
  { joint: "Torácica", requirement: "Móvel" },
  { joint: "Escapular", requirement: "Estável" },
  { joint: "Ombro", requirement: "Móvel" },
] as const;

// ============================================================================
// ESTAÇÕES DE TREINO (Small Groups)
// ============================================================================

export const TRAINING_STATIONS = {
  a: {
    name: "Estação A",
    focus: "Membros Inferiores",
    patterns: ["dominancia_joelho", "dominancia_quadril"],
    description: "Dominância de joelho/quadril - foco em força, potência ou hipertrofia",
  },
  b: {
    name: "Estação B",
    focus: "Membros Superiores",
    patterns: ["empurrar_horizontal", "empurrar_vertical", "puxar_horizontal", "puxar_vertical"],
    description: "Empurrar/puxar - complementar à estação A",
  },
  c: {
    name: "Estação C",
    focus: "Core/Carry/Breath",
    patterns: ["core_anti_extensao", "core_anti_flexao_lateral", "core_anti_rotacao", "carregar"],
    description: "Core triplanar, carregamentos e respiração guiada",
    optional: true,
  },
} as const;

export type TrainingStation = keyof typeof TRAINING_STATIONS;

// ============================================================================
// MÉTODOS DE TREINO
// ============================================================================

export const TRAINING_METHODS = {
  tradicional: { name: "Tradicional", description: "Séries x repetições com descanso fixo" },
  superset: { name: "Superset", description: "2 exercícios alternados sem descanso" },
  triset: { name: "Triset", description: "3 exercícios alternados sem descanso" },
  circuito: { name: "Circuito", description: "Múltiplos exercícios em sequência" },
  emom: { name: "EMOM", description: "Every Minute On the Minute" },
  amrap: { name: "AMRAP", description: "As Many Rounds As Possible" },
  for_time: { name: "For Time", description: "Completar tarefas no menor tempo" },
  cluster: { name: "Cluster", description: "Mini-séries com micro-descansos" },
  complexo: { name: "Complexo", description: "Mesma barra, múltiplos movimentos" },
  rest_pause: { name: "Rest-Pause", description: "Pausas curtas para estender série" },
  drop_set: { name: "Drop Set", description: "Redução de carga sem descanso" },
} as const;

export type TrainingMethod = keyof typeof TRAINING_METHODS;

// ============================================================================
// HELPERS
// ============================================================================

export const getVolumeForCycle = (baseVolume: number, cycle: PeriodizationCycle): number => {
  return Math.round(baseVolume * PERIODIZATION_CYCLES[cycle].volumeMultiplier);
};

export const getIntensityForCycle = (baseIntensity: number, cycle: PeriodizationCycle): number => {
  return Math.round(baseIntensity * PERIODIZATION_CYCLES[cycle].intensityMultiplier);
};

export const isValidValenceCombination = (valences: TrainingValence[]): boolean => {
  if (valences.length === 0 || valences.length > 2) return false;
  
  return VALID_VALENCE_COMBINATIONS.some(
    (combo) =>
      combo.length === valences.length &&
      combo.every((v) => valences.includes(v))
  );
};

export const canUsePlyometrics = (level: StudentLevel, cycle: PeriodizationCycle): boolean => {
  const levelConfig = STUDENT_LEVELS[level];
  const cycleNumber = PERIODIZATION_CYCLES[cycle].weekNumber;
  
  return levelConfig.plyometricsAllowed && cycleNumber >= 2;
};

export const getMethodsForCycle = (cycle: PeriodizationCycle): TrainingMethod[] => {
  const cycleMethods = PERIODIZATION_CYCLES[cycle].methods;
  return cycleMethods as unknown as TrainingMethod[];
};
