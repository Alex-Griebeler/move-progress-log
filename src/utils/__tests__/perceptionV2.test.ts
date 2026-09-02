/**
 * Formato v2 do registro de check-in (PR-B1, spec v7.2): round-trip do
 * builder v2 com o parser genérico + convivência com v1 (histórico
 * preservado — v7.2-M9). O builder v1 segue intocado (a UI só grava v2 a
 * partir do cutover da PR-B2).
 */
import { describe, expect, it } from "vitest";
import {
  buildPerceptionText,
  buildPerceptionTextV2,
  parsePerceptionText,
  PERCEPTION_TEXT_VERSION,
  PERCEPTION_TEXT_VERSION_V2,
  SUPPORTED_PERCEPTION_VERSIONS,
  type PerceptionRecordV2,
} from "../perceptionObservation";

const recordV2 = (overrides: Partial<PerceptionRecordV2> = {}): PerceptionRecordV2 => ({
  source: "whoop",
  score: 71,
  psr: 7,
  conductFingerprintHash: "abc123",
  registeredAtIso: "2026-08-31T12:00:00.000Z",
  baseZoneLabel: "green",
  perception: "condizente",
  conductType: "Treino Normal Completo",
  vetoes: [],
  spDay: "2026-08-31",
  snapshotDate: "2026-08-31",
  registeredAtDisplay: "31/08 09:12",
  actorId: "coach-1",
  ...overrides,
});

describe("formato v2 — round-trip e convivência com v1", () => {
  it("v1 e v2 são as versões suportadas", () => {
    expect(SUPPORTED_PERCEPTION_VERSIONS).toEqual(["v1", "v2"]);
  });

  it("builder v2 faz round-trip com o parser (campos-chave)", () => {
    const parsed = parsePerceptionText(buildPerceptionTextV2(recordV2()));
    expect(parsed.version).toBe(PERCEPTION_TEXT_VERSION_V2);
    expect(parsed.fields.fonte).toBe("whoop");
    expect(parsed.fields.psr).toBe("7");
    expect(parsed.fields.percepcao).toBe("condizente");
    expect(parsed.fields.dia_snapshot).toBe("2026-08-31");
    // v2 NÃO tem campo de sintomas (sintoma virou observação clínica).
    expect(parsed.fields.sintomas).toBeUndefined();
  });

  it("psr null vira 'nao_informado' e psr 0 vira '0' (nunca truthiness)", () => {
    expect(parsePerceptionText(buildPerceptionTextV2(recordV2({ psr: null }))).fields.psr)
      .toBe("nao_informado");
    expect(parsePerceptionText(buildPerceptionTextV2(recordV2({ psr: 0 }))).fields.psr)
      .toBe("0");
  });

  it("fonte psr (modo sem dispositivo) round-tripa com score = próprio PSR", () => {
    const parsed = parsePerceptionText(
      buildPerceptionTextV2(recordV2({ source: "psr", score: 5, psr: 5 })),
    );
    expect(parsed.fields.fonte).toBe("psr");
    expect(parsed.fields.score).toBe("5");
  });

  it("registro v1 ANTIGO continua parseando com sintomas visíveis (histórico eterno)", () => {
    const v1 = buildPerceptionText({
      source: "oura",
      score: 62,
      baseZoneLabel: "yellow",
      perception: "pior",
      symptoms: true,
      conductType: "Treino Reduzido 20%",
      vetoes: ["x"],
      spDay: "2026-08-29",
      snapshotDate: "2026-08-29",
      registeredAtDisplay: "29/08 08:00",
      actorId: "coach-1",
    });
    const parsed = parsePerceptionText(v1);
    expect(parsed.version).toBe(PERCEPTION_TEXT_VERSION);
    expect(parsed.fields.sintomas).toBe("sim");
    expect(parsed.fields.psr).toBeUndefined();
  });

  it("versão futura desconhecida NÃO é suportada (renderer cai no cru)", () => {
    const parsed = parsePerceptionText("[percepcao_treino v3] | fonte=whoop | campo_novo=x");
    expect(parsed.version).toBe("v3");
    expect(
      (SUPPORTED_PERCEPTION_VERSIONS as readonly string[]).includes(parsed.version!),
    ).toBe(false);
  });
});

describe("renderer do prontuário (source-based, v7.2-M4/M9)", () => {
  it("card amigável aceita AS DUAS versões e mapeia fonte psr → 'PSR'", async () => {
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const card = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../components/StudentObservationsCard.tsx"),
      "utf-8",
    );
    expect(card).toContain("SUPPORTED_PERCEPTION_VERSIONS");
    expect(card).not.toMatch(/parsed\.version === PERCEPTION_TEXT_VERSION \?/);
    expect(card).toContain('f.fonte === "psr" ? "PSR"');
    // sintomas v1: renderiza SÓ quando o campo existe (histórico preservado).
    expect(card).toContain("f.sintomas !== undefined");
  });
});
