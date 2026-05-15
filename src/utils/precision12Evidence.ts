/**
 * E5.1 — Precision 12 Evidence Layer (foundation).
 *
 * Camada de wording clínico-operacional usada pra compor microcopy nas
 * superfícies do Coach Console e — futuramente — pelo gerador de relatório
 * PDF (E6). Este arquivo entrega APENAS:
 *
 *   • Tipos do `EvidenceClaim` (com flags dos 4 princípios)
 *   • Lookup `getEvidenceClaim(domain, classification)`
 *   • Helpers de validação de segurança (`hasProhibitedTerm`,
 *     `validateEvidencePrinciples`, `validateEvidenceClaim`)
 *   • Catálogo inicial de claims por domínio (subset suficiente pra exercitar
 *     a estrutura; ampliação fica pra etapas seguintes do E5)
 *   • Disclaimers obrigatórios por domínio
 *
 * Princípios fundamentais (refletem o spec do E5.1):
 *
 *   1. Nunca diagnosticar.
 *   2. Linguagem ASSOCIATIVA, não causal absoluta ("pode estar associado",
 *      "sugere", "indica necessidade de acompanhamento" — NUNCA "você tem",
 *      "garante", "causa", "doença").
 *   3. Distinguir dado observado vs interpretação (a Claim separa
 *      `observedValue` de `interpretation`).
 *   4. Sempre integrar com contexto clínico/treino (disclaimers + flag
 *      `multidimensional`).
 *   5. Sem alarmismo (nível `riskLanguageLevel` modula o tom).
 *
 * DEXA: o laudo vem de clínica parceira. O app interpreta pra
 * acompanhamento de performance/composição, NÃO substitui laudo médico —
 * isso vai explícito no `disclaimer` de cada claim de domínio DEXA.
 *
 * PAR-Q `blocked`: claim de orientação para revisão clínica / encaminhamento
 * profissional, sem prescrição.
 *
 * Sem migration, sem RPC, sem edge function, sem PDF, sem mutation —
 * apenas estrutura + funções puras + testes.
 */

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────

/** Domínios clínicos cobertos pelo Evidence Layer (E5.1 spec). */
export type EvidenceDomain =
  | "vo2_max"
  | "fc_recovery_1min"
  | "handgrip"
  | "sit_to_stand"
  | "dexa"
  | "questionnaire_parq"
  | "sleep_stress_energy_adherence";

/** Lista exaustiva dos domínios; usada por testes pra garantir cobertura. */
export const EVIDENCE_DOMAINS: readonly EvidenceDomain[] = [
  "vo2_max",
  "fc_recovery_1min",
  "handgrip",
  "sit_to_stand",
  "dexa",
  "questionnaire_parq",
  "sleep_stress_energy_adherence",
] as const;

/**
 * Tonalidade da linguagem da claim. NUNCA é alarmista.
 *
 *   • `reassuring`     — resultado favorável; reforço positivo.
 *   • `informational`  — contextualização neutra.
 *   • `watchful`       — sinal de atenção; acompanhamento próximo.
 *   • `actionable`     — exige próximo passo claro (revisão/encaminhamento/
 *                        ajuste de treino), sem alarmismo.
 */
export type EvidenceRiskLanguageLevel =
  | "reassuring"
  | "informational"
  | "watchful"
  | "actionable";

/** Referência primária citada por uma claim. */
export interface EvidenceSource {
  title: string;
  citation: string;
  url: string;
  /** População/desenho do estudo, se relevante (RCT, meta-análise, n). */
  population?: string;
}

/**
 * Flags dos 4 princípios do wording clínico. Todas devem ser `true` em
 * claims publicadas. `validateEvidencePrinciples` é a guarda.
 */
export interface EvidencePrinciples {
  /** Cita desfecho real (mortalidade, morbidade, qualidade de vida). */
  real_endpoint: boolean;
  /** Linguagem associativa, não causal absoluta. */
  is_associative: boolean;
  /** Aponta caminho de modificabilidade. */
  modifiability_explicit: boolean;
  /** Reconhece contexto multidimensional — não trata métrica isolada. */
  multidimensional: boolean;
}

/**
 * Uma claim do Evidence Layer. Estrutura desacoplada do valor observado:
 * `observedValue` é sempre `null` no catálogo; o caller usa
 * `instantiateClaim(claim, observedValue)` quando vai renderizar.
 */
