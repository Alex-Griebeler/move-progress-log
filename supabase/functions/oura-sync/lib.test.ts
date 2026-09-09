import { assertEquals } from "jsr:@std/assert";
import {
  apiDateWindow,
  classifyOutcome,
  documentForDay,
  documentsForDay,
  hasAnyMetricValue,
  longestSleepPeriodForDay,
  lookbackDates,
  mergePreservingExisting,
  nextCalendarDay,
  previousCalendarDay,
  temperatureDeviationFrom,
  workoutsForDay,
} from "./lib.ts";

Deno.test("apiDateWindow pede D..D+1 (end_date exclusivo na API v2), inclusive na virada de mês/ano", () => {
  assertEquals(apiDateWindow("2026-09-09"), { start_date: "2026-09-09", end_date: "2026-09-10" });
  assertEquals(apiDateWindow("2026-09-30"), { start_date: "2026-09-30", end_date: "2026-10-01" });
  assertEquals(apiDateWindow("2026-12-31"), { start_date: "2026-12-31", end_date: "2027-01-01" });
  assertEquals(nextCalendarDay("2028-02-28"), "2028-02-29");
  assertEquals(previousCalendarDay("2026-03-01"), "2026-02-28");
  assertEquals(previousCalendarDay("2026-01-01", 2), "2025-12-30");
});

Deno.test("lookbackDates: hoje primeiro, depois D-1, D-2", () => {
  assertEquals(lookbackDates("2026-09-09", 2), ["2026-09-09", "2026-09-08", "2026-09-07"]);
  assertEquals(lookbackDates("2026-09-09", 0), ["2026-09-09"]);
});

Deno.test("documentForDay filtra pelo `day`: janela inclusiva ou exclusiva dá o mesmo resultado", () => {
  const exclusive = { data: [{ day: "2026-09-08", score: 81 }] };
  const inclusive = { data: [{ day: "2026-09-08", score: 81 }, { day: "2026-09-09", score: 60 }] };
  const empty = { data: [] };
  assertEquals(documentForDay(exclusive, "2026-09-08")?.score, 81);
  assertEquals(documentForDay(inclusive, "2026-09-08")?.score, 81);
  assertEquals(documentForDay(inclusive, "2026-09-09")?.score, 60);
  assertEquals(documentForDay(empty, "2026-09-08"), null);
  assertEquals(documentForDay(null, "2026-09-08"), null);
  assertEquals(documentForDay({ data: "não é lista" }, "2026-09-08"), null);
  // documento de OUTRO dia nunca é gravado como se fosse o dia pedido
  assertEquals(documentForDay({ data: [{ day: "2026-09-09", score: 60 }] }, "2026-09-08"), null);
});

Deno.test("longestSleepPeriodForDay escolhe o sono mais longo do dia e ignora naps de outro dia", () => {
  const payload = {
    data: [
      { day: "2026-09-08", type: "long_sleep", total_sleep_duration: 25000, average_hrv: 60 },
      { day: "2026-09-08", type: "late_nap", total_sleep_duration: 1800, average_hrv: 70 },
      { day: "2026-09-09", type: "long_sleep", total_sleep_duration: 30000, average_hrv: 80 },
    ],
  };
  const chosen = longestSleepPeriodForDay(payload, "2026-09-08");
  assertEquals(chosen?.total_sleep_duration, 25000);
  assertEquals(chosen?.average_hrv, 60);
  assertEquals(longestSleepPeriodForDay(payload, "2026-09-07"), null);
  assertEquals(documentsForDay(payload, "2026-09-08").length, 2);
});

Deno.test("workoutsForDay usa `day` e cai para start_datetime quando não há `day`", () => {
  const payload = {
    data: [
      { id: "w1", day: "2026-09-08", start_datetime: "2026-09-08T07:00:00-03:00" },
      { id: "w2", start_datetime: "2026-09-08T18:00:00-03:00" },
      { id: "w3", day: "2026-09-09", start_datetime: "2026-09-09T07:00:00-03:00" },
    ],
  };
  assertEquals(workoutsForDay(payload, "2026-09-08").map((w) => w.id), ["w1", "w2"]);
});

Deno.test("temperatureDeviationFrom lê o campo de topo (0 e negativo preservados); contributors não serve", () => {
  assertEquals(temperatureDeviationFrom({ temperature_deviation: -0.3, contributors: { body_temperature: 90 } }), -0.3);
  assertEquals(temperatureDeviationFrom({ temperature_deviation: 0 }), 0);
  assertEquals(temperatureDeviationFrom({ contributors: { temperature_deviation: 0.5 } }), null);
  assertEquals(temperatureDeviationFrom(null), null);
});

Deno.test("mergePreservingExisting nunca rebaixa valor existente para null", () => {
  const merged = mergePreservingExisting(
    { student_id: "s", date: "d", sleep_score: null, readiness_score: 80 },
    { student_id: "s", date: "d", sleep_score: 77, readiness_score: 70 },
  );
  assertEquals(merged, { student_id: "s", date: "d", sleep_score: 77, readiness_score: 80 });
});

Deno.test("classifyOutcome: complete/partial/no_data", () => {
  assertEquals(classifyOutcome({ student_id: "s", date: "d", sleep_score: 80, readiness_score: 75 }, false, false), "complete");
  assertEquals(classifyOutcome({ student_id: "s", date: "d", sleep_score: null, readiness_score: null, resting_heart_rate: 56 }, false, false), "partial");
  assertEquals(classifyOutcome({ student_id: "s", date: "d", sleep_score: null, readiness_score: null }, true, false), "partial");
  assertEquals(classifyOutcome({ student_id: "s", date: "d", sleep_score: null, readiness_score: null }, false, false), "no_data");
  assertEquals(classifyOutcome(null, false, false), "no_data");
});

Deno.test("hasAnyMetricValue ignora student_id/date e conta zero como valor", () => {
  assertEquals(hasAnyMetricValue({ student_id: "s", date: "d", sleep_score: null }), false);
  assertEquals(hasAnyMetricValue({ student_id: "s", date: "d", stress_high_time: 0 }), true);
  assertEquals(hasAnyMetricValue({ student_id: "s", date: "d" }), false);
});
