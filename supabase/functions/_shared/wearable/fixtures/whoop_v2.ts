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
