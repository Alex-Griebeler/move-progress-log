// WHOOP API v2 sample payloads — shapes verified via Context7 + docs 2026-07-07.
// Used to drive the mapper + sync tests WITHOUT a physical device.

export const CYCLES = [
  {
    id: 93845,
    user_id: 10129,
    start: "2026-07-06T06:00:00.000Z",
    end: "2026-07-07T06:00:00.000Z",
    score: { strain: 12.4, kilojoule: 8288.3 },
  },
];

export const RECOVERIES = [
  {
    cycle_id: 93845,
    sleep_id: "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
    user_id: 10129,
    score_state: "SCORED",
    score: {
      recovery_score: 66,
      resting_heart_rate: 54,
      hrv_rmssd_milli: 41.8,
      spo2_percentage: 96.1,
      skin_temp_celsius: 33.7,
    },
  },
];

export const WORKOUTS = [
  {
    id: "7e8f13d1-6c1b-4a52-9d0e-2b4f8a91c303",
    cycle_id: 93845,
    user_id: 10129,
    start: "2026-07-06T14:10:00.000Z",
    end: "2026-07-06T15:05:00.000Z",
    sport_name: "weightlifting",
    score_state: "SCORED",
    score: {
      strain: 8.2,
      average_heart_rate: 121,
      max_heart_rate: 158,
      kilojoule: 1650.4,
      percent_recorded: 100,
    },
  },
  {
    // PENDING_SCORE workout: no score object yet — mapper must not throw and
    // must upsert with null score fields (re-sync fills them once scored).
    id: "b2a4c6e8-0f1d-4e3a-8c5b-7d9f1a3c5e70",
    cycle_id: 93845,
    user_id: 10129,
    start: "2026-07-06T22:30:00.000Z",
    end: "2026-07-06T23:00:00.000Z",
    sport_name: "running",
    score_state: "PENDING_SCORE",
  },
];

export const SLEEPS = [
  {
    id: "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
    cycle_id: 93845,
    user_id: 10129,
    start: "2026-07-06T02:25:00.000Z",
    end: "2026-07-06T10:25:00.000Z",
    nap: false,
    score_state: "SCORED",
    score: {
      stage_summary: {
        total_in_bed_time_milli: 28800000,
        total_awake_time_milli: 1400000,
        total_light_sleep_time_milli: 14900000,
        total_slow_wave_sleep_time_milli: 6600000,
        total_rem_sleep_time_milli: 5880000,
        disturbance_count: 12,
      },
      respiratory_rate: 16.1,
      sleep_performance_percentage: 92,
      sleep_efficiency_percentage: 91.7,
    },
  },
];
