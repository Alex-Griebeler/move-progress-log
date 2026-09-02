/**
 * Check-in v3 (redesign premium, spec v7+v7.2 com GO — 31/08):
 * PSR (percepção subjetiva de repouso, 0–10) como única pergunta do check-in.
 *
 * Três tradutores PUROS, nenhum toca o motor fisiológico:
 * - derivePerceptionFromPsr: PSR + score do aparelho → Perception relativa
 *   (régua ±2 ratificada) — o funil computeEffectiveConduct segue consumindo
 *   Perception e NÃO muda.
 * - deriveZoneFromPsrOnly: bandas diretas pro modo SEM dispositivo
 *   (ratificadas: 7–10 manter · 4–6 reduzir 20% · 2–3 recuperação · 0–1
 *   descanso). Zona 4/progressão NUNCA nasce só de PSR.
 * - buildPsrOnlyRecommendation: adapter que materializa a banda numa
 *   recomendação consumível pelas cargas/alternativas (PR-C2), com todos os
 *   campos documentados — nada de recomendação sintética improvisada.
 *
 * Guardrail do GO: `RecoverySource` do motor fica intocado ("oura"|"whoop");
 * "psr" existe SÓ aqui, no tipo RecommendationSource/PsrOnlyRecommendation.
 */

import type { RecoverySource, TrainingRecommendation } from "@/utils/recoveryEngine";
import type { Perception } from "@/utils/effectiveConduct";
import { PRESCRIPTION_BY_ZONE } from "@/utils/effectiveConduct";

export const PSR_MIN = 0;
export const PSR_MAX = 10;

/**
 * Hash canônico do conductFingerprint (v8.1): UMA função produz o valor na
 * GRAVAÇÃO (campo fingerprint= do formato v2) e na COMPARAÇÃO da
 * reidratação — nunca duas implementações (guardrail do GO da review UX).
 * djb2-xor em hex: estável, curto, sem dependência.
 */
export const hashConductFingerprint = (fingerprint: string): string => {
  let h = 5381;
  for (let i = 0; i < fingerprint.length; i++) {
    h = ((h * 33) ^ fingerprint.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
};

/** Fonte de uma recomendação exibível: as do motor + o modo PSR-only. */
export type RecommendationSource = RecoverySource | "psr";

/**
 * Contrato ESTRUTURAL que as cargas/alternativas consomem (review PR-B1,
 * achado 2): o shape do motor com a fonte alargada — `TrainingRecommendation`
 * é atribuível a ele (covariância), e o adapter PSR também. O tipo clínico do
 * motor continua fechado em RecoverySource.
 */
export type ConductRecommendation = Omit<TrainingRecommendation, "source"> & {
  source: RecommendationSource;
};

/** Recomendação do modo sem dispositivo — mesmo shape do motor, fonte "psr". */
export type PsrOnlyRecommendation = Omit<TrainingRecommendation, "source"> & {
  source: "psr";
};

/**
 * Valida o domínio do PSR: inteiro 0..10. Qualquer outra coisa (NaN,
 * fracionário, fora da faixa, undefined) vira null — e null é o ÚNICO valor
 * que significa "não informado" (psr = 0 é resposta válida; truthiness
 * proibido — v6.1-M7).
 */
export const normalizePsr = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < PSR_MIN || value > PSR_MAX) return null;
  return value;
};

/**
 * Régua ±2 ratificada ("ok" do Alex, 31/08): o score do aparelho (0–100)
 * projeta um PSR esperado (score/10); desvio de 2+ pontos pra baixo = "pior",
 * 2+ pra cima = "melhor", dentro da faixa = "condizente".
 *
 * Degenerações CONHECIDAS e aceitas (v7.2-M10, viram teste, não mudança de
 * fórmula): score 18 + PSR 0 → diff −1,8 → "condizente" fica no histórico —
 * o piso numérico do funil já impede exposição num dia objetivamente ruim.
 */
