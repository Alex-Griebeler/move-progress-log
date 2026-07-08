import { assertEquals } from "jsr:@std/assert";
import { assembleDailyMetrics } from "./mapWhoop.ts";
import { CYCLES, RECOVERIES, SLEEPS } from "./fixtures/whoop_v2.ts";

Deno.test("assembleDailyMetrics joins cycle+recovery+sleep into one daily row", () => {
  const rows = assembleDailyMetrics(CYCLES, RECOVERIES, SLEEPS, "America/Sao_Paulo");
  assertEquals(rows.length, 1);
  const r = rows[0];
  assertEquals(r.cycle_id, 93845);
  assertEquals(r.date, "2026-07-06"); // cycle.start in São Paulo (UTC-3)
  assertEquals(r.recovery_score, 66);
  assertEquals(r.hrv_rmssd, 41.8);
  assertEquals(r.resting_heart_rate, 54);
  assertEquals(r.day_strain, 12.4);
  assertEquals(r.sleep_performance, 92);
  assertEquals(r.deep_sleep_duration, 6600); // slow-wave ms -> s
  assertEquals(r.rem_sleep_duration, 5880);
  assertEquals(r.light_sleep_duration, 14900);
  assertEquals(r.total_sleep_duration, 27380); // light+sws+rem
});

Deno.test("assembleDailyMetrics tolerates missing recovery/sleep (nulls, no throw)", () => {
  const rows = assembleDailyMetrics(CYCLES, [], [], "America/Sao_Paulo");
  assertEquals(rows.length, 1);
  assertEquals(rows[0].recovery_score, null);
  assertEquals(rows[0].total_sleep_duration, null);
  assertEquals(rows[0].day_strain, 12.4); // cycle-level data still present
});
