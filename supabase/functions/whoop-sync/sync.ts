import { assembleDailyMetrics, mapWorkouts } from '../_shared/wearable/mapWhoop.ts';
import { WHOOP } from '../_shared/wearable/providerConfig.ts';

// deno-lint-ignore no-explicit-any
type Rec = Record<string, any>;

export interface Collections {
  cycles: Rec[];
  recoveries: Rec[];
  sleeps: Rec[];
  workouts: Rec[];
}

// Paginate one WHOOP v2 collection over [start, end].
async function page(accessToken: string, path: string, start: string, end: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let nextToken: string | undefined;
  do {
    const url = new URL(`${WHOOP.apiBase}${path}`);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    url.searchParams.set('limit', '25');
    if (nextToken) url.searchParams.set('nextToken', nextToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    const j = await res.json();
    out.push(...(j.records ?? []));
    nextToken = j.next_token || undefined;
  } while (nextToken);
  return out;
}

// Real network fetcher (prod). Injected in tests.
export async function fetchCollectionsReal(accessToken: string, start: string, end: string): Promise<Collections> {
  const [cycles, recoveries, sleeps, workouts] = await Promise.all([
    page(accessToken, '/v2/cycle', start, end),
    page(accessToken, '/v2/recovery', start, end),
    page(accessToken, '/v2/activity/sleep', start, end),
    page(accessToken, '/v2/activity/workout', start, end),
  ]);
  return { cycles, recoveries, sleeps, workouts };
}

// PostgrestError is a plain object (not an Error): String(e) yields
// "[object Object]". Extract something greppable instead.
// deno-lint-ignore no-explicit-any
export function errorMessage(e: any): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const parts = [e.code, e.message, e.details, e.hint].filter(Boolean);
    if (parts.length) return parts.join(' | ');
    try { return JSON.stringify(e); } catch { /* fallthrough */ }
  }
  return String(e);
}

export interface SyncDeps {
  // deno-lint-ignore no-explicit-any
  supa: any;
  fetchCollections: (token: string, start: string, end: string) => Promise<Collections>;
}

// Fetch → map (cycle-join + workouts) → upsert whoop_metrics/whoop_workouts →
// log. The fetch layer is injected so the whole path is unit-tested against
// fixtures (no device).
export async function syncStudent(
  deps: SyncDeps,
  args: { student_id: string; start: string; end: string; accessToken: string },
): Promise<{ synced: number; workouts_synced: number }> {
  const { supa } = deps;
  try {
    const { cycles, recoveries, sleeps, workouts } = await deps.fetchCollections(args.accessToken, args.start, args.end);
    const rows = assembleDailyMetrics(cycles, recoveries, sleeps, 'America/Sao_Paulo')
      .map((r) => ({ ...r, student_id: args.student_id }));
    if (rows.length) {
      const { error } = await supa.from('whoop_metrics').upsert(rows, { onConflict: 'student_id,date' });
      if (error) throw error;
    }
    const workoutRows = mapWorkouts(workouts).map((w) => ({ ...w, student_id: args.student_id }));
    // Scored workouts overwrite on re-sync; unscored ones (PENDING_SCORE etc.,
    // all score fields null) only insert if new, so a score-less re-send can
    // never null-out a score already persisted.
    const scored = workoutRows.filter((w) => w.strain !== null || w.average_heart_rate !== null || w.max_heart_rate !== null || w.kilojoules !== null);
    const unscored = workoutRows.filter((w) => !scored.includes(w));
    if (scored.length) {
      const { error } = await supa.from('whoop_workouts').upsert(scored, { onConflict: 'student_id,whoop_workout_id' });
      if (error) throw error;
    }
    if (unscored.length) {
      const { error } = await supa.from('whoop_workouts').upsert(unscored, { onConflict: 'student_id,whoop_workout_id', ignoreDuplicates: true });
      if (error) throw error;
    }
    await supa.from('whoop_sync_logs').insert({
      student_id: args.student_id,
      status: 'success',
      metrics_synced: rows.length,
      workouts_synced: workoutRows.length,
    });
    return { synced: rows.length, workouts_synced: workoutRows.length };
  } catch (e) {
    await supa.from('whoop_sync_logs').insert({ student_id: args.student_id, status: 'failed', error_message: errorMessage(e) });
    throw e;
  }
}
