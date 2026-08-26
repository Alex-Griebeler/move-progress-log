/**
 * PR-1 do redesign — invariantes source-based da fundação de métricas.
 *
 * Cobre:
 *   • tokens --chart-1..5 definidos nos DOIS temas do index.css (os cards
 *     Oura já referenciavam chart-1..4 sem que os tokens existissem);
 *   • grupo `chart` mapeado no tailwind.config (senão bg-chart-N não gera CSS);
 *   • componentes sem cor hardcoded (hex) e sem emoji — coerência ratificada;
 *   • TrendChart com UM eixo Y (nunca dual-axis);
 *   • componentes intocáveis (StatCard/WorkoutCard/PrescriptionCard) sem
 *     import da nova pasta metrics — fundação é aditiva.
 */

import { readFileSync, readdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../../..");
const metricsDir = resolve(__dirname, "..");

const read = (p: string) => readFileSync(p, "utf-8");
const indexCss = read(resolve(root, "src/index.css"));
const tailwindConfig = read(resolve(root, "tailwind.config.ts"));

const componentFiles = readdirSync(metricsDir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => [f, read(resolve(metricsDir, f))] as const);

describe("tokens --chart-1..5", () => {
  it("definidos 2x (tema claro e escuro)", () => {
    for (let n = 1; n <= 5; n++) {
      const occurrences = indexCss.match(new RegExp(`--chart-${n}:`, "g")) ?? [];
      expect(occurrences.length, `--chart-${n}`).toBe(2);
    }
  });

  it("grupo chart mapeado no tailwind (bg-chart-N passa a gerar CSS)", () => {
    expect(tailwindConfig).toContain('"1": "hsl(var(--chart-1))"');
    expect(tailwindConfig).toContain('"5": "hsl(var(--chart-5))"');
  });
});

describe("componentes da fundação", () => {
  const expected = [
    "ScoreRing.tsx",
    "MetricTile.tsx",
    "TrendChart.tsx",
    "WeekBars.tsx",
    "RefRangeBar.tsx",
    "DataErrorState.tsx",
    "StaleBadge.tsx",
  ];

  it("todos os 7 existem", () => {
    const names = componentFiles.map(([f]) => f);
    for (const f of expected) expect(names).toContain(f);
  });

  it("zero cor hardcoded (hex) — só tokens", () => {
    for (const [name, src] of componentFiles) {
      expect(src, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it("zero emoji como UI", () => {
    for (const [name, src] of componentFiles) {
      expect(src, name).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it("TrendChart tem UM eixo Y (nunca dual-axis)", () => {
    const trend = read(resolve(metricsDir, "TrendChart.tsx"));
    // 1 declaração compartilhada entre os 3 tipos de gráfico.
    expect(trend.match(/<YAxis/g)?.length ?? 0).toBe(1);
    expect(trend).not.toContain("yAxisId");
  });

  it("StaleBadge usa util local-safe de data (não new Date(string) cru)", () => {
    const badge = read(resolve(metricsDir, "StaleBadge.tsx"));
    expect(badge).toContain('from "@/utils/relativeDate"');
  });
});

describe("fundação é aditiva — intocáveis sem import de metrics", () => {
  const untouchable = ["StatCard.tsx", "WorkoutCard.tsx", "PrescriptionCard.tsx"];
  it.each(untouchable)("%s não importa components/metrics", (file) => {
    const src = read(resolve(root, "src/components", file));
    expect(src).not.toContain("components/metrics");
  });
});
