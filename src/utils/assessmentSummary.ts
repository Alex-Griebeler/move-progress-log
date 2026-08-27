/**
 * Resultado-chave por tipo de avaliação (PR-8b) — lógica PURA.
 *
 * Cada tipo de teste tem UM número que responde "como foi?". A lista da aba
 * mostra esse número; o resto vive no detalhe. Tipos sem número comparável
 * (questionário) declaram isso explicitamente em vez de forjar um valor.
 *
 * Matriz canônica (colunas conferidas no schema da E1):
 *  • vo2_*          → vo2_assessment_details.vo2_final        (ml/kg/min)
 *  • handgrip       → média das 3 tentativas da mão DIREITA   (kg)
 *  • dexa           → dexa_results.fat_pct                    (%)
 *  • sit_to_stand   → sit_to_stand_results.total_score        (0–10)
 *  • questionnaire  → sem número; estado + PAR-Q
 */

import {
  classifyHandgrip,
  classifySitToStand,
  classifyVo2,
  filterRangesBySexAge,
  filterSitToStandByAge,
  type HandgripReferenceRange,
  type SitToStandReferenceRange,
  type Vo2ReferenceRange,
} from "@/utils/classification";
import type { SubjectSex } from "@/utils/assessmentSubject";

export type AssessmentKind =
  | "vo2"
  | "handgrip"
  | "dexa"
  | "sit_to_stand"
  | "questionnaire"
  | "unknown";

/** Só estes têm tabela de referência seedada (PR-8a + Araújo). */
export const KINDS_WITH_REFERENCE: ReadonlySet<AssessmentKind> = new Set<AssessmentKind>([
  "vo2",
  "handgrip",
  "sit_to_stand",
]);

export const classifyAssessmentKind = (assessmentType?: string | null): AssessmentKind => {
  const t = (assessmentType ?? "").trim().toLowerCase();
  if (!t) return "unknown";
  if (t.startsWith("vo2")) return "vo2";
  if (t.startsWith("handgrip") || t.includes("preens")) return "handgrip";
  if (t.startsWith("dexa")) return "dexa";
  if (t.startsWith("sit_to_stand") || t.startsWith("sit-to-stand")) return "sit_to_stand";
  if (t.startsWith("questionnaire") || t.includes("question")) return "questionnaire";
  return "unknown";
};

/**
 * Modalidade do teste de VO₂. Não existe coluna pra isso: o discriminador é
 * o próprio `assessment_type`, um de 5 literais.
 *
 * Importa porque as faixas de referência (FRIEND 2015) são de teste MÁXIMO em
 * ESTEIRA com análise de gases. Ratificado pelo Alex em 27/08: todos os testes
 * são classificados, mas os que não casam com o protocolo da norma exibem a
 * ressalva — a régua continua sendo uma só, e o laudo diz de onde ela vem.
 */
export interface Vo2Modality {
  equipment: "bike" | "treadmill" | null;
  intensity: "max" | "submax" | null;
  /** true só pra esteira máxima — o protocolo da norma. */
  matchesReferenceProtocol: boolean;
}

export const vo2Modality = (assessmentType?: string | null): Vo2Modality => {
  const t = (assessmentType ?? "").trim().toLowerCase();
  if (!t.startsWith("vo2")) {
    return { equipment: null, intensity: null, matchesReferenceProtocol: false };
  }
  const equipment = t.includes("bike")
    ? ("bike" as const)
    : t.includes("treadmill")
      ? ("treadmill" as const)
      : null;
  // "submax" contém "max": testar o mais específico primeiro.
  const intensity = t.includes("submax")
    ? ("submax" as const)
    : t.includes("max")
      ? ("max" as const)
      : null;
  return {
    equipment,
    intensity,
    matchesReferenceProtocol: equipment === "treadmill" && intensity === "max",
  };
};

/** Ressalva exibida quando o protocolo do teste não é o da norma. */
export const VO2_REFERENCE_NOTE =
  "Referência: teste máximo em esteira (FRIEND 2015). Protocolos de bike e submáximos estimam o VO₂ por fórmula — a classificação é orientativa.";

export const KIND_LABEL: Record<AssessmentKind, string> = {
  vo2: "VO₂ máx",
  handgrip: "Preensão palmar",
  dexa: "Composição corporal",
  sit_to_stand: "Sentar e levantar",
  questionnaire: "Questionário Precision 12",
  unknown: "Avaliação",
};