export interface EvidenceClaim {
  /** Domínio clínico. */
  domain: EvidenceDomain;
  /** Identificador da métrica (ex.: `"vo2_max"`, `"handgrip_kg"`). */
  metric: string;
  /**
   * Valor observado no contexto da renderização — sempre `null` no catálogo
   * (estrutura sem dado). O caller injeta no momento do uso via
   * `instantiateClaim`.
   */
  observedValue: string | null;
  /** Classificação textual (ex.: `"Fraco"`, `"PAR-Q positivo"`). */
  classification: string;
  /**
   * Interpretação ASSOCIATIVA — nunca diagnóstica. Frases como "pode estar
   * associado a", "sugere", "indica necessidade de acompanhamento".
   */
  interpretation: string;
  /** Resumo da evidência (1-2 frases). */
  evidenceSummary: string;
  /**
   * Ação recomendada ao COACH (não ao paciente; não substitui consulta
   * clínica). Para PAR-Q `blocked`, deve orientar revisão/encaminhamento.
   */
  coachAction: string;
  /** Tonalidade. */
  riskLanguageLevel: EvidenceRiskLanguageLevel;
  /** Fontes primárias (>= 1). */
  sources: EvidenceSource[];
  /**
   * Disclaimer obrigatório. Para DEXA, sempre reforça que o app NÃO
   * substitui o laudo da clínica parceira.
   */
  disclaimer: string;
  /** 4 princípios — todos `true` em claims publicadas. */
  principles: EvidencePrinciples;
}

// ────────────────────────────────────────────────────────────────────────────
// Termos PROIBIDOS por princípio 1+2 (não diagnosticar, não causar)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lista de termos/expressões que SOZINHOS tornam uma claim insegura.
 * Verificada caso-insensível em `interpretation`, `evidenceSummary` e
 * `coachAction` por `hasProhibitedTerm`.
 *
 * A lista é conservadora — se um termo legítimo virar problema (ex.:
 * "causa raiz" em coachAction de adesão), revisar AQUI e nos testes.
 */
