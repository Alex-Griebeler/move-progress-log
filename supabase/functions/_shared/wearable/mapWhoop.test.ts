import { assertEquals } from "jsr:@std/assert";
import { assembleDailyMetrics, mapWorkouts } from "./mapWhoop.ts";
import { CYCLES, RECOVERIES, SLEEPS, WORKOUTS } from "./fixtures/whoop_v2.ts";

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

Deno.test("mapWorkouts maps scored workout fields for whoop_workouts", () => {
  const rows = mapWorkouts(WORKOUTS);
  assertEquals(rows.length, 2);
  const scored = rows[0];
  assertEquals(scored.whoop_workout_id, "7e8f13d1-6c1b-4a52-9d0e-2b4f8a91c303");
  assertEquals(scored.sport_name, "weightlifting");
  assertEquals(scored.start_datetime, "2026-07-06T14:10:00.000Z");
  assertEquals(scored.end_datetime, "2026-07-06T15:05:00.000Z");
  assertEquals(scored.strain, 8.2);
  assertEquals(scored.average_heart_rate, 121);
  assertEquals(scored.max_heart_rate, 158);
  assertEquals(scored.kilojoules, 1650.4);
});

Deno.test("mapWorkouts keeps PENDING_SCORE workouts with null score fields", () => {
  const pending = mapWorkouts(WORKOUTS)[1];
  assertEquals(pending.whoop_workout_id, "b2a4c6e8-0f1d-4e3a-8c5b-7d9f1a3c5e70");
  assertEquals(pending.sport_name, "running");
  assertEquals(pending.strain, null);
  assertEquals(pending.average_heart_rate, null);
  assertEquals(pending.max_heart_rate, null);
  assertEquals(pending.kilojoules, null);
});

Deno.test("mapWorkouts skips records without a UUID id (uuid column, nothing to key upsert on)", () => {
  const rows = mapWorkouts([{ sport_name: "rowing" }, { id: "not-a-uuid", sport_name: "cycling" }, ...WORKOUTS]);
  assertEquals(rows.length, 2);
});
