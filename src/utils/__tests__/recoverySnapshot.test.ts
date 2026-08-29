import { describe, expect, it } from "vitest";
import { buildRecoverySnapshot, recoveryZone } from "../recoverySnapshot";

const NOW = new Date(2026, 7, 26, 12, 0, 0); // 26/08/2026 local

const oura = (date: string, readiness: number | null) => ({
  date,
  readiness_score: readiness,
});
const whoop = (date: string, recovery: number | null, state: string | null = "SCORED") => ({
  date,
  recovery_score: recovery,
  score_state: state,
});

describe("recoveryZone — limiares por aparelho (ratificado 29/08)", () => {
  it("Whoop: bandas nativas 67/34", () => {
    expect(recoveryZone(67, "whoop")).toBe("alta");
    expect(recoveryZone(66, "whoop")).toBe("media");
    expect(recoveryZone(34, "whoop")).toBe("media");
    expect(recoveryZone(33, "whoop")).toBe("baixa");
  });

  it("Oura: faixas do próprio app 85/70 (as mesmas dos cards da aba Oura)", () => {
    expect(recoveryZone(85, "oura")).toBe("alta");
    expect(recoveryZone(84, "oura")).toBe("media");
    expect(recoveryZone(70, "oura")).toBe("media");
    expect(recoveryZone(69, "oura")).toBe("baixa");
    // 81 era classificado "alta" pela régua Whoop — o Oura chama de "bom".
    expect(recoveryZone(81, "oura")).toBe("media");
  });
});

describe("buildRecoverySnapshot", () => {
  it("sem dado nenhum → null", () => {
    expect(buildRecoverySnapshot([], [], NOW)).toBeNull();
    expect(buildRecoverySnapshot(null, undefined, NOW)).toBeNull();
  });

  it("só Oura", () => {
    const s = buildRecoverySnapshot([oura("2026-08-25", 81)], [], NOW)!;
    expect(s).toMatchObject({ source: "oura", score: 81, date: "2026-08-25", zone: "media" });
    expect(s.isStale).toBe(false);
  });

  it("só Whoop", () => {
    const s = buildRecoverySnapshot([], [whoop("2026-08-25", 47)], NOW)!;
    expect(s).toMatchObject({ source: "whoop", score: 47, zone: "media" });
  });

  it("Whoop mais recente vence o Oura", () => {
    const s = buildRecoverySnapshot(
      [oura("2026-08-24", 81)],
      [whoop("2026-08-25", 47)],
      NOW,
    )!;
    expect(s.source).toBe("whoop");
  });

  it("EMPATE de data → Oura (regra ratificada)", () => {
    const s = buildRecoverySnapshot(
      [oura("2026-08-25", 81)],
      [whoop("2026-08-25", 47)],
      NOW,
    )!;
    expect(s.source).toBe("oura");
    expect(s.score).toBe(81);
  });

  it("Whoop PENDING_SCORE é pulado (cai no dia anterior fechado)", () => {
    const s = buildRecoverySnapshot(
      [],
      [whoop("2026-08-26", 90, "PENDING_SCORE"), whoop("2026-08-25", 47)],
      NOW,
    )!;
    expect(s).toMatchObject({ date: "2026-08-25", score: 47 });
  });

  it("score_state null é tratado como fechado (linhas antigas)", () => {
    const s = buildRecoverySnapshot([], [whoop("2026-08-25", 47, null)], NOW)!;
    expect(s.score).toBe(47);
  });

  it("dias sem score são pulados nas DUAS fontes", () => {
    const s = buildRecoverySnapshot(
      [oura("2026-08-26", null), oura("2026-08-24", 70)],
      [whoop("2026-08-26", null), whoop("2026-08-23", 50)],
      NOW,
    )!;
    expect(s).toMatchObject({ source: "oura", date: "2026-08-24", score: 70 });
  });

  it("isStale a partir de 2 dias", () => {
    expect(buildRecoverySnapshot([oura("2026-08-25", 80)], [], NOW)!.isStale).toBe(false);
    expect(buildRecoverySnapshot([oura("2026-08-24", 80)], [], NOW)!.isStale).toBe(true);
  });

  it("ordem de entrada não importa (ordena por data)", () => {
    const s = buildRecoverySnapshot(
      [oura("2026-08-20", 60), oura("2026-08-25", 82), oura("2026-08-22", 70)],
      [],
      NOW,
    )!;
    expect(s.date).toBe("2026-08-25");
  });
});
