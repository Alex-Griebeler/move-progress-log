import { describe, expect, it } from "vitest";
import {
  partitionAlerts,
  stripAlertEmoji,
  type AlertMetric,
  type StructuredAlert,
} from "../attentionAlerts";

const a = (
  level: StructuredAlert["level"],
  metric: AlertMetric | null,
  kind: StructuredAlert["kind"] = "fisiologico",
  message = "🟡 Mensagem de teste do alerta.",
  shortLabel: string | null = "Rótulo curto",
): StructuredAlert => ({ level, metric, kind, message, shortLabel });

const tiles = (...m: AlertMetric[]) => new Set<AlertMetric>(m);

describe("partitionAlerts — regra de consolidação ratificada", () => {
  it("1 sinal leve COM tile → só estado no tile, nenhum card", () => {
    const r = partitionAlerts([a("WARNING", "fc_media_dia")], tiles("fc_media_dia"));
    expect(r.showAttentionCard).toBe(false);
    expect(r.byTile.get("fc_media_dia")).toBeTruthy();
  });

  it("1 CRITICAL sozinho → card, mesmo com tile", () => {
    const r = partitionAlerts([a("CRITICAL", "fc_repouso")], tiles("fc_repouso"));
    expect(r.showAttentionCard).toBe(true);
    // e o tile TAMBÉM marca — dado e contexto no mesmo lugar
    expect(r.byTile.get("fc_repouso")?.level).toBe("CRITICAL");
  });

  it("2 sinais leves → card consolidado", () => {
    const r = partitionAlerts(
      [a("INFO", "fc_pico"), a("WARNING", "fc_media_dia")],
      tiles("fc_pico", "fc_media_dia"),
    );
    expect(r.showAttentionCard).toBe(true);
    expect(r.attention).toHaveLength(2);
  });

  it("1 sinal leve SEM tile renderizado → card (fallback do órfão)", () => {
    // eficiência do sono não tem tile na tela
    const r = partitionAlerts([a("INFO", "eficiencia_sono")], tiles("sono"));
    expect(r.showAttentionCard).toBe(true);
  });

  it("tile é presença REAL: métrica conhecida mas sem tile hoje conta como órfã", () => {
    // sono pode ter alerta de duração sem sleep_score (tile ausente)
    const r = partitionAlerts([a("WARNING", "sono")], tiles("fc_repouso"));
    expect(r.showAttentionCard).toBe(true);
    expect(r.byTile.has("sono")).toBe(false);
  });

  it("onboarding (histórico/baseline) NUNCA conta nem dispara card", () => {
    const r = partitionAlerts(
      [
        a("INFO", null, "onboarding", "ℹ️ Histórico em construção: 3 dias.", null),
        a("INFO", null, "onboarding", "ℹ️ Baseline em construção: 3 dias.", null),
      ],
      tiles(),
    );
    expect(r.showAttentionCard).toBe(false);
    expect(r.attention).toHaveLength(0);
    expect(r.onboardingNotes).toEqual([
      "Histórico em construção: 3 dias.",
      "Baseline em construção: 3 dias.",
    ]);
  });

  it("override sozinho → card (mudou a recomendação e o aviso do hero morreu)", () => {
    const r = partitionAlerts(
      [a("WARNING", null, "override", "🟡 Override agudo aplicado.", null)],
      tiles(),
    );
    expect(r.showAttentionCard).toBe(true);
  });

  it("2+ sinais na MESMA métrica: tile mostra o mais severo e conta o resto", () => {
    const r = partitionAlerts(
      [
        a("WARNING", "hrv_aguda", "fisiologico", "🟡 HRV abaixo do basal.", "Abaixo do basal"),
        a("CRITICAL", "hrv_aguda", "fisiologico", "🔴 Queda aguda forte.", "Queda aguda forte"),
      ],
      tiles("hrv_aguda"),
    );
    const t = r.byTile.get("hrv_aguda")!;
    expect(t.level).toBe("CRITICAL");
    expect(t.label).toBe("Queda aguda forte");
    expect(t.extraCount).toBe(1);
    expect(t.messages).toHaveLength(2);
  });

  it("sem alertas → nada renderiza", () => {
    const r = partitionAlerts([], tiles("sono"));
    expect(r.showAttentionCard).toBe(false);
    expect(r.byTile.size).toBe(0);
    expect(r.onboardingNotes).toHaveLength(0);
  });
});

describe("stripAlertEmoji", () => {
  it("remove o prefixo de emoji das mensagens do motor", () => {
    expect(stripAlertEmoji("🔴 HRV criticamente baixa: descanse.")).toBe(
      "HRV criticamente baixa: descanse.",
    );
    expect(stripAlertEmoji("ℹ️ Pico de FC do dia elevado (164 bpm).")).toBe(
      "Pico de FC do dia elevado (164 bpm).",
    );
    expect(stripAlertEmoji("🟡 FC média diária acima do esperado.")).toBe(
      "FC média diária acima do esperado.",
    );
  });

  it("mensagem sem emoji passa intacta", () => {
    expect(stripAlertEmoji("Mensagem limpa.")).toBe("Mensagem limpa.");
  });
});
