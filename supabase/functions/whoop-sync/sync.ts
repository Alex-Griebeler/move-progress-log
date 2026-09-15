export class RateLimited extends Error { constructor(public seconds:number){super('rate_limited');} }
import { assembleDailyMetricsByWakeDate, mapWorkouts } from '../_shared/wearable/mapWhoop.ts';
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
async function page(accessToken: string, path: string, start: string, end: string, signal: AbortSignal): Promise<Rec[]> {
  const out: Rec[] = [];
  let nextToken: string | undefined;
  const seen = new Set<string>();
  do {
    signal.throwIfAborted();
    if (nextToken && seen.has(nextToken)) throw new Error("pagination_incomplete");
    if (nextToken) seen.add(nextToken);
    if (seen.size > 200) throw new Error("pagination_incomplete");
    const url = new URL(`${WHOOP.apiBase}${path}`);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    url.searchParams.set('limit', '25');
    if (nextToken) url.searchParams.set('nextToken', nextToken);
    const res = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 429) {
      const raw=res.headers.get('Retry-After');
      const seconds=raw ? Number(raw)||Math.ceil((Date.parse(raw)-Date.now())/1000) : 60;
      throw new RateLimited(Number.isFinite(seconds)?Math.max(60,seconds):60);
    }
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    const j = await res.json();
    out.push(...(j.records ?? []));
    nextToken = j.next_token || undefined;
  } while (nextToken);
  return out;
}

// Real network fetcher (prod). Injected in tests.
export async function fetchCollectionsReal(accessToken: string, start: string, end: string, overall: AbortSignal = AbortSignal.timeout(75000)): Promise<Collections> {
  const signal = AbortSignal.any([overall, AbortSignal.timeout(75000)]);
  const [cycles, recoveries, sleeps, workouts] = await Promise.all([
    page(accessToken, '/v2/cycle', start, end, signal),
    page(accessToken, '/v2/recovery', start, end, signal),
    page(accessToken, '/v2/activity/sleep', start, end, signal),
    page(accessToken, '/v2/activity/workout', start, end, signal),
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
  const startInstant = Date.parse(args.start);
  if (!Number.isFinite(startInstant)) throw new Error('invalid_sync_start');
  try {
    const { cycles, recoveries, sleeps, workouts } = await deps.fetchCollections(args.accessToken, args.start, args.end);
    const cyclesInWindow = cycles.filter((cycle) => {
      const cycleStart = Date.parse(typeof cycle.start === 'string' ? cycle.start : '');
      return Number.isFinite(cycleStart) && cycleStart >= startInstant;
    });
    const rows = assembleDailyMetricsByWakeDate(cyclesInWindow, recoveries, sleeps)
      .map((r) => ({ ...r, student_id: args.student_id }));
    if (rows.length) {
      const { error } = await supa.rpc('replace_whoop_metrics_batch', {
        p_student_id: args.student_id,
        p_rows: rows,
      });
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
    await supa.from('whoop_sync_logs').insert({ student_id: args.student_id, status: 'failed', error_message: 'sync_failed' });
    throw e;
  }
}
