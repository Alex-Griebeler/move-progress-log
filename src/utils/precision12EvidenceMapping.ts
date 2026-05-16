/**
 * E5.5 — Mapeamento de dados crus (do hook `usePrecision12CoachConsole`)
 * para `Precision12EvidenceInput`, consumível pelo derivador E5.3.
 *
 * Apenas funções PURAS. Sem fetch novo, sem hook, sem mutation.
 *
 * Escopo conservador desta rodada: cobre **PAR-Q + Adesão**, derivados de
 * `questionnaire_responses` (já carregado pelo hook E4.1). Domínios
 * restantes ficam como limitação documentada (ver
 * `LIMITATIONS_NOT_COVERED_YET` ao final):
 *
 *   - VO₂ / Handgrip / Sit-to-Stand: o hook não carrega
 *     `vo2_results` / `handgrip_results` / `sit_to_stand_results` nem
 *     ref ranges (`classification.ts` exige lookup populacional por
 *     sexo/idade). Adicionar fetch + ranges é um PR separado.
 *
 *   - DEXA: o hook JÁ carrega `dexa_results` (E4.6), mas a classificação
 *     ("% gordura elevada para faixa etária", etc.) exige cortes
 *     populacionais por sexo/idade. Sem ranges, qualquer label viraria
 *     heurística sem base — preferimos NÃO emitir do que emitir errado.
 *
 * Quando esses ranges entrarem, basta adicionar mais mappers aqui — a
 * arquitetura é composicional (cada mapper monta uma fatia do
 * `Precision12EvidenceInput`).
 */

import {
  ADHERENCE_RISK_BARRIERS,
  ADHERENCE_RISK_MIN_FLAGS,
  ADHERENCE_RISK_THRESHOLDS,
  type CoachConsoleAssessment,
  type CoachConsoleQuestionnaire,
  type CoachConsoleStudent,
} from "./precision12CoachConsole";
import {
  deriveEvidenceClaims,
  type Precision12EvidenceInput,
} from "./precision12EvidenceDerivation";
import type { EvidenceClaim } from "./precision12Evidence";

// ────────────────────────────────────────────────────────────────────────────
// Mapping helpers (PURE)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Conta as flags individuais de risco de adesão presentes numa resposta.
 * Espelha a lógica de `countAdherenceRiskFlags` interna do E4.1, exposta
 * aqui de forma granular pra alimentar o `Precision12EvidenceInput`
 * (`adherence.{sleep,stress,energy,barrier}Flag` + `riskFlagCount`).
 *
 * Critério (escala 1–5, ver `ADHERENCE_RISK_THRESHOLDS`):
 *   - sleepFlag    ← sleep_quality <= 2
 *   - stressFlag   ← stress_level >= 4
 *   - energyFlag   ← energy_level <= 2
 *   - barrierFlag  ← primary_adherence_barrier ∈ ADHERENCE_RISK_BARRIERS
 *
 * `riskFlagCount` é a soma das 4 flags acima (NÃO inclui outras flags
 * do questionário como pain_status ou consistency_self_rating, pra manter
 * o domínio "sleep_stress_energy_adherence" coeso com o catálogo E5.1/E5.2).
 */
export function deriveAdherenceFlagsFromResponse(
  response: CoachConsoleQuestionnaire,
): {
  sleepFlag: boolean;
  stressFlag: boolean;
  energyFlag: boolean;
  barrierFlag: boolean;
  riskFlagCount: number;
} {
  const sleepFlag =
    response.sleep_quality != null &&
    response.sleep_quality <= ADHERENCE_RISK_THRESHOLDS.sleepQualityAtMost;
  const stressFlag =
    response.stress_level != null &&
    response.stress_level >= ADHERENCE_RISK_THRESHOLDS.stressLevelAtLeast;
  const energyFlag =
    response.energy_level != null &&
    response.energy_level <= ADHERENCE_RISK_THRESHOLDS.energyLevelAtMost;
  const barrierFlag =
    response.primary_adherence_barrier != null &&
    ADHERENCE_RISK_BARRIERS.includes(response.primary_adherence_barrier);

  const riskFlagCount =
    Number(sleepFlag) +
    Number(stressFlag) +
    Number(energyFlag) +
    Number(barrierFlag);

  return { sleepFlag, stressFlag, energyFlag, barrierFlag, riskFlagCount };
}

/**
 * Converte uma resposta de questionário em `Precision12EvidenceInput`
 * preenchendo só os subdomínios suportados nesta rodada (PAR-Q + Adesão).
 *
 * `response === null/undefined` → input vazio (sem PAR-Q nem adesão).
 * `parq_blocked` nulo → não emite PAR-Q (preserva semântica E5.3:
 *   `null/undefined` → sem claim).
 */