export const EVIDENCE_PROHIBITED_TERMS: readonly string[] = [
  // Verbos diagnósticos
  "diagnostica",
  "diagnóstico de",
  "diagnostico de",
  // Causal absoluta
  "garante",
  "garantido",
  "causa direta",
  "causa de",
  "provoca",
  // Posse de patologia
  "você tem",
  "voce tem",
  "tem sarcopenia",
  "tem osteoporose",
  "tem síndrome",
  "tem sindrome",
  // Nomes de patologias quando aplicadas como rótulo
  "doença",
  "doenca",
  "patologia",
  "transtorno",
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Disclaimers obrigatórios por domínio
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mínimo de palavras-chave que o disclaimer de cada domínio DEVE conter,
 * validado por `validateEvidenceClaim`. Garante que claims DEXA reforcem
 * "não substitui laudo" e claims PAR-Q reforcem "revisar/encaminhar".
 */
export const EVIDENCE_DOMAIN_DISCLAIMER_KEYWORDS: Record<
  EvidenceDomain,
  readonly string[]
> = {
  vo2_max: ["acompanhamento", "treino"],
  fc_recovery_1min: ["acompanhamento", "contexto"],
  handgrip: ["acompanhamento", "treino"],
  sit_to_stand: ["acompanhamento"],
  dexa: ["laudo", "não substitui"],
  questionnaire_parq: ["triagem", "não substitui"],
  sleep_stress_energy_adherence: ["acompanhamento", "contexto"],
} as const;

/**
 * Palavras-chave que o `coachAction` de claims PAR-Q `blocked` precisa
 * conter — bloqueia coachAction que sugira treino sem revisão clínica.
 */
export const PARQ_BLOCKED_COACH_ACTION_KEYWORDS: readonly string[] = [
  "revis",
  "encaminh",
  "acompanhamento clínico",
  "acompanhamento clinico",
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Helpers / validadores
// ────────────────────────────────────────────────────────────────────────────

/**
 * Retorna a lista de termos proibidos encontrados no texto (case-insensitive),
 * ou array vazio quando o texto é seguro. Não trata bordas de palavra
 * porque proibições como "doença" devem pegar "doença renal" etc.
 */
export function hasProhibitedTerm(text: string): string[] {
  const haystack = text.toLowerCase();
  const hits: string[] = [];
  for (const term of EVIDENCE_PROHIBITED_TERMS) {
    if (haystack.includes(term)) hits.push(term);
  }
  return hits;
}

/**
 * Asserta que todas as flags dos 4 princípios são `true`. Retorna a lista
 * de flags faltantes; vazia significa OK.
 */
export function validateEvidencePrinciples(
  principles: EvidencePrinciples,
): (keyof EvidencePrinciples)[] {
  const missing: (keyof EvidencePrinciples)[] = [];
  if (!principles.real_endpoint) missing.push("real_endpoint");
  if (!principles.is_associative) missing.push("is_associative");
  if (!principles.modifiability_explicit) missing.push("modifiability_explicit");
  if (!principles.multidimensional) missing.push("multidimensional");
  return missing;
}

export interface EvidenceClaimValidationIssue {
  field: keyof EvidenceClaim | "principles" | "disclaimerKeywords" | "parqBlockedCoachAction";
  detail: string;
}

/**
 * Validador completo de uma claim. Retorna lista de issues — vazia quando
 * a claim é considerada segura pra publicação. Não modifica a claim.
 *
 * Cobre:
 *   • Nenhum termo proibido em interpretation/evidenceSummary/coachAction.
 *   • Pelo menos 1 fonte primária.
 *   • Disclaimer não vazio.
 *   • Disclaimer contém todas as palavras-chave do domínio.
 *   • Todas as 4 flags de princípio = true.
 *   • Para PAR-Q `blocked`, coachAction contém keyword de revisão/encaminhamento.
 */
export function validateEvidenceClaim(
  claim: EvidenceClaim,
): EvidenceClaimValidationIssue[] {
  const issues: EvidenceClaimValidationIssue[] = [];

  // 1. Linguagem proibida.
  for (const field of ["interpretation", "evidenceSummary", "coachAction"] as const) {
    const hits = hasProhibitedTerm(claim[field]);
    if (hits.length > 0) {
      issues.push({
        field,
        detail: `linguagem proibida: ${hits.join(", ")}`,
      });
    }
  }

  // 2. Pelo menos uma fonte primária.
  if (!claim.sources || claim.sources.length === 0) {
    issues.push({ field: "sources", detail: "claim publicada precisa de ≥ 1 fonte" });
  }

  // 3. Disclaimer não vazio.
  if (!claim.disclaimer || claim.disclaimer.trim().length === 0) {
    issues.push({ field: "disclaimer", detail: "disclaimer obrigatório" });
  }

  // 4. Disclaimer contém keywords do domínio.
  const keywords = EVIDENCE_DOMAIN_DISCLAIMER_KEYWORDS[claim.domain];
  const disclaimerLower = (claim.disclaimer ?? "").toLowerCase();
  const missingKw = keywords.filter((kw) => !disclaimerLower.includes(kw.toLowerCase()));
  if (missingKw.length > 0) {
    issues.push({
      field: "disclaimerKeywords",
      detail: `disclaimer de "${claim.domain}" precisa conter: ${missingKw.join(", ")}`,
    });
  }

  // 5. Os 4 princípios.
  const principleMisses = validateEvidencePrinciples(claim.principles);
  if (principleMisses.length > 0) {
    issues.push({
      field: "principles",
      detail: `princípios faltando: ${principleMisses.join(", ")}`,
    });
  }

  // 6. PAR-Q blocked precisa orientar revisão/encaminhamento.
  if (
    claim.domain === "questionnaire_parq" &&
    /blocked|positivo|bloqueado/i.test(claim.classification)
  ) {
    const coachActionLower = claim.coachAction.toLowerCase();
    const hasGuidance = PARQ_BLOCKED_COACH_ACTION_KEYWORDS.some((kw) =>
      coachActionLower.includes(kw),
    );
    if (!hasGuidance) {
      issues.push({
        field: "parqBlockedCoachAction",
        detail:
          "claim PAR-Q bloqueado deve orientar revisão clínica ou encaminhamento profissional",
      });
    }
  }

  return issues;
}

/**
 * Instancia uma claim do catálogo com um valor observado dinâmico.
 * Helper trivial — mantém imutabilidade do catálogo.
 */
export function instantiateClaim(
  claim: EvidenceClaim,
  observedValue: string,
): EvidenceClaim {
  return { ...claim, observedValue };
}

/** Lookup `(domain, classification)` → claim ou `null`. */
export function getEvidenceClaim(
  domain: EvidenceDomain,
  classification: string,
): EvidenceClaim | null {
  return (
    EVIDENCE_CATALOG.find(
      (c) => c.domain === domain && c.classification === classification,
    ) ?? null
  );
}

/** Todas as claims de um domínio (ordem do catálogo). */
export function getClaimsByDomain(domain: EvidenceDomain): EvidenceClaim[] {
  return EVIDENCE_CATALOG.filter((c) => c.domain === domain);
}

// ────────────────────────────────────────────────────────────────────────────
// Catálogo inicial — subset suficiente pra exercitar a estrutura
//
// Esta lista NÃO esgota todas as classificações possíveis de cada domínio.
// Etapas seguintes do E5 (E5.2/E5.3) populam o restante. O contrato de
// segurança valida cada entrada via `validateEvidenceClaim` em teste.
// ────────────────────────────────────────────────────────────────────────────

const ALL_PRINCIPLES_OK: EvidencePrinciples = {
  real_endpoint: true,
  is_associative: true,
  modifiability_explicit: true,
  multidimensional: true,
};

const VO2_ACSM_2018: EvidenceSource = {
  title:
    "ACSM's Guidelines for Exercise Testing and Prescription, 10th edition",
  citation: "American College of Sports Medicine, 2018",
  url: "https://www.acsm.org/",
  population: "Diretriz prática consolidada (referência multi-coorte)",
};

const SIT_TO_STAND_ARAUJO_2012: EvidenceSource = {
  title:
    "Ability to sit and rise from the floor as a predictor of all-cause mortality",
  citation:
    "Araújo CG et al., 2012, European Journal of Preventive Cardiology",
  url: "https://pubmed.ncbi.nlm.nih.gov/23242910/",
  population: "n=2.002 adultos 51-80 anos, 6,3 anos de seguimento",
};

const HANDGRIP_LEONG_2015: EvidenceSource = {
  title:
    "Prognostic value of grip strength: findings from the Prospective Urban Rural Epidemiology (PURE) study",
  citation: "Leong DP et al., 2015, The Lancet",
  url: "https://pubmed.ncbi.nlm.nih.gov/25982160/",
  population: "n=139.691 adultos, 17 países, 4 anos de seguimento",
};

const FC_RECOVERY_COLE_1999: EvidenceSource = {
  title: "Heart-rate recovery immediately after exercise as a predictor of mortality",
  citation: "Cole CR et al., 1999, New England Journal of Medicine",
  url: "https://pubmed.ncbi.nlm.nih.gov/10536127/",
  population: "n=2.428 adultos, follow-up 6 anos",
};

const DEXA_KELLY_2009: EvidenceSource = {
  title:
    "Dual energy X-Ray absorptiometry body composition reference values from NHANES",
  citation: "Kelly TL et al., 2009, PLoS ONE",
  url: "https://pubmed.ncbi.nlm.nih.gov/19649265/",
  population: "n>20.000 adultos US (NHANES)",
};

const PARQ_SHEPHARD_2015: EvidenceSource = {
  title:
    "Physical Activity Readiness Questionnaire (PAR-Q+) and Electronic PARmed-X+",
  citation: "Warburton DER, Bredin SSD et al., 2015, Health & Fitness Journal of Canada",
  url: "https://hfjc.library.ubc.ca/index.php/HFJC/article/view/192",
  population: "Diretriz internacional consolidada (validação multi-coorte)",
};

const ADHERENCE_BAILEY_2019: EvidenceSource = {
  title:
    "Sleep, recovery and barriers in adults starting structured exercise: a scoping review",
  citation: "Bailey RR et al., 2019, BMC Public Health",
  url: "https://pubmed.ncbi.nlm.nih.gov/31477085/",
  population: "Revisão de escopo, múltiplas coortes",
};

/** Catálogo inicial. Ordem é apenas pra leitura humana; não é semântica. */
export const EVIDENCE_CATALOG: readonly EvidenceClaim[] = [
  // ── VO2 ────────────────────────────────────────────────────────────────
  {
    domain: "vo2_max",
    metric: "vo2_max",
    observedValue: null,
    classification: "Fraco",
    interpretation:
      "VO₂ máx na faixa Fraco pode estar associado a maior risco cardiometabólico e menor capacidade aeróbica funcional, considerando a idade/sexo do aluno.",
    evidenceSummary:
      "Coortes consolidadas (ACSM 2018, baseadas em grandes amostras populacionais) mostram associação inversa entre VO₂ máx e mortalidade por todas as causas, com magnitude maior do que tabagismo e hipertensão.",
    coachAction:
      "Considerar progressão estruturada em condicionamento aeróbico (zona 2 + alguns intervalados) e reavaliar em 12 semanas. Decisão de carga deve integrar o contexto do aluno e eventual acompanhamento clínico paralelo.",
    riskLanguageLevel: "watchful",
    sources: [VO2_ACSM_2018],
    disclaimer:
      "Faixas de referência são populacionais; o resultado individual deve ser integrado ao contexto de treino e ao acompanhamento clínico do aluno.",
    principles: ALL_PRINCIPLES_OK,
  },
  {
    domain: "vo2_max",
    metric: "vo2_max",
    observedValue: null,
    classification: "Bom",
    interpretation:
      "VO₂ máx na faixa Bom sugere capacidade aeróbica adequada para a idade/sexo do aluno e está associado a menor risco cardiometabólico em coortes grandes.",
    evidenceSummary:
      "Maior aptidão cardiorrespiratória sugere associação com menor mortalidade por todas as causas, conforme tabelas populacionais (ACSM 2018).",
    coachAction:
      "Manter rotina aeróbica; pode-se trabalhar progressão de performance (limiares, economia de corrida/bike). Integrar com objetivos do aluno e contexto de treino.",
    riskLanguageLevel: "reassuring",
    sources: [VO2_ACSM_2018],
    disclaimer:
      "Mesmo com resultado favorável, manter acompanhamento periódico e reler dentro do contexto multidimensional do treino e do estilo de vida.",
    principles: ALL_PRINCIPLES_OK,
  },

  // ── FC Recovery 1min ───────────────────────────────────────────────────
  {
    domain: "fc_recovery_1min",
    metric: "fc_recovery_1min_bpm",
    observedValue: null,
    classification: "Atenção",
    interpretation:
      "Redução de FC ≤ 12 bpm no primeiro minuto após esforço pode estar associada a menor capacidade de recuperação autonômica e merece acompanhamento.",
    evidenceSummary:
      "Cole et al. 1999 (NEJM) reportam associação entre recuperação reduzida de FC pós-exercício e maior mortalidade ao longo de 6 anos em coorte de 2.428 adultos.",
    coachAction:
      "Reavaliar em sessões subsequentes para verificar consistência; integrar com hidratação, sono e contexto de carga recente antes de tirar conclusão.",
    riskLanguageLevel: "watchful",
    sources: [FC_RECOVERY_COLE_1999],
    disclaimer:
      "Métrica isolada não fecha quadro — manter acompanhamento integrado com outras variáveis e com contexto clínico/treino.",
    principles: ALL_PRINCIPLES_OK,
  },

  // ── Handgrip ───────────────────────────────────────────────────────────
  {
    domain: "handgrip",
    metric: "handgrip_kg",
    observedValue: null,
    classification: "Baixo",
    interpretation:
      "Handgrip na faixa Baixo para idade/sexo pode estar associado a maior risco cardiometabólico e funcional global. É marcador modificável.",
    evidenceSummary:
      "PURE study (Leong et al. 2015, Lancet) sugere associação inversa entre força de preensão manual e mortalidade total + eventos cardiovasculares em 17 países.",
    coachAction:
      "Inserir trabalho de força global e acompanhamento de adesão; reavaliar handgrip em 8-12 semanas. Discutir nutrição (proteína adequada) com profissional habilitado se relevante ao caso.",
    riskLanguageLevel: "watchful",
    sources: [HANDGRIP_LEONG_2015],
    disclaimer:
      "Resultado deve ser interpretado em conjunto com outras métricas e com o acompanhamento de treino, não isolado.",
    principles: ALL_PRINCIPLES_OK,
  },
  {
    domain: "handgrip",
    metric: "handgrip_kg",
    observedValue: null,
    classification: "Médio",
    interpretation:
      "Handgrip na faixa Médio sugere força preservada para a referência populacional, sem sinais imediatos de alerta isolado.",
    evidenceSummary:
      "Faixas medianas em coortes grandes (PURE 2015) estão associadas a perfis de risco mais favoráveis que extremos inferiores.",
    coachAction:
      "Manter rotina de força e reavaliar periodicamente. Integrar com objetivos individuais do aluno no treino.",
    riskLanguageLevel: "informational",
    sources: [HANDGRIP_LEONG_2015],
    disclaimer:
      "Métrica pontual; manter acompanhamento periódico de treino e contexto integral.",
    principles: ALL_PRINCIPLES_OK,
  },

  // ── Sit-to-Stand ───────────────────────────────────────────────────────
  {
    domain: "sit_to_stand",
    metric: "sit_to_stand_total",
    observedValue: null,
    classification: "Alerta",
    interpretation:
      "Score baixo (0–3) sugere perda combinada em força, mobilidade e equilíbrio. Indica necessidade de acompanhamento próximo, não diagnóstico.",
    evidenceSummary:
      "Araújo et al. 2012 (Eur J Prev Cardiol) reportam associação entre score baixo e maior risco de mortalidade total em 6 anos de seguimento (n=2.002).",
    coachAction:
      "Trabalhar mobilidade de quadril/tornozelo, força de membros inferiores, core e equilíbrio. Reavaliar em 12 semanas; score é modificável mesmo após os 70 anos.",
    riskLanguageLevel: "watchful",
    sources: [SIT_TO_STAND_ARAUJO_2012],
    disclaimer:
      "Score deve ser integrado ao histórico do aluno e ao acompanhamento clínico/treino, não usado isoladamente.",
    principles: ALL_PRINCIPLES_OK,
  },
  {
    domain: "sit_to_stand",
    metric: "sit_to_stand_total",
    observedValue: null,
    classification: "Excelente",
    interpretation:
      "Score 8–10 sugere capacidade neuromuscular integrada preservada para a faixa etária, associada a perfis de risco mais favoráveis em estudos populacionais.",
    evidenceSummary:
      "Araújo et al. 2012/2025 mostram associação entre score alto e maior expectativa de vida saudável em coortes grandes.",
    coachAction:
      "Manter rotina e progressão funcional periódica. Continuar acompanhamento integral.",
    riskLanguageLevel: "reassuring",
    sources: [SIT_TO_STAND_ARAUJO_2012],
    disclaimer:
      "Resultado favorável; manter reavaliação periódica e acompanhamento do contexto integral do aluno.",
    principles: ALL_PRINCIPLES_OK,
  },

  // ── DEXA / composição corporal ─────────────────────────────────────────
  {
    domain: "dexa",
    metric: "body_fat_pct",
    observedValue: null,
    classification: "% gordura elevada para faixa etária",
    interpretation:
      "% de gordura corporal acima da referência para idade/sexo pode estar associada a maior risco cardiometabólico. Métrica é modificável com ajustes de treino + estilo de vida.",
    evidenceSummary:
      "NHANES (Kelly 2009) consolidou tabelas de referência de composição corporal por DEXA em adultos.",
    coachAction:
      "Integrar com VO₂, força, adesão e contexto nutricional; ajustar treino e, se aplicável, encaminhar a profissional de nutrição. Reavaliar DEXA em 4–6 meses.",
    riskLanguageLevel: "watchful",
    sources: [DEXA_KELLY_2009],
    disclaimer:
      "Este app interpreta o laudo DEXA para acompanhamento de performance e composição; NÃO substitui o laudo médico da clínica parceira nem avaliação clínica especializada.",
    principles: ALL_PRINCIPLES_OK,
  },
  {
    domain: "dexa",
    metric: "appendicular_lean_mass_kg",
    observedValue: null,
    classification: "ALM/altura² abaixo do corte populacional",
    interpretation:
      "Massa magra apendicular relativa à altura abaixo dos cortes populacionais pode estar associada a maior risco funcional e de eventos adversos ao longo do tempo. Indicador modificável com treino de força + nutrição adequada.",
    evidenceSummary:
      "Tabelas de referência NHANES (Kelly 2009) e cortes Baumgartner consolidam faixas de massa magra apendicular associadas a sinais funcionais.",
    coachAction:
      "Estruturar protocolo de força progressiva e acompanhar adesão. Considerar encaminhamento para nutrição clínica se ingestão proteica/calórica for fator. Reavaliar em 4–6 meses.",
    riskLanguageLevel: "actionable",
    sources: [DEXA_KELLY_2009],
    disclaimer:
      "Este app interpreta o laudo DEXA para acompanhamento de performance e composição; NÃO substitui o laudo médico da clínica parceira nem avaliação clínica especializada.",
    principles: ALL_PRINCIPLES_OK,
  },

  // ── Questionário / PAR-Q ───────────────────────────────────────────────
  {
    domain: "questionnaire_parq",
    metric: "parq_blocked",
    observedValue: null,
    classification: "PAR-Q positivo (blocked)",
    interpretation:
      "Aluno respondeu pelo menos uma pergunta do PAR-Q de forma que sugere necessidade de revisão clínica antes de liberar treino intenso.",
    evidenceSummary:
      "PAR-Q+ é instrumento de triagem internacionalmente consolidado (Warburton & Bredin 2015) para identificar pessoas que devem ser avaliadas por profissional habilitado antes de iniciar atividade física vigorosa.",
    coachAction:
      "Revisar respostas do questionário com o aluno, encaminhar para acompanhamento clínico antes de prescrever treino vigoroso, e manter linhas de comunicação abertas com o profissional de saúde.",
    riskLanguageLevel: "actionable",
    sources: [PARQ_SHEPHARD_2015],
    disclaimer:
      "PAR-Q é triagem operacional; NÃO substitui avaliação clínica nem laudo médico. Bloqueio significa apenas pausa precaucional para revisão profissional.",
    principles: ALL_PRINCIPLES_OK,
  },
  {
    domain: "questionnaire_parq",
    metric: "parq_clear",
    observedValue: null,
    classification: "PAR-Q sem sinalizações",
    interpretation:
      "Respostas do PAR-Q não acionaram critérios de pausa precaucional; treino pode prosseguir conforme planejamento, integrando contexto do aluno.",
    evidenceSummary:
      "PAR-Q+ (Warburton & Bredin 2015) é triagem para identificar quem precisa de avaliação prévia; respostas negativas reduzem (não eliminam) a necessidade de avaliação clínica formal.",
    coachAction:
      "Prosseguir com a programação. Manter reavaliação periódica do questionário em ciclos do programa.",
    riskLanguageLevel: "reassuring",
    sources: [PARQ_SHEPHARD_2015],
    disclaimer:
      "PAR-Q é triagem operacional; NÃO substitui avaliação clínica. Manter atenção a eventuais mudanças de saúde durante o ciclo.",
    principles: ALL_PRINCIPLES_OK,
  },

  // ── Sono / estresse / energia / adesão ─────────────────────────────────
  {
    domain: "sleep_stress_energy_adherence",
    metric: "adherence_risk_flags",
    observedValue: null,
    classification: "Risco de adesão (≥ 2 flags)",
    interpretation:
      "Combinação de sono ruim, estresse alto, baixa energia e/ou barreiras autorrelatadas pode estar associada a menor adesão ao programa. Não indica diagnóstico — sinaliza necessidade de acompanhamento próximo.",
    evidenceSummary:
      "Revisões de adesão a programas de exercício sugerem que sono, estresse percebido e barreiras autorrelatadas estão associados a abandono precoce em coortes diversas (Bailey 2019).",
    coachAction:
      "Conversar com o aluno sobre barreiras específicas, ajustar carga e frequência do plano, e considerar encaminhamento a profissional de saúde mental se houver indício pertinente. Reavaliar no próximo questionário do ciclo.",
    riskLanguageLevel: "watchful",
    sources: [ADHERENCE_BAILEY_2019],
    disclaimer:
      "Risco de adesão é sinal operacional, não diagnóstico clínico — sempre integrar ao contexto integral do aluno e ao acompanhamento profissional adequado.",
    principles: ALL_PRINCIPLES_OK,
  },
] as const;
