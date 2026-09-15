import { assertEquals } from "jsr:@std/assert";
import { errorMessage, syncStudent } from "./sync.ts";
import { CYCLES, RECOVERIES, SLEEPS, WORKOUTS } from "../_shared/wearable/fixtures/whoop_v2.ts";

Deno.test("syncStudent maps wake date → metrics RPC + unchanged workout upserts + success log", async () => {
  // deno-lint-ignore no-explicit-any
  const calls: { rpcs: any[]; upserts: any[]; logs: any[] } = { rpcs: [], upserts: [], logs: [] };
  const supa = {
    // deno-lint-ignore no-explicit-any
    rpc(name: string, params: any) {
      calls.rpcs.push({ name, params });
      return Promise.resolve({ error: null });
    },
    from(table: string) {
      return {
        // deno-lint-ignore no-explicit-any
        upsert(rows: any[], opts: any) {
          calls.upserts.push({ table, rows, opts });
          return Promise.resolve({ error: null });
        },
        // deno-lint-ignore no-explicit-any
        insert(row: any) {
          calls.logs.push({ table, row });
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  const cycles = [{
    ...CYCLES[0],
    start: "2026-09-15T02:10:00.000Z",
    timezone_offset: "-03:00",
  }];
  const sleeps = [{
    ...SLEEPS[0],
    end: "2026-09-15T09:40:00.000Z",
    timezone_offset: "-03:00",
  }];

  const res = await syncStudent(
    { supa, fetchCollections: () => Promise.resolve({ cycles, recoveries: RECOVERIES, sleeps, workouts: WORKOUTS }) },
    { student_id: "s1", start: "2026-06-07", end: "2026-07-07", accessToken: "a" },
  );

  assertEquals(res.synced, 1);
  assertEquals(res.workouts_synced, 2);
  assertEquals(calls.rpcs.length, 1);
  assertEquals(calls.rpcs[0].name, "replace_whoop_metrics_batch");
  assertEquals(calls.rpcs[0].params.p_student_id, "s1");
  assertEquals(calls.rpcs[0].params.p_rows[0].date, "2026-09-15");
  assertEquals(calls.rpcs[0].params.p_rows[0].recovery_score, 66);
  assertEquals(calls.rpcs[0].params.p_rows[0].student_id, "s1");
  // Scored workouts: plain upsert (overwrites on re-sync).
  assertEquals(calls.upserts[0].table, "whoop_workouts");
  assertEquals(calls.upserts[0].opts.onConflict, "student_id,whoop_workout_id");
  assertEquals(calls.upserts[0].opts.ignoreDuplicates, undefined);
  assertEquals(calls.upserts[0].rows.length, 1);
  assertEquals(calls.upserts[0].rows[0].whoop_workout_id, "7e8f13d1-6c1b-4a52-9d0e-2b4f8a91c303");
  assertEquals(calls.upserts[0].rows[0].strain, 8.2);
  assertEquals(calls.upserts[0].rows[0].student_id, "s1");
  // Unscored workouts: insert-if-new only, never overwrite a persisted score.
  assertEquals(calls.upserts[1].table, "whoop_workouts");
  assertEquals(calls.upserts[1].opts.ignoreDuplicates, true);
  assertEquals(calls.upserts[1].rows.length, 1);
  assertEquals(calls.upserts[1].rows[0].strain, null); // PENDING_SCORE kept, nulls
  assertEquals(calls.logs[0].table, "whoop_sync_logs");
  assertEquals(calls.logs[0].row.status, "success");
  assertEquals(calls.logs[0].row.metrics_synced, 1);
  assertEquals(calls.logs[0].row.workouts_synced, 2);
});

Deno.test("syncStudent excludes a cycle that started before the window and includes one at its boundary", async () => {
  // deno-lint-ignore no-explicit-any
  const rpcs: any[] = [];
  const supa = {
    // deno-lint-ignore no-explicit-any
    rpc(name: string, params: any) {
      rpcs.push({ name, params });
      return Promise.resolve({ error: null });
    },
    from() {
      return {
        upsert() { return Promise.resolve({ error: null }); },
        insert() { return Promise.resolve({ error: null }); },
      };
    },
  };
  const before = {
    ...CYCLES[0],
    id: 1774162568,
    start: "2026-09-06T23:59:59.999Z",
  };
  const boundary = {
    ...CYCLES[0],
    id: 1774162569,
    start: "2026-09-07T00:00:00.000Z",
  };

  const result = await syncStudent(
    {
      supa,
      fetchCollections: () => Promise.resolve({
        cycles: [before, boundary],
        recoveries: [],
        sleeps: [],
        workouts: [],
      }),
    },
    { student_id: "s1", start: "2026-09-07T00:00:00.000Z", end: "2026-09-15T23:59:59.999Z", accessToken: "a" },
  );

  assertEquals(result.synced, 1);
  assertEquals(rpcs.length, 1);
  assertEquals(rpcs[0].params.p_rows.length, 1);
  assertEquals(rpcs[0].params.p_rows[0].cycle_id, 1774162569);
});

Deno.test("syncStudent does not call metrics RPC when every cycle started before the window", async () => {
  // deno-lint-ignore no-explicit-any
  const calls: { rpcs: any[]; upserts: any[]; logs: any[] } = { rpcs: [], upserts: [], logs: [] };
  const supa = {
    // deno-lint-ignore no-explicit-any
    rpc(name: string, params: any) {
      calls.rpcs.push({ name, params });
      return Promise.resolve({ error: null });
    },
    from(table: string) {
      return {
        // deno-lint-ignore no-explicit-any
        upsert(rows: any[], opts: any) {
          calls.upserts.push({ table, rows, opts });
          return Promise.resolve({ error: null });
        },
        // deno-lint-ignore no-explicit-any
        insert(row: any) {
          calls.logs.push({ table, row });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  const oldCycle = { ...CYCLES[0], start: "2026-09-06T23:59:59.999Z" };

  const result = await syncStudent(
    { supa, fetchCollections: () => Promise.resolve({ cycles: [oldCycle], recoveries: [], sleeps: [], workouts: WORKOUTS }) },
    { student_id: "s1", start: "2026-09-07T00:00:00.000Z", end: "2026-09-15T23:59:59.999Z", accessToken: "a" },
  );

  assertEquals(result.synced, 0);
  assertEquals(result.workouts_synced, 2);
  assertEquals(calls.rpcs.length, 0);
  assertEquals(calls.logs[0].row.status, "success");
  assertEquals(calls.logs[0].row.metrics_synced, 0);
  assertEquals(calls.logs[0].row.workouts_synced, 2);
  assertEquals(calls.upserts.length, 2);
  assertEquals(calls.upserts[0].table, "whoop_workouts");
  assertEquals(calls.upserts[1].table, "whoop_workouts");
});

Deno.test("syncStudent rejects an invalid start before fetching or writing", async () => {
  let fetched = false;
  let wrote = false;
  const supa = {
    rpc() { wrote = true; return Promise.resolve({ error: null }); },
    from() {
      return {
        upsert() { wrote = true; return Promise.resolve({ error: null }); },
        insert() { wrote = true; return Promise.resolve({ error: null }); },
      };
    },
  };
  let message = "";
  try {
    await syncStudent(
      {
        supa,
        fetchCollections: () => {
          fetched = true;
          return Promise.resolve({ cycles: [], recoveries: [], sleeps: [], workouts: [] });
        },
      },
      { student_id: "s1", start: "not-a-date", end: "2026-09-15", accessToken: "a" },
    );
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assertEquals(message, "invalid_sync_start");
  assertEquals(fetched, false);
  assertEquals(wrote, false);
});

Deno.test("syncStudent logs a failure row and rethrows when the fetch fails", async () => {
  // deno-lint-ignore no-explicit-any
  const logs: any[] = [];
  const supa = {
    from() {
      return {
        // deno-lint-ignore no-explicit-any
        upsert() { return Promise.resolve({ error: null }); },
        // deno-lint-ignore no-explicit-any
        insert(row: any) { logs.push(row); return Promise.resolve({ error: null }); },
      };
    },
  };
  let threw = false;
  try {
    await syncStudent(
      { supa, fetchCollections: () => Promise.reject(new Error("boom")) },
      { student_id: "s1", start: "2026-09-07", end: "2026-09-15", accessToken: "a" },
    );
  } catch (_e) {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(logs[0].status, "failed");
});

Deno.test("errorMessage extracts PostgrestError fields instead of [object Object]", () => {
  assertEquals(
    errorMessage({ code: "21000", message: "ON CONFLICT DO UPDATE command cannot affect row a second time", details: null, hint: "Ensure no duplicates" }),
    "21000 | ON CONFLICT DO UPDATE command cannot affect row a second time | Ensure no duplicates",
  );
  assertEquals(errorMessage(new Error("boom")), "boom");
  assertEquals(errorMessage("plain"), "plain");
});

Deno.test("syncStudent logs a failure row and rethrows when the metrics RPC fails", async () => {
  // deno-lint-ignore no-explicit-any
  const logs: any[] = [];
  const supa = {
    rpc() {
      return Promise.resolve({ error: { code: "22023", message: "invalid metrics batch", hint: null, details: null } });
    },
    from() {
      return {
        upsert() { return Promise.resolve({ error: null }); },
        // deno-lint-ignore no-explicit-any
        insert(row: any) { logs.push(row); return Promise.resolve({ error: null }); },
      };
    },
  };
  let threw = false;
  try {
    await syncStudent(
      { supa, fetchCollections: () => Promise.resolve({ cycles: CYCLES, recoveries: RECOVERIES, sleeps: SLEEPS, workouts: [] }) },
      { student_id: "s1", start: "2026-07-01", end: "2026-07-07", accessToken: "a" },
    );
  } catch (_e) { threw = true; }
  assertEquals(threw, true);
  assertEquals(logs[0].status, "failed");
  assertEquals(logs[0].error_message, "sync_failed");
});
