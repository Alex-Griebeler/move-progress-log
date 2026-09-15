import { assertEquals } from "jsr:@std/assert";
import { assembleDailyMetrics, assembleDailyMetricsByWakeDate, mapWorkouts } from "./mapWhoop.ts";
import { CYCLES, RECOVERIES, SLEEPS, WORKOUTS } from "./fixtures/whoop_v2.ts";

Deno.test("assembleDailyMetrics joins cycle+recovery+sleep into one daily row", () => {
  const rows = assembleDailyMetrics(CYCLES, RECOVERIES, SLEEPS, "America/Sao_Paulo");
  assertEquals(rows.length, 1);
  const r = rows[0];
  assertEquals(r.cycle_id, 93845);
  assertEquals(r.date, "2026-07-06"); // unchanged: cycle.start in São Paulo
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

Deno.test("assembleDailyMetrics dedupes cycles landing on the same labeled day (keeps most recent)", () => {
  // Real-data regression (2026-07-09): a cycle crossing local midnight plus the
  // next cycle starting the same local evening -> duplicate (student_id, date)
  // -> Postgres 21000 aborts the whole batched upsert.
  const earlier = { id: 93844, user_id: 10129, start: "2026-07-06T02:00:00.000Z", end: "2026-07-06T06:00:00.000Z", timezone_offset: "-03:00", score: { strain: 3.1, kilojoule: 1200 } };
  const rows = assembleDailyMetrics([earlier, ...CYCLES], RECOVERIES, SLEEPS, "America/Sao_Paulo");
  const dates = rows.map((r) => r.date);
  assertEquals(new Set(dates).size, dates.length); // no duplicate dates
  const day = rows.find((r) => r.date === "2026-07-06");
  assertEquals(day?.cycle_id, 93845); // most recent cycle of the day wins
  assertEquals(day?.day_strain, 12.4);
});

Deno.test("assembleDailyMetrics prefers the cycle WITH a recovery on duplicate days", () => {
  // 93846 is newer but unscored; 93845 has the recovery -> 93845 wins the day.
  const newerUnscored = { id: 93846, user_id: 10129, start: "2026-07-06T20:00:00.000Z", end: null, timezone_offset: "-03:00", score: { strain: 1.2, kilojoule: 300 } };
  const rows = assembleDailyMetrics([...CYCLES, newerUnscored], RECOVERIES, SLEEPS, "America/Sao_Paulo");
  const day = rows.find((r) => r.date === "2026-07-06");
  assertEquals(day?.cycle_id, 93845);
  assertEquals(day?.recovery_score, 66);
});

Deno.test("assembleDailyMetrics drops cycles with unparseable start", () => {
  const rows = assembleDailyMetrics([{ id: 1, start: null }, { id: 2 }, ...CYCLES], RECOVERIES, SLEEPS, "America/Sao_Paulo");
  assertEquals(rows.length, 1);
  assertEquals(rows[0].cycle_id, 93845);
});

Deno.test("mapWorkouts skips records without a UUID id (uuid column, nothing to key upsert on)", () => {
  const rows = mapWorkouts([{ sport_name: "rowing" }, { id: "not-a-uuid", sport_name: "cycling" }, ...WORKOUTS]);
  assertEquals(rows.length, 2);
});

const cycle = (id: number, start: string, timezone_offset = "-03:00") => ({
  id,
  user_id: 10129,
  start,
  timezone_offset,
  score: { strain: id / 100 },
});

const sleep = (
  id: string,
  cycle_id: number,
  end: string,
  timezone_offset = "-03:00",
  nap = false,
) => ({ id, cycle_id, user_id: 10129, start: "2026-09-14T23:00:00.000Z", end, timezone_offset, nap });

Deno.test("uses wake date for a cycle that started before midnight", () => {
  const c = cycle(1, "2026-09-15T02:30:00.000Z"); // 14/09 23:30 local
  const s = sleep("main", 1, "2026-09-15T10:00:00.000Z");
  assertEquals(assembleDailyMetricsByWakeDate([c], [], [s])[0].date, "2026-09-15");
});

Deno.test("uses the same wake date when cycle starts after midnight", () => {
  const c = cycle(1, "2026-09-15T04:00:00.000Z"); // 15/09 01:00 local
  const s = sleep("main", 1, "2026-09-15T11:00:00.000Z");
  assertEquals(assembleDailyMetricsByWakeDate([c], [], [s])[0].date, "2026-09-15");
});

Deno.test("sleep timezone offset takes precedence over cycle offset", () => {
  const c = cycle(1, "2026-09-15T04:00:00.000Z", "+10:00");
  const s = sleep("main", 1, "2026-09-15T01:00:00.000Z", "-03:00");
  assertEquals(assembleDailyMetricsByWakeDate([c], [], [s])[0].date, "2026-09-14");
});

Deno.test("unscored primary sleep still defines the date", () => {
  const c = cycle(1, "2026-09-15T02:30:00.000Z");
  const s = { ...sleep("main", 1, "2026-09-15T10:00:00.000Z"), score_state: "UNSCORABLE" };
  assertEquals(assembleDailyMetricsByWakeDate([c], [], [s])[0].date, "2026-09-15");
});

Deno.test("recovery sleep wins over another non-nap sleep in the cycle", () => {
  const c = cycle(1, "2026-09-15T02:30:00.000Z");
  const linked = sleep("linked", 1, "2026-09-15T02:00:00.000Z");
  const later = sleep("later", 1, "2026-09-16T12:00:00.000Z");
  const recovery = { cycle_id: 1, sleep_id: "linked", score_state: "SCORED" };
  assertEquals(assembleDailyMetricsByWakeDate([c], [recovery], [linked, later])[0].date, "2026-09-14");
});

Deno.test("nap linked to recovery is ignored in favor of primary sleep", () => {
  const c = cycle(1, "2026-09-15T02:30:00.000Z");
  const nap = sleep("nap", 1, "2026-09-16T12:00:00.000Z", "-03:00", true);
  const main = sleep("main", 1, "2026-09-15T10:00:00.000Z");
  const recovery = { cycle_id: 1, sleep_id: "nap", score_state: "SCORED" };
  assertEquals(assembleDailyMetricsByWakeDate([c], [recovery], [nap, main])[0].date, "2026-09-15");
});

Deno.test("cycle without recovery uses the latest non-nap sleep by cycle id", () => {
  const c = cycle(1, "2026-09-15T02:30:00.000Z");
  const nap = sleep("nap", 1, "2026-09-17T12:00:00.000Z", "-03:00", true);
  const older = sleep("older", 1, "2026-09-15T10:00:00.000Z");
  const latest = sleep("latest", 1, "2026-09-16T10:00:00.000Z");
  assertEquals(assembleDailyMetricsByWakeDate([c], [], [nap, older, latest])[0].date, "2026-09-16");
});

Deno.test("provisional date advances only after local noon", () => {
  const before = cycle(1, "2026-09-15T14:59:59.000Z"); // 11:59:59
  const noon = cycle(2, "2026-09-15T15:00:00.000Z");
  const after = cycle(3, "2026-09-15T15:00:01.000Z");
  assertEquals(assembleDailyMetricsByWakeDate([before], [], [])[0].date, "2026-09-15");
  assertEquals(assembleDailyMetricsByWakeDate([noon], [], [])[0].date, "2026-09-15");
  assertEquals(assembleDailyMetricsByWakeDate([after], [], [])[0].date, "2026-09-16");
});

Deno.test("invalid offsets do not silently fall back to Sao Paulo", () => {
  const invalidCycle = cycle(1, "2026-09-15T04:00:00.000Z", "America/Sao_Paulo");
  const invalidSleep = sleep("main", 2, "2026-09-15T11:00:00.000Z", "+99:00");
  assertEquals(assembleDailyMetricsByWakeDate([invalidCycle], [], []).length, 0);
  assertEquals(assembleDailyMetricsByWakeDate([cycle(2, "2026-09-15T04:00:00.000Z")], [], [invalidSleep])[0].date, "2026-09-15");
});

Deno.test("duplicate wake date prefers recovery, then most recent start", () => {
  const earlier = cycle(1, "2026-09-15T02:00:00.000Z");
  const newer = cycle(2, "2026-09-15T04:00:00.000Z");
  const sameDaySleeps = [
    sleep("one", 1, "2026-09-15T10:00:00.000Z"),
    sleep("two", 2, "2026-09-15T11:00:00.000Z"),
  ];
  assertEquals(assembleDailyMetricsByWakeDate([earlier, newer], [], sameDaySleeps)[0].cycle_id, 2);
  const recovery = { cycle_id: 1, sleep_id: "one", score_state: "SCORED" };
  assertEquals(assembleDailyMetricsByWakeDate([earlier, newer], [recovery], sameDaySleeps)[0].cycle_id, 1);
});
