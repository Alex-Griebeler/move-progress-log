import { describe, expect, it } from "vitest";
import { evaluateOuraFreshness, parseDateOnly } from "../ouraFreshness";

const NOW = Date.parse("2026-09-09T17:30:00Z"); // 14h30 SP
const base = { today: "2026-09-09", recentFailed: 0, now: NOW };

describe("evaluateOuraFreshness — tentativa × dado real", () => {
  it("sync recente e dado de hoje: sem problema", () => {
    const r = evaluateOuraFreshness({ ...base, lastSyncAt: "2026-09-09T13:00:11Z", lastRealDataDate: "2026-09-09" });
    expect(r.hasIssues).toBe(false);
    expect(r.realDataAgeDays).toBe(0);
    expect(r.summary).toBe("Dados de hoje recebidos");
  });

  it("dado de ontem ainda é normal (o Oura fecha o dia ao longo do dia)", () => {
    const r = evaluateOuraFreshness({ ...base, lastSyncAt: "2026-09-09T13:00:11Z", lastRealDataDate: "2026-09-08" });
    expect(r.hasIssues).toBe(false);
    expect(r.dataStale).toBe(false);
  });

  it("caso Brunna: sync 'ok' a cada 8h mas último dado real há 5 dias → problema (antes passava como saudável)", () => {
    const r = evaluateOuraFreshness({ ...base, lastSyncAt: "2026-09-09T13:00:09Z", lastRealDataDate: "2026-09-04" });
    expect(r.attemptStale).toBe(false);
    expect(r.dataStale).toBe(true);
    expect(r.hasIssues).toBe(true);
    expect(r.realDataAgeDays).toBe(5);
    expect(r.summary).toBe("Último dado real há 5 dias (sincronizações sem dados)");
  });

  it("nunca recebeu dado: problema, com frase própria", () => {
    const r = evaluateOuraFreshness({ ...base, lastSyncAt: "2026-09-09T13:00:09Z", lastRealDataDate: null });
    expect(r.hasIssues).toBe(true);
    expect(r.realDataAgeDays).toBeNull();
    expect(r.summary).toBe("Nenhum dado do Oura recebido ainda");
  });

  it("tentativa há mais de 24h (cron parado) tem prioridade na frase", () => {
    const r = evaluateOuraFreshness({ ...base, lastSyncAt: "2026-09-07T13:00:09Z", lastRealDataDate: "2026-09-09" });
    expect(r.attemptStale).toBe(true);
    expect(r.hasIssues).toBe(true);
    expect(r.summary).toBe("Sem tentativa de sincronização há mais de 24h");
  });

  it("falha recente vem antes de tudo", () => {
    const r = evaluateOuraFreshness({ ...base, recentFailed: 2, lastSyncAt: "2026-09-09T13:00:09Z", lastRealDataDate: "2026-09-09" });
    expect(r.hasIssues).toBe(true);
    expect(r.summary).toBe("2 falha(s) de sincronização nas últimas 24h");
  });
});

describe("parseDateOnly", () => {
  it("YYYY-MM-DD formata no mesmo dia em qualquer fuso (não vira o dia anterior)", () => {
    const d = parseDateOnly("2026-09-09");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(9);
  });
});