/**
 * Média das tentativas válidas da mão direita — o comparador do protocolo
 * Mathiowetz. NÃO usar `best_kg` (máximo entre as duas mãos): a norma é da
 * mão direita pela média de 3, e o máximo inflaria a classificação.
 * Sem tentativas registradas → null (mostra o número sem rótulo de classe).
 */
export const rightHandMeanKg = (attempts?: (number | null)[] | null): number | null => {
  const valid = (attempts ?? []).filter(
    (a): a is number => typeof a === "number" && Number.isFinite(a) && a >= 0,
  );
  if (valid.length === 0) return null;
  const mean = valid.reduce((sum, a) => sum + a, 0) / valid.length;
  return Math.round(mean * 100) / 100;
};

/** Campos normalizados que a UI extrai das relações embutidas. */
export interface AssessmentDetailsLike {
  vo2Final?: number | null;
  rightKgAttempts?: (number | null)[] | null;
  fatPct?: number | null;
  sitToStandTotal?: number | null;
  questionnaireCompleted?: boolean | null;
  parqBlocked?: boolean | null;
}

export interface KeyResult {
  /** Número exibido; null = avaliação sem resultado utilizável. */
  value: number | null;
  unit: string;
  /** Nome curto da métrica ("VO₂ máx"), não do teste. */
  metricLabel: string;
  decimals: number;
  /** Se o tipo tem faixas de referência (define se cabe RefRangeBar). */
  hasReference: boolean;
  /** Direção do "melhor": para % de gordura, menor é melhor. */
  higherIsBetter: boolean;
}

export const extractKeyResult = (
  kind: AssessmentKind,
  details: AssessmentDetailsLike,
): KeyResult => {
  const base = { hasReference: KINDS_WITH_REFERENCE.has(kind), higherIsBetter: true };
  switch (kind) {
    case "vo2":
      return { ...base, value: details.vo2Final ?? null, unit: "ml/kg/min", metricLabel: "VO₂ máx", decimals: 1 };
    case "handgrip":
      return {
        ...base,
        value: rightHandMeanKg(details.rightKgAttempts),
        unit: "kg",
        metricLabel: "Preensão (média, direita)",
        decimals: 1,
      };
    case "dexa":
      return {
        ...base,
        value: details.fatPct ?? null,
        unit: "%",
        metricLabel: "Gordura corporal",
        decimals: 1,
        higherIsBetter: false,
      };
    case "sit_to_stand":
      return { ...base, value: details.sitToStandTotal ?? null, unit: "/10", metricLabel: "Escore total", decimals: 1 };
    case "questionnaire":
    case "unknown":
    default:
      return { ...base, value: null, unit: "", metricLabel: "", decimals: 0 };
  }
};

/**
 * Classifica o resultado-chave contra as faixas seedadas — a ponte entre a
 * lista/detalhe e `classification.ts`.
 *
 * Retorna null (sem classificação) sempre que faltar régua ou sujeito: é
 * melhor mostrar o número sem rótulo do que rotular com a faixa errada.
 * Note que sit-to-stand não tem dimorfismo sexual (Araújo 2012), então
 * classifica só com a idade.
 */
export const classifyAssessmentValue = (
  kind: AssessmentKind,
  value: number | null,
  subject: { sex: SubjectSex | null; ageYears: number | null },
  ranges: {
    vo2?: Vo2ReferenceRange[];
    handgrip?: HandgripReferenceRange[];
    sitToStand?: SitToStandReferenceRange[];
  },
): string | null => {
  if (value === null || !Number.isFinite(value)) return null;

  switch (kind) {
    case "vo2": {
      const subset = filterRangesBySexAge(ranges.vo2 ?? [], subject.sex, subject.ageYears);
      return classifyVo2(value, subset);
    }
    case "handgrip": {
      const subset = filterRangesBySexAge(ranges.handgrip ?? [], subject.sex, subject.ageYears);
      return classifyHandgrip(value, subset);
    }
    case "sit_to_stand": {
      const subset = filterSitToStandByAge(ranges.sitToStand ?? [], subject.ageYears);
      return classifySitToStand(value, subset);
    }
    default:
      return null;
  }
};

/** Texto de estado pro questionário, que não tem número comparável. */
export const questionnaireSummary = (
  details: AssessmentDetailsLike,
  status?: string | null,
): { label: string; tone: "success" | "warning" | "destructive" | "neutral" } => {
  if (details.parqBlocked) {
    return { label: "PAR-Q: liberação médica recomendada", tone: "destructive" };
  }
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return { label: "Respondido — sem impedimentos no PAR-Q", tone: "success" };
  if (s === "aborted") return { label: "Interrompido", tone: "neutral" };
  return { label: "Em preenchimento", tone: "warning" };
};
