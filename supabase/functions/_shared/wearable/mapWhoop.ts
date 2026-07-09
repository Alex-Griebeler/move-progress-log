// Normalizes WHOOP's cycle-based v2 data into one daily metrics row.
// A "day" = a physiological cycle; we join the cycle to its recovery (by
// cycle_id) and its sleep (by recovery.sleep_id, falling back to sleep.cycle_id).

export interface WhoopMetricRow {
  student_id?: string;
  date: string;
  cycle_id: number;
  recovery_score: number | null;
  hrv_rmssd: number | null;
  resting_heart_rate: number | null;
  spo2: number | null;
  skin_temp: number | null;
  day_strain: number | null;
  kilojoules: number | null;
  sleep_performance: number | null;
  sleep_efficiency: number | null;
  respiratory_rate: number | null;
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  light_sleep_duration: number | null;
  awake_time: number | null;
  disturbance_count: number | null;
  score_state: string | null;
}

// deno-lint-ignore no-explicit-any
type Rec = Record<string, any>;

const msToS = (v: unknown): number | null =>
  typeof v === "number" ? Math.round(v / 1000) : null;

const dateInTz = (iso: string, tz: string): string =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(new Date(iso));

export function assembleDailyMetrics(
  cycles: Rec[],
  recoveries: Rec[],
  sleeps: Rec[],
  tz: string,
): WhoopMetricRow[] {
  const recByCycle = new Map<number, Rec>(recoveries.map((r) => [r.cycle_id, r]));
  const sleepById = new Map<string, Rec>(sleeps.map((s) => [s.id, s]));
  const sleepByCycle = new Map<number, Rec>(sleeps.map((s) => [s.cycle_id, s]));

  // whoop_metrics is UNIQUE (student_id, date): two cycles whose start falls
  // on the same local day (a cycle crossing local midnight, then the next one
  // starting that evening) would produce duplicate dates and abort the whole
  // batched upsert with Postgres 21000 ("ON CONFLICT DO UPDATE command cannot
  // affect row a second time" — hit with real WHOOP data on 2026-07-09).
  // Per local day keep the cycle that HAS a recovery (that one describes the
  // day's readiness); among equals, the most recent start wins. Cycles with
  // unparseable start are dropped (nothing to key the date on).
  const startMs = (c: Rec): number => Date.parse(String(c?.start ?? ''));
  const byDay = new Map<string, Rec>();
  for (const c of cycles) {
    if (!Number.isFinite(startMs(c))) continue;
    const day = dateInTz(c.start, tz);
    const prev = byDay.get(day);
    if (!prev) { byDay.set(day, c); continue; }
    const cScore = recByCycle.has(c.id) ? 1 : 0;
    const prevScore = recByCycle.has(prev.id) ? 1 : 0;
    if (cScore > prevScore || (cScore === prevScore && startMs(c) > startMs(prev))) byDay.set(day, c);
  }

  return Array.from(byDay.values()).map((c) => {
    const rec = recByCycle.get(c.id);
    const sleep = (rec?.sleep_id && sleepById.get(rec.sleep_id)) || sleepByCycle.get(c.id);
    const rs = rec?.score ?? {};
    const ss = sleep?.score ?? {};
    const stg = ss.stage_summary ?? {};

    const deep = msToS(stg.total_slow_wave_sleep_time_milli);
    const rem = msToS(stg.total_rem_sleep_time_milli);
    const light = msToS(stg.total_light_sleep_time_milli);
    const total = [deep, rem, light].every((v) => v !== null)
      ? (deep as number) + (rem as number) + (light as number)
      : null;

    return {
      date: dateInTz(c.start, tz),
      cycle_id: c.id,
      recovery_score: rs.recovery_score ?? null,
      hrv_rmssd: rs.hrv_rmssd_milli ?? null,
      resting_heart_rate: rs.resting_heart_rate ?? null,
      spo2: rs.spo2_percentage ?? null,
      skin_temp: rs.skin_temp_celsius ?? null,
      day_strain: c.score?.strain ?? null,
      kilojoules: c.score?.kilojoule ?? null,
      sleep_performance: ss.sleep_performance_percentage ?? null,
      sleep_efficiency: ss.sleep_efficiency_percentage ?? null,
      respiratory_rate: ss.respiratory_rate ?? null,
      total_sleep_duration: total,
      deep_sleep_duration: deep,
      rem_sleep_duration: rem,
      light_sleep_duration: light,
      awake_time: msToS(stg.total_awake_time_milli),
      disturbance_count: stg.disturbance_count ?? null,
      score_state: rec?.score_state ?? sleep?.score_state ?? null,
    };
  });
}

// Row shape for public.whoop_workouts (UNIQUE (student_id, whoop_workout_id)).
export interface WhoopWorkoutRow {
  student_id?: string;
  whoop_workout_id: string;
  sport_name: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  strain: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  kilojoules: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Normalizes WHOOP v2 workout records into whoop_workouts rows. Records
// without a UUID id are skipped (whoop_workout_id is a uuid column — one
// malformed id would abort the whole upsert); PENDING_SCORE / UNSCORABLE
// workouts keep null score fields and get filled on a later sync.
export function mapWorkouts(workouts: Rec[]): WhoopWorkoutRow[] {
  return workouts
    .filter((w) => typeof w.id === "string" && UUID_RE.test(w.id))
    .map((w) => ({
      whoop_workout_id: w.id,
      sport_name: w.sport_name ?? null,
      start_datetime: w.start ?? null,
      end_datetime: w.end ?? null,
      strain: w.score?.strain ?? null,
      average_heart_rate: w.score?.average_heart_rate ?? null,
      max_heart_rate: w.score?.max_heart_rate ?? null,
      kilojoules: w.score?.kilojoule ?? null,
    }));
}
