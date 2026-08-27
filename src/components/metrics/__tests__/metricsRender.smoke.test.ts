/**
 * Smoke de render da fundação — renderToString em Node (sem jsdom, por
 * decisão do plano: nenhuma infra de teste nova). Garante que cada
 * componente monta sem crash com props mínimas e com props nulas.
 */

import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScoreRing } from "../ScoreRing";
import { MetricTile } from "../MetricTile";
import { WeekBars } from "../WeekBars";
import { RefRangeBar } from "../RefRangeBar";
import { DataErrorState } from "../DataErrorState";
import { StaleBadge } from "../StaleBadge";
import { TrendChart } from "../TrendChart";

describe("smoke renderToString", () => {
  it("ScoreRing com valor e nulo", () => {
    expect(renderToString(h(ScoreRing, { value: 81, label: "prontidão" }))).toContain("81");
    expect(renderToString(h(ScoreRing, { value: null }))).toContain("—");
  });

  it("ScoreRing normaliza fora-de-faixa e não-finito (fix pós-review)", () => {
    // Texto, arco e aria contam a mesma história: 120 → 100; NaN → sem dado.
    const over = renderToString(h(ScoreRing, { value: 120 }));
    expect(over).toContain(">100<");
    expect(over).not.toContain("120");
    const nan = renderToString(h(ScoreRing, { value: NaN }));
    expect(nan).toContain("—");
    expect(nan).not.toContain("NaN");
  });

  it("MetricTile completo e vazio", () => {
    const full = renderToString(
      h(MetricTile, {
        label: "Sono",
        value: 92,
        delta: { text: "+4 vs 7d", direction: "up", positive: true },
        footnote: "ótimo",
      }),
    );
    expect(full).toContain("Sono");
    expect(full).toContain("+4 vs 7d");
    expect(renderToString(h(MetricTile, { label: "HRV", value: null }))).toContain("—");
  });

  it("MetricTile preenche a altura da linha do grid (tiles irmãos simétricos)", () => {
    // Num grid, uns tiles têm footnote/sparkline e outros não. Sem h-full o
    // card mantém a altura do próprio conteúdo e a linha fica desalinhada,
    // com buraco embaixo dos menores.
    const semFootnote = renderToString(h(MetricTile, { label: "FC média", value: 71 }));
    const comFootnote = renderToString(
      h(MetricTile, { label: "FC repouso", value: 65, footnote: "abaixo = melhor" }),
    );
    for (const out of [semFootnote, comFootnote]) {
      expect(out).toMatch(/class="[^"]*h-full/);
      expect(out).toMatch(/class="[^"]*flex-col/);
    }
    // e o footnote é ancorado no rodapé, pra alinhar entre tiles que o tenham
    expect(comFootnote).toMatch(/class="[^"]*mt-auto/);
  });

  it("WeekBars com meta atingida", () => {
    const out = renderToString(
      h(WeekBars, {
        weeks: [
          { label: "18/08", value: 3, target: 3 },
          { label: "25/08", value: 1, target: 3 },
        ],
      }),
    );
    expect(out).toContain("18/08");
  });

  it("RefRangeBar com e sem valor", () => {
    const bands = [
      { label: "Alerta", from: 0, to: 3, tone: "destructive" as const },
      { label: "Bom", from: 3, to: 10, tone: "success" as const },
    ];
    expect(renderToString(h(RefRangeBar, { bands, value: 8.5, min: 0, max: 10 }))).toContain("Alerta");
    expect(() => renderToString(h(RefRangeBar, { bands, value: null, min: 0, max: 10 }))).not.toThrow();
  });

  it("RefRangeBar posiciona banda por `from` absoluto (fix pós-review: flex empacotava errado faixas não-contíguas)", () => {
    // Bandas NÃO-contíguas: a segunda começa em 6, não onde a primeira termina.
    const gapped = [
      { label: "Baixo", from: 0, to: 3, tone: "destructive" as const },
      { label: "Alto", from: 6, to: 10, tone: "success" as const },
    ];
    const out = renderToString(h(RefRangeBar, { bands: gapped, value: 10, min: 0, max: 10 }));
    expect(out).toContain("left:60%");
    // Marcador em value === max presente (não clipado pelo trilho).
    expect(out).toContain("left:100%");
  });

  it("DataErrorState com retry omitido (SSR não tem handler)", () => {
    // SSR intercala <!-- --> entre text nodes — asserta as duas metades.
    const out = renderToString(h(DataErrorState, { what: "as métricas" }));
    expect(out).toContain("Não foi possível carregar");
    expect(out).toContain("as métricas");
  });

  it("StaleBadge relativo com fonte", () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(renderToString(h(StaleBadge, { date: iso, source: "Oura" }))).toContain("Oura · hoje");
  });

  it("TrendChart nos 3 tipos não explode em SSR", () => {
    const data = [
      { date: "2026-08-20", value: 80 },
      { date: "2026-08-21", value: null },
      { date: "2026-08-22", value: 85 },
    ];
    for (const kind of ["line", "area", "bar"] as const) {
      expect(() => renderToString(h(TrendChart, { data, kind }))).not.toThrow();
    }
  });
});