export function mapQuestionnaireResponseToEvidenceInput(
  response: CoachConsoleQuestionnaire | null | undefined,
): Precision12EvidenceInput {
  if (!response) return {};

  const adherence = deriveAdherenceFlagsFromResponse(response);

  // Threshold de "risco agregado" alinhado ao E4.1 (`ADHERENCE_RISK_MIN_FLAGS`).
  // Quando abaixo do mínimo, omitimos riskFlagCount pra evitar emissão de
  // claim agregada quando só há 1 sinal isolado.
  const riskFlagCountForInput =
    adherence.riskFlagCount >= ADHERENCE_RISK_MIN_FLAGS
      ? adherence.riskFlagCount
      : undefined;

  return {
    parq:
      response.parq_blocked === null ? {} : { blocked: response.parq_blocked },
    adherence: {
      sleepFlag: adherence.sleepFlag,
      stressFlag: adherence.stressFlag,
      energyFlag: adherence.energyFlag,
      barrierFlag: adherence.barrierFlag,
      ...(riskFlagCountForInput !== undefined && {
        riskFlagCount: riskFlagCountForInput,
      }),
    },
  };
}

/**
 * Indexa as responses por `assessment_id` pra lookup O(1) pela UI.
 * Defensivo: ignora linhas sem `assessment_id`.
 */
export function indexResponsesByAssessmentId(
  responses: readonly CoachConsoleQuestionnaire[],
): Map<string, CoachConsoleQuestionnaire> {
  const map = new Map<string, CoachConsoleQuestionnaire>();
  for (const r of responses) {
    if (r.assessment_id) map.set(r.assessment_id, r);
  }
  return map;
}

// ────────────────────────────────────────────────────────────────────────────
// Cross-join students + assessments + responses (E5.5)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Resultado da derivação por aluno: agrupa N responses do mesmo aluno
 * num único bloco de claims. Quando há múltiplas responses do mesmo
 * aluno (raro, mas possível com reissue + retry), as claims são
 * concatenadas na ordem original.
 */
export interface StudentEvidenceGroup {
  studentId: string;
  studentName: string;
  claims: EvidenceClaim[];
}

/**
 * Cruza `students` + `assessments` + `responses` e devolve grupos por
 * aluno. Apenas alunos com pelo menos 1 claim entram no resultado.
 *
 * Defensivo:
 *   - response sem `assessment_id` → ignorada
 *   - assessment ausente (fila de Coach Console pode descartar assessments
 *     fora do escopo) → ignorado
 *   - student ausente (idem) → fallback para "(aluno desconhecido)"
 *     mantendo `student_id` técnico, pra UI não engolir silenciosamente
 *
 * Pura (não faz fetch, não muta input nem catálogo).
 */
export function deriveEvidenceGroups({
  students,
  assessments,
  responses,
}: {
  students: readonly CoachConsoleStudent[];
  assessments: readonly CoachConsoleAssessment[];
  responses: readonly CoachConsoleQuestionnaire[];
}): StudentEvidenceGroup[] {
  const studentById = new Map(students.map((s) => [s.id, s]));
  const assessmentById = new Map(assessments.map((a) => [a.id, a]));

  const byStudentId = new Map<string, StudentEvidenceGroup>();

  for (const response of responses) {
    if (!response.assessment_id) continue;
    const assessment = assessmentById.get(response.assessment_id);
    if (!assessment) continue;
    const studentId = assessment.student_id;

    const input: Precision12EvidenceInput =
      mapQuestionnaireResponseToEvidenceInput(response);
    const claims = deriveEvidenceClaims(input);
    if (claims.length === 0) continue;

    const existing = byStudentId.get(studentId);
    if (existing) {
      existing.claims = [...existing.claims, ...claims];
      continue;
    }
    const student = studentById.get(studentId);
    byStudentId.set(studentId, {
      studentId,
      studentName: student?.name ?? "(aluno desconhecido)",
      claims,
    });
  }

  return Array.from(byStudentId.values());
}

// ────────────────────────────────────────────────────────────────────────────
// Limitações conhecidas (E5.5)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Catálogo de domínios que o catálogo (E5.1/E5.2) cobre mas que esta
 * rodada NÃO mapeia, e o motivo. Exposto pra ser usado em estados vazios
 * da UI ("Cobertura atual: PAR-Q + Adesão") e em documentação.
 *
 * Quando um domínio sair daqui, basta adicionar o mapper correspondente
 * acima e atualizar `mapQuestionnaireResponseToEvidenceInput` (ou criar
 * novo mapper) sem mudar a UI.
 */
export const LIMITATIONS_NOT_COVERED_YET: ReadonlyArray<{
  domain: string;
  reason: string;
}> = [
  {
    domain: "vo2_max",
    reason:
      "Hook do Coach Console não carrega vo2_results nem ref ranges; classificação requer lookup populacional por sexo/idade.",
  },
  {
    domain: "fc_recovery_1min",
    reason:
      "Hook do Coach Console não carrega vo2_results; recuperação de FC é coluna desse result.",
  },
  {
    domain: "handgrip",
    reason:
      "Hook do Coach Console não carrega handgrip_results nem ref ranges; classificação requer lookup populacional por sexo/idade.",
  },
  {
    domain: "sit_to_stand",
    reason:
      "Hook do Coach Console não carrega sit_to_stand_results nem ref ranges; classificação requer lookup por faixa etária.",
  },
  {
    domain: "dexa",
    reason:
      "Hook já carrega dexa_results (E4.6), mas classificação por marcador (body fat / visceral / androide-ginoide / ALM/h²) exige cortes populacionais por sexo/idade — sem ranges, preferimos não emitir do que emitir errado.",
  },
];