export const derivePerceptionFromPsr = (
  psr: number | null,
  deviceScore: number,
): Perception => {
  const normalized = normalizePsr(psr);
  if (normalized === null) return "nao_informada";
  // Clamp defensivo: o motor só produz 0–100, mas o tradutor não confia.
  const score = Math.max(0, Math.min(100, deviceScore));
  const diff = normalized - score / 10;
  if (diff <= -2) return "pior";
  if (diff >= 2) return "melhor";
  return "condizente";
};

/**
 * Bandas diretas do modo SEM dispositivo (ratificadas): a banda É a conduta —
 * não há piso numérico nem freshness sem aparelho. Zona 4 é inalcançável.
 */
export const deriveZoneFromPsrOnly = (psr: number): 0 | 1 | 2 | 3 => {
  const normalized = normalizePsr(psr);
  if (normalized === null) {
    throw new Error("deriveZoneFromPsrOnly exige PSR válido (0-10)");
  }
  if (normalized >= 7) return 3;
  if (normalized >= 4) return 2;
  if (normalized >= 2) return 1;
  return 0;
};

const ZONE_LABEL_BY_NUMBER: Record<0 | 1 | 2 | 3, TrainingRecommendation["zone"]> = {
  3: "green",
  2: "yellow",
  1: "orange",
  0: "red",
};

const LOAD_BY_PSR_ZONE: Record<
  0 | 1 | 2 | 3,
  { decision: TrainingRecommendation["loadDecision"]; percent: number | null }
> = {
  3: { decision: "maintain", percent: 0 },
  2: { decision: "reduce", percent: -20 },
  1: { decision: "block", percent: null },
  0: { decision: "block", percent: null },
};

const FATIGUE_BY_PSR_ZONE: Record<0 | 1 | 2 | 3, TrainingRecommendation["fatigueLevel"]> = {
  3: "low",
  2: "moderate",
  1: "high",
  0: "high",
};

/**
 * Adapter do modo sem dispositivo (v7.2-B3). Campos documentados:
 * - recoveryScore = o PRÓPRIO PSR (escala 0–10) — NUNCA exibir como 0–100;
 *   o display do modo é o anel PSR.
 * - alerts SEMPRE vazio (alerta fisiológico exige aparelho; PSR baixo não é
 *   alerta — v7.2-M8).
 * - priorityProtocols SEMPRE undefined (protocolos nascem de sinal
 *   fisiológico; zona 0 por PSR usa a composição de descanso SEM protocolos).
 * - loadDecision NUNCA "increase" (progressão exige dado objetivo).
 * - confidence 0 = "não se aplica" (o modo não tem modelo de confiança;
 *   nenhum consumidor do modo exibe o campo).
 */
export const buildPsrOnlyRecommendation = (psr: number): PsrOnlyRecommendation => {
  const zone = deriveZoneFromPsrOnly(psr);
  const prescription = PRESCRIPTION_BY_ZONE[zone];
  const load = LOAD_BY_PSR_ZONE[zone];
  return {
    trainingType: prescription.trainingType,
    intensity: prescription.intensity,
    duration: prescription.duration,
    recoveryScore: psr,
    zone: ZONE_LABEL_BY_NUMBER[zone],
    fatigueLevel: FATIGUE_BY_PSR_ZONE[zone],
    loadDecision: load.decision,
    loadAdjustmentPercent: load.percent,
    overrideApplied: false,
    reason:
      "Conduta derivada da percepção subjetiva de repouso (PSR) — aluna sem dispositivo conectado.",
    alerts: [],
    confidence: 0,
    emoji: prescription.emoji,
    priorityProtocols: undefined,
    source: "psr",
    evaluatedRules: ["psr_only_band"],
    skippedRules: [
      { rule: "motor_fisiologico", reason: "sem dispositivo conectado" },
    ],
  };
};
