import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildRecoverySnapshot,
  classifyTodayRecoveryAvailability,
  recoveryZone,
} from "../recoverySnapshot";

const TODAY = "2026-08-26";

afterEach(() => {
  vi.useRealTimers();
});

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

  it("Oura: faixas do próprio app 85/70", () => {
    expect(recoveryZone(85, "oura")).toBe("alta");
    expect(recoveryZone(84, "oura")).toBe("media");
    expect(recoveryZone(70, "oura")).toBe("media");
    expect(recoveryZone(69, "oura")).toBe("baixa");
    expect(recoveryZone(81, "oura")).toBe("media");
  });
});

describe("classifyTodayRecoveryAvailability", () => {
  it("classifica score fechado hoje por fonte", () => {
    expect(classifyTodayRecoveryAvailability(
      [oura(TODAY, 81)],
      [whoop(TODAY, 47)],
      TODAY,
    )).toEqual({ oura: "scored", whoop: "scored" });
  });

  it("classifica Whoop PENDING_SCORE como pending", () => {
    expect(classifyTodayRecoveryAvailability([], [whoop(TODAY, null, "PENDING_SCORE")], TODAY))
      .toEqual({ oura: "missing", whoop: "pending" });
  });

  it("classifica Whoop UNSCORABLE como unscorable", () => {
    expect(classifyTodayRecoveryAvailability([], [whoop(TODAY, null, "UNSCORABLE")], TODAY))
      .toEqual({ oura: "missing", whoop: "unscorable" });
  });

  it("classifica Whoop sem recovery e sem estado conhecido como pending", () => {
    expect(classifyTodayRecoveryAvailability([], [whoop(TODAY, null, null)], TODAY))
      .toEqual({ oura: "missing", whoop: "pending" });
    expect(classifyTodayRecoveryAvailability([], [whoop(TODAY, null, "UNKNOWN")], TODAY))
      .toEqual({ oura: "missing", whoop: "pending" });
  });

  it("classifica Oura sem readiness hoje como pending", () => {
    expect(classifyTodayRecoveryAvailability([oura(TODAY, null)], [], TODAY))
      .toEqual({ oura: "pending", whoop: "missing" });
  });

  it("classifica ausência de linhas hoje como missing", () => {
    expect(classifyTodayRecoveryAvailability(
      [oura("2026-08-25", 81)],
      [whoop("2026-08-25", 47)],
      TODAY,
    )).toEqual({ oura: "missing", whoop: "missing" });
  });
});

describe("buildRecoverySnapshot — contrato diário", () => {
  it("lista vazia retorna null", () => {
    expect(buildRecoverySnapshot([], [], TODAY)).toBeNull();
    expect(buildRecoverySnapshot(null, undefined, TODAY)).toBeNull();
  });

  it("usa Oura fechado hoje e mantém isStale false", () => {
    const snapshot = buildRecoverySnapshot([oura(TODAY, 81)], [], TODAY);
    expect(snapshot).toEqual({
      source: "oura",
      score: 81,
      date: TODAY,
      zone: "media",
      isStale: false,
      availability: { oura: "scored", whoop: "missing" },
    });
  });

  it("usa Whoop fechado hoje", () => {
    const snapshot = buildRecoverySnapshot([], [whoop(TODAY, 47)], TODAY);
    expect(snapshot).toMatchObject({
      source: "whoop",
      score: 47,
      date: TODAY,
      availability: { oura: "missing", whoop: "scored" },
    });
  });

  it("aceita score_state null com recovery como legado fechado", () => {
    const snapshot = buildRecoverySnapshot([], [whoop(TODAY, 47, null)], TODAY);
    expect(snapshot).toMatchObject({ source: "whoop", score: 47 });
  });

  it("fechado somente ontem retorna null e nunca usa ontem", () => {
    expect(buildRecoverySnapshot(
      [oura("2026-08-25", 81)],
      [whoop("2026-08-25", 47)],
      TODAY,
    )).toBeNull();
  });

  it("Whoop pendente hoje não cai para score anterior", () => {
    expect(buildRecoverySnapshot(
      [],
      [whoop(TODAY, null, "PENDING_SCORE"), whoop("2026-08-25", 47)],
      TODAY,
    )).toBeNull();
  });

  it("Whoop inscorável hoje não cai para score anterior", () => {
    expect(buildRecoverySnapshot(
      [],
      [whoop(TODAY, null, "UNSCORABLE"), whoop("2026-08-25", 47)],
      TODAY,
    )).toBeNull();
  });

  it("Whoop sem recovery e sem estado não produz snapshot", () => {
    expect(buildRecoverySnapshot([], [whoop(TODAY, null, null)], TODAY)).toBeNull();
  });

  it("Oura sem readiness hoje não produz snapshot", () => {
    expect(buildRecoverySnapshot([oura(TODAY, null)], [], TODAY)).toBeNull();
  });

  it("Oura fechado hoje vence Whoop pendente e expõe ambas disponibilidades", () => {
    const snapshot = buildRecoverySnapshot(
      [oura(TODAY, 86)],
      [whoop(TODAY, null, "PENDING_SCORE")],
      TODAY,
    );
    expect(snapshot).toMatchObject({
      source: "oura",
      availability: { oura: "scored", whoop: "pending" },
    });
  });

  it("Whoop fechado hoje vence Oura pendente e expõe ambas disponibilidades", () => {
    const snapshot = buildRecoverySnapshot(
      [oura(TODAY, null)],
      [whoop(TODAY, 68)],
      TODAY,
    );
    expect(snapshot).toMatchObject({
      source: "whoop",
      availability: { oura: "pending", whoop: "scored" },
    });
  });

  it("dois scores fechados hoje empatam por data e Oura vence", () => {
    const snapshot = buildRecoverySnapshot(
      [oura(TODAY, 81)],
      [whoop(TODAY, 68)],
      TODAY,
    );
    expect(snapshot).toMatchObject({
      source: "oura",
      score: 81,
      availability: { oura: "scored", whoop: "scored" },
    });
  });

  it("usa o today recebido na virada do dia, não o relógio do computador", () => {
    const rows = [oura("2042-01-01", 90), oura("2041-12-31", 70)];
    expect(buildRecoverySnapshot(rows, [], "2041-12-31")).toMatchObject({
      date: "2041-12-31",
      score: 70,
    });
    expect(buildRecoverySnapshot(rows, [], "2042-01-01")).toMatchObject({
      date: "2042-01-01",
      score: 90,
    });
  });

  it("o padrão usa o dia de São Paulo quando UTC já virou", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T02:30:00.000Z"));

    const snapshot = buildRecoverySnapshot([
      oura("2026-08-26", 81),
      oura("2026-08-27", 90),
    ], []);

    expect(snapshot).toMatchObject({ date: "2026-08-26", score: 81 });
  });

  it("today explícito continua vencendo o padrão de São Paulo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T02:30:00.000Z"));

    const snapshot = buildRecoverySnapshot([
      oura("2026-08-26", 81),
      oura("2026-08-27", 90),
    ], [], "2026-08-27");

    expect(snapshot).toMatchObject({ date: "2026-08-27", score: 90 });
  });
});