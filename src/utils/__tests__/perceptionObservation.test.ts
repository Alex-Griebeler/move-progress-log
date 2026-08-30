import { describe, expect, it } from "vitest";
import {
  buildPerceptionText,
  spDayUtcRange,
  PERCEPTION_CATEGORY,
} from "@/utils/perceptionObservation";

describe("persistência da percepção (partes puras)", () => {
  it("intervalo UTC do dia SP (UTC−3 fixo desde 2019)", () => {
    const { startIso, endIso } = spDayUtcRange("2026-08-29");
    expect(startIso).toBe("2026-08-29T03:00:00.000Z");
    expect(endIso).toBe("2026-08-30T03:00:00.000Z");
  });

  it("texto versionado carrega fonte/score/zona/percepção/sintomas/conduta/vetos/ator", () => {
    const text = buildPerceptionText({
      source: "whoop", score: 55, baseZoneLabel: "yellow", perception: "pior",
      symptoms: false, conductType: "Recuperação Ativa / Muito Leve",
      vetoes: ["Conduta reduzida pela percepção da aluna (pior que o score)."],
      spDay: "2026-08-29", registeredAtDisplay: "29/08/2026 14:32", actorId: "abc",
    });
    expect(text).toContain(`[${PERCEPTION_CATEGORY} v1]`);
    expect(text).toContain("fonte=whoop");
    expect(text).toContain("score=55");
    expect(text).toContain("percepcao=pior");
    expect(text).toContain("sintomas=nao");
    expect(text).toContain("conduta=Recuperação Ativa / Muito Leve");
    expect(text).toContain("por=abc");
  });

  it("sintomas null vira 'nao_perguntado' no texto", () => {
    const text = buildPerceptionText({
      source: "oura", score: 80, baseZoneLabel: "green", perception: "nao_informada",
      symptoms: null, conductType: "x", vetoes: [], spDay: "2026-08-29",
      registeredAtDisplay: "x", actorId: null,
    });
    expect(text).toContain("sintomas=nao_perguntado");
    expect(text).toContain("por=?");
  });
});
