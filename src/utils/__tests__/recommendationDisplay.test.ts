import { describe, expect, it } from "vitest";
import {
  SNAPSHOT_ZONE_SHORT,
  formatDurationShort,
  formatIntensityShort,
  formatPrescriptionLine,
} from "../recommendationDisplay";

describe("formatIntensityShort", () => {
  it("remove o % de FCmáx das 5 strings reais do motor", () => {
    expect(formatIntensityShort("ALTA (80-95% FCMáx)")).toBe("alta");
    expect(formatIntensityShort("MODERADA-ALTA (70-85% FCMáx)")).toBe("moderada-alta");
    expect(formatIntensityShort("MODERADA (60-75% FCMáx)")).toBe("moderada");
    expect(formatIntensityShort("BAIXA (30-50% FCMáx)")).toBe("baixa");
    expect(formatIntensityShort("MUITO BAIXA (0-20% FCMáx)")).toBe("muito baixa");
  });

  it("só remove parêntese ANCORADO no fim (não come parênteses no meio)", () => {
    expect(formatIntensityShort("ALTA (mas cuidado) SEMPRE")).toBe("alta (mas cuidado) sempre");
  });
});

describe("formatDurationShort", () => {
  it("compacta a faixa de minutos com meia-risca", () => {
    expect(formatDurationShort("45-55 minutos")).toBe("45–55 min");
    expect(formatDurationShort("20-30 minutos")).toBe("20–30 min");
  });

  it("'Repouso total' passa intacto", () => {
    expect(formatDurationShort("Repouso total")).toBe("Repouso total");
  });
});

describe("formatPrescriptionLine", () => {
  it("monta a linha única do hero", () => {
    expect(formatPrescriptionLine("MODERADA-ALTA (70-85% FCMáx)", "45-55 minutos")).toBe(
      "Intensidade moderada-alta · 45–55 min",
    );
  });

  it("zona 0: repouso total sem prefixo de intensidade", () => {
    expect(formatPrescriptionLine("MUITO BAIXA (0-20% FCMáx)", "Repouso total")).toBe(
      "Repouso total",
    );
  });
});

describe("SNAPSHOT_ZONE_SHORT", () => {
  it("cobre as 3 zonas do snapshot pras duas fontes, com a língua do aparelho", () => {
    for (const zone of ["alta", "media", "baixa"] as const) {
      expect(SNAPSHOT_ZONE_SHORT.oura[zone]).toMatch(/prontidão/i);
      expect(SNAPSHOT_ZONE_SHORT.whoop[zone]).toMatch(/recovery/i);
    }
  });
});
