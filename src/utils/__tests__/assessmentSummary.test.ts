import { describe, expect, it } from "vitest";
import {
  KINDS_WITH_REFERENCE,
  classifyAssessmentKind,
  extractKeyResult,
  questionnaireSummary,
  rightHandMeanKg,
  vo2Modality,
  VO2_REFERENCE_NOTE,
} from "../assessmentSummary";

describe("classifyAssessmentKind", () => {
  it("reconhece os tipos reais gravados em produção", () => {
    expect(classifyAssessmentKind("dexa")).toBe("dexa");
    expect(classifyAssessmentKind("questionnaire_precision12")).toBe("questionnaire");
  });

  it("reconhece as variantes de VO₂ (esteira e bike) como um tipo só", () => {
    expect(classifyAssessmentKind("vo2_treadmill")).toBe("vo2");
    expect(classifyAssessmentKind("vo2_bike")).toBe("vo2");
    expect(classifyAssessmentKind("vo2")).toBe("vo2");
  });

  it("reconhece handgrip e sit-to-stand", () => {
    expect(classifyAssessmentKind("handgrip")).toBe("handgrip");
    expect(classifyAssessmentKind("sit_to_stand")).toBe("sit_to_stand");
    expect(classifyAssessmentKind("sit-to-stand")).toBe("sit_to_stand");
  });

  it("tipo desconhecido ou vazio → unknown (nunca explode)", () => {
    expect(classifyAssessmentKind("bioimpedancia")).toBe("unknown");
    expect(classifyAssessmentKind(null)).toBe("unknown");
    expect(classifyAssessmentKind("")).toBe("unknown");
  });
});

describe("rightHandMeanKg (comparador ratificado: média das 3 da direita)", () => {
  it("média das 3 tentativas, não o máximo", () => {
    expect(rightHandMeanKg([30, 34, 32])).toBe(32);
  });

  it("arredonda a 2 casas", () => {
    expect(rightHandMeanKg([30, 31, 33])).toBe(31.33);
  });

  it("ignora nulos e usa as tentativas presentes", () => {
    expect(rightHandMeanKg([30, null, 34])).toBe(32);
  });

  it("sem tentativas → null (não cai no máximo, que inflaria a classe)", () => {
    expect(rightHandMeanKg([])).toBeNull();
    expect(rightHandMeanKg(null)).toBeNull();
    expect(rightHandMeanKg([null, null, null])).toBeNull();
  });

  it("descarta valores não-finitos e negativos", () => {
    expect(rightHandMeanKg([Number.NaN, 30, 30])).toBe(30);
    expect(rightHandMeanKg([-5, 30, 30])).toBe(30);
  });

  it("tentativa zero real conta na média (bodyweight/limitação)", () => {
    expect(rightHandMeanKg([0, 30, 30])).toBe(20);
  });
});

describe("extractKeyResult", () => {
  it("VO₂ usa vo2_final em ml/kg/min e tem faixa de referência", () => {
    const r = extractKeyResult("vo2", { vo2Final: 42.4 });
    expect(r.value).toBe(42.4);
    expect(r.unit).toBe("ml/kg/min");
    expect(r.hasReference).toBe(true);
  });

  it("handgrip usa a MÉDIA da direita (não best_kg)", () => {
    const r = extractKeyResult("handgrip", { rightKgAttempts: [30, 34, 32] });
    expect(r.value).toBe(32);
    expect(r.hasReference).toBe(true);
  });

  it("DEXA usa % de gordura e menor é melhor", () => {
    const r = extractKeyResult("dexa", { fatPct: 28.4 });
    expect(r.value).toBe(28.4);
    expect(r.unit).toBe("%");
    expect(r.higherIsBetter).toBe(false);
    expect(r.hasReference).toBe(false); // sem tabela seedada
  });

  it("sit-to-stand usa o escore total sobre 10 e tem faixa", () => {
    const r = extractKeyResult("sit_to_stand", { sitToStandTotal: 8 });
    expect(r.value).toBe(8);
    expect(r.unit).toBe("/10");
    expect(r.hasReference).toBe(true);
  });

  it("questionário não tem número comparável", () => {
    const r = extractKeyResult("questionnaire", { questionnaireCompleted: true });
    expect(r.value).toBeNull();
    expect(r.hasReference).toBe(false);
  });

  it("resultado ausente vira null, não zero", () => {
    expect(extractKeyResult("vo2", {}).value).toBeNull();
    expect(extractKeyResult("dexa", { fatPct: null }).value).toBeNull();
  });

  it("só VO₂, handgrip e sit-to-stand declaram faixa de referência", () => {
    expect([...KINDS_WITH_REFERENCE].sort()).toEqual(["handgrip", "sit_to_stand", "vo2"]);
  });
});

describe("vo2Modality (decisão ratificada: classifica tudo, com ressalva)", () => {
  it("esteira corrida máxima é o protocolo da norma — sem ressalva", () => {
    const m = vo2Modality("vo2_treadmill_run_max");
    expect(m).toEqual({
      equipment: "treadmill",
      intensity: "max",
      matchesReferenceProtocol: true,
    });
  });

  it("'submax' não é lido como 'max' (a substring engana)", () => {
    expect(vo2Modality("vo2_treadmill_run_submax").intensity).toBe("submax");
    expect(vo2Modality("vo2_bike_submax").intensity).toBe("submax");
  });

  it("os outros 4 protocolos exigem ressalva", () => {
    for (const t of [
      "vo2_bike_max",
      "vo2_bike_submax",
      "vo2_treadmill_walk_submax",
      "vo2_treadmill_run_submax",
    ]) {
      expect(vo2Modality(t).matchesReferenceProtocol).toBe(false);
    }
  });

  it("identifica o equipamento nos 5 tipos reais", () => {
    expect(vo2Modality("vo2_bike_max").equipment).toBe("bike");
    expect(vo2Modality("vo2_treadmill_walk_submax").equipment).toBe("treadmill");
  });

  it("tipo não-VO₂ não tem modalidade", () => {
    expect(vo2Modality("handgrip")).toEqual({
      equipment: null,
      intensity: null,
      matchesReferenceProtocol: false,
    });
    expect(vo2Modality(null).equipment).toBeNull();
  });

  it("a ressalva cita a fonte e o caráter orientativo", () => {
    expect(VO2_REFERENCE_NOTE).toMatch(/esteira/i);
    expect(VO2_REFERENCE_NOTE).toMatch(/orientativa/i);
  });
});

describe("questionnaireSummary", () => {
  it("PAR-Q bloqueado é o sinal mais forte, acima do status", () => {
    const s = questionnaireSummary({ parqBlocked: true }, "completed");
    expect(s.tone).toBe("destructive");
    expect(s.label).toMatch(/liberação médica/i);
  });

  it("completo e sem PAR-Q bloqueado", () => {
    expect(questionnaireSummary({ parqBlocked: false }, "completed").tone).toBe("success");
  });

  it("em progresso e interrompido têm rótulos distintos", () => {
    expect(questionnaireSummary({}, "in_progress").label).toMatch(/preenchimento/i);
    expect(questionnaireSummary({}, "aborted").label).toMatch(/interrompid/i);
  });

  it("status ausente não explode", () => {
    expect(questionnaireSummary({}, null).label).toBeTruthy();
  });
});
