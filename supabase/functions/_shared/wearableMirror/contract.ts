// Contrato v1 do espelho Oura/Whoop (docs/ESPELHO_WEARABLES.md). O MESMO arquivo vai para a
// função exportadora da Fabrik e para o importador do app pessoal: os dois lados validam a mesma
// forma. Campo desconhecido é erro (deriva de contrato não passa em silêncio) e qualquer chave com
// "token"/"secret" é recusada em qualquer profundidade.

export const MIRROR_SCHEMA_VERSION = 1;
export const MIRROR_DESTINATION_APP = "ag_performance";
export const MIRROR_WINDOW_DAYS = 90;
export const MIRROR_MAX_GRANTS = 30;

export type MirrorProvider = "oura" | "whoop";
export const MIRROR_PROVIDERS: readonly MirrorProvider[] = ["oura", "whoop"];

export type MirrorProjection = "oura_metrics" | "oura_acute_metrics" | "whoop_metrics";

/** Colunas transportadas por projeção (além de `date`). Nada fora daqui cruza entre os apps. */
export const MIRROR_COLUMNS: Record<MirrorProjection, readonly string[]> = {
  oura_metrics: [
    "readiness_score", "sleep_score", "total_sleep_duration", "sleep_efficiency", "average_sleep_hrv",
    "resting_heart_rate", "stress_high_time", "active_calories", "temperature_deviation", "activity_score", "steps",
  ],
  oura_acute_metrics: [
    "hrv_night_last", "hrv_night_min", "hr_day_max", "hr_day_avg", "samples_count_hrv", "samples_count_hr_day",
  ],
  whoop_metrics: [
    "recovery_score", "score_state", "sleep_performance", "total_sleep_duration", "sleep_efficiency", "hrv_rmssd",
    "resting_heart_rate", "day_strain",
  ],
};

/** Colunas inteiras no destino: decimal nelas quebraria a aplicação inteira do cliente. */
const INTEGER_COLUMNS = new Set([
  "readiness_score", "sleep_score", "total_sleep_duration", "resting_heart_rate", "stress_high_time",
  "active_calories", "activity_score", "steps", "hr_day_max", "samples_count_hrv", "samples_count_hr_day",
  "recovery_score", "sleep_performance",
]);
const TEXT_COLUMNS = new Set(["score_state"]);
/** Faixas com CHECK no banco de destino: fora delas, o upsert do cliente inteiro falharia. */
const RANGE_0_100 = new Set(["readiness_score", "sleep_score"]);

const PROJECTIONS_BY_PROVIDER: Record<MirrorProvider, MirrorProjection[]> = {
  oura: ["oura_metrics", "oura_acute_metrics"],
  whoop: ["whoop_metrics"],
};

export type MirrorConnectionState = "connected" | "not_connected" | "inactive";

export interface MirrorConnection {
  state: MirrorConnectionState;
  connected_at: string | null;
  last_sync_at: string | null;
}

export type MirrorRow = { date: string } & Record<string, number | string | null>;

export interface MirrorProjectionPayload {
  complete: boolean;
  count: number;
  rows: MirrorRow[];
}

export interface MirrorGrant {
  grant_id: string;
  revision: number;
  destination_student_id: string;
  source_student_id: string | null;
  providers: MirrorProvider[];
  history_from: string | null;
  revoked_at: string | null;
  period: { from: string; to: string } | null;
  connections: Partial<Record<MirrorProvider, MirrorConnection>>;
  projections: Partial<Record<MirrorProjection, MirrorProjectionPayload>>;
}

export interface MirrorSnapshot {
  schema_version: 1;
  destination_app: typeof MIRROR_DESTINATION_APP;
  snapshot_seq: number;
  generated_at: string;
  scope: "all" | "one";
  manifest_complete: boolean;
  grants: MirrorGrant[];
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Autorização descartada por não seguir o contrato (as outras seguem para aplicação). */
export interface RejectedGrant {
  index: number;
  grant_id: string | null;
  error: string;
}

export interface ParsedSnapshot {
  snapshot: MirrorSnapshot;
  rejected: RejectedGrant[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isIsoDateTime = (v: unknown) => typeof v === "string" && !Number.isNaN(Date.parse(v)) && v.includes("T");
const isDate = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

class ContractError extends Error {}
const fail = (msg: string): never => {
  throw new ContractError(msg);
};

function assertOnlyKeys(obj: Record<string, unknown>, allowed: readonly string[], where: string) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) fail(`${where}: campo não previsto "${key}"`);
  }
}

function assertNoSecrets(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoSecrets(v, `${path}[${i}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, v] of Object.entries(value)) {
    if (/token|secret|password|apikey|api_key/i.test(key)) fail(`${path}.${key}: chave proibida no contrato`);
    assertNoSecrets(v, `${path}.${key}`);
  }
}

function parseConnection(raw: unknown, where: string): MirrorConnection {
  if (!isObject(raw)) fail(`${where}: conexão inválida`);
  const obj = raw as Record<string, unknown>;
  assertOnlyKeys(obj, ["state", "connected_at", "last_sync_at"], where);
  if (!["connected", "not_connected", "inactive"].includes(obj.state as string)) fail(`${where}.state inválido`);
  for (const key of ["connected_at", "last_sync_at"] as const) {
    if (obj[key] !== null && obj[key] !== undefined && !isIsoDateTime(obj[key])) fail(`${where}.${key} inválido`);
  }
  return {
    state: obj.state as MirrorConnectionState,
    connected_at: (obj.connected_at as string | null | undefined) ?? null,
    last_sync_at: (obj.last_sync_at as string | null | undefined) ?? null,
  };
}

function parseProjection(
  raw: unknown,
  projection: MirrorProjection,
  period: { from: string; to: string },
  where: string,
): MirrorProjectionPayload {
  if (!isObject(raw)) fail(`${where}: projeção ausente`);
  const obj = raw as Record<string, unknown>;
  assertOnlyKeys(obj, ["complete", "count", "rows"], where);
  if (typeof obj.complete !== "boolean") fail(`${where}.complete deve ser booleano`);
  if (!Array.isArray(obj.rows)) fail(`${where}.rows deve ser lista`);
  const rows = obj.rows as unknown[];
  if (obj.count !== rows.length) fail(`${where}.count (${String(obj.count)}) difere de rows (${rows.length})`);
  if (rows.length > MIRROR_WINDOW_DAYS + 1) fail(`${where}: mais linhas que a janela`);
  const allowed = ["date", ...MIRROR_COLUMNS[projection]];
  const seen = new Set<string>();
  const parsed = rows.map((row, i) => {
    const w = `${where}.rows[${i}]`;
    if (!isObject(row)) fail(`${w}: linha inválida`);
    const r = row as Record<string, unknown>;
    assertOnlyKeys(r, allowed, w);
    if (!isDate(r.date)) fail(`${w}.date inválida`);
    const date = r.date as string;
    if (date < period.from || date > period.to) fail(`${w}.date fora do período`);
    if (seen.has(date)) fail(`${w}.date repetida`);
    seen.add(date);
    for (const col of MIRROR_COLUMNS[projection]) {
      // Toda coluna presente (nulo explícito vale): campo renomeado na origem não some calado.
      if (!(col in r)) fail(`${w}.${col} ausente`);
      const v = r[col];
      if (v === null) continue;
      if (TEXT_COLUMNS.has(col)) {
        if (typeof v !== "string" || v.length > 40) fail(`${w}.${col} deve ser texto curto`);
      } else if (typeof v !== "number" || !Number.isFinite(v)) {
        fail(`${w}.${col} deve ser número`);
      } else if (INTEGER_COLUMNS.has(col) && !Number.isInteger(v)) {
        fail(`${w}.${col} deve ser inteiro`);
      } else if (RANGE_0_100.has(col) && (v < 0 || v > 100)) {
        fail(`${w}.${col} fora de 0–100`);
      }
    }
    return r as MirrorRow;
  });
  return { complete: obj.complete as boolean, count: rows.length, rows: parsed };
}

function parseGrant(raw: unknown, where: string): MirrorGrant {
  if (!isObject(raw)) fail(`${where}: autorização inválida`);
  const obj = raw as Record<string, unknown>;
  assertOnlyKeys(obj, [
    "grant_id", "revision", "destination_student_id", "source_student_id", "providers", "history_from",
    "revoked_at", "period", "connections", "projections",
  ], where);
  if (!UUID_RE.test(String(obj.grant_id))) fail(`${where}.grant_id inválido`);
  if (!UUID_RE.test(String(obj.destination_student_id))) fail(`${where}.destination_student_id inválido`);
  if (obj.source_student_id != null && !UUID_RE.test(String(obj.source_student_id))) fail(`${where}.source_student_id inválido`);
  if (!Number.isSafeInteger(obj.revision) || (obj.revision as number) < 0) fail(`${where}.revision inválida`);
  if (!Array.isArray(obj.providers) || obj.providers.some((p) => !MIRROR_PROVIDERS.includes(p as MirrorProvider))) {
    fail(`${where}.providers inválido`);
  }
  const providers = [...new Set(obj.providers as MirrorProvider[])];
  if (obj.history_from != null && !isDate(obj.history_from)) fail(`${where}.history_from inválido`);
  if (obj.revoked_at != null && !isIsoDateTime(obj.revoked_at)) fail(`${where}.revoked_at inválido`);

  const base = {
    grant_id: String(obj.grant_id),
    revision: obj.revision as number,
    destination_student_id: String(obj.destination_student_id),
    source_student_id: (obj.source_student_id as string | null | undefined) ?? null,
    providers,
    history_from: (obj.history_from as string | null | undefined) ?? null,
    revoked_at: (obj.revoked_at as string | null | undefined) ?? null,
  };

  // Revogada: só a identidade e a data; nenhuma métrica pode vir junto.
  if (base.revoked_at) {
    if (obj.projections != null && isObject(obj.projections) && Object.keys(obj.projections).length > 0) {
      fail(`${where}: autorização revogada não pode trazer métricas`);
    }
    return { ...base, period: null, connections: {}, projections: {} };
  }

  if (!isObject(obj.period)) fail(`${where}.period ausente`);
  const periodRaw = obj.period as Record<string, unknown>;
  assertOnlyKeys(periodRaw, ["from", "to"], `${where}.period`);
  if (!isDate(periodRaw.from) || !isDate(periodRaw.to) || (periodRaw.from as string) > (periodRaw.to as string)) {
    fail(`${where}.period inválido`);
  }
  const period = { from: periodRaw.from as string, to: periodRaw.to as string };
  const days = (Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > MIRROR_WINDOW_DAYS) fail(`${where}.period maior que ${MIRROR_WINDOW_DAYS} dias`);
  if (base.history_from && period.from < base.history_from) fail(`${where}.period começa antes de history_from`);

  const connectionsRaw = obj.connections ?? {};
  if (!isObject(connectionsRaw)) fail(`${where}.connections inválido`);
  assertOnlyKeys(connectionsRaw as Record<string, unknown>, providers, `${where}.connections`);
  const connections: MirrorGrant["connections"] = {};
  for (const [provider, conn] of Object.entries(connectionsRaw as Record<string, unknown>)) {
    connections[provider as MirrorProvider] = parseConnection(conn, `${where}.connections.${provider}`);
  }

  const projectionsRaw = obj.projections ?? {};
  if (!isObject(projectionsRaw)) fail(`${where}.projections inválido`);
  const expected = providers.flatMap((p) => PROJECTIONS_BY_PROVIDER[p]);
  assertOnlyKeys(projectionsRaw as Record<string, unknown>, expected, `${where}.projections`);
  const projections: MirrorGrant["projections"] = {};
  for (const projection of expected) {
    projections[projection] = parseProjection(
      (projectionsRaw as Record<string, unknown>)[projection],
      projection,
      period,
      `${where}.projections.${projection}`,
    );
  }

  return { ...base, period, connections, projections };
}

export interface SnapshotExpectation {
  scope: "all" | "one";
  grantId?: string;
  destinationStudentId?: string;
}

/**
 * Estrutura do topo inválida = snapshot inteiro recusado. Uma autorização inválida é descartada
 * sozinha (em `rejected`), para que a linha ruim de um cliente não derrube a rodada dos outros.
 * No scope "one", qualquer descarte recusa tudo.
 */
export function parseMirrorSnapshot(raw: unknown, expected: SnapshotExpectation): ParseResult<ParsedSnapshot> {
  try {
    assertNoSecrets(raw);
    if (!isObject(raw)) fail("resposta não é objeto");
    const obj = raw as Record<string, unknown>;
    assertOnlyKeys(obj, [
      "schema_version", "destination_app", "snapshot_seq", "generated_at", "scope", "manifest_complete", "grants",
    ], "$");
    if (obj.schema_version !== MIRROR_SCHEMA_VERSION) fail(`schema_version ${String(obj.schema_version)} não suportada`);
    if (obj.destination_app !== MIRROR_DESTINATION_APP) fail("destination_app inesperado");
    if (!Number.isSafeInteger(obj.snapshot_seq) || (obj.snapshot_seq as number) <= 0) fail("snapshot_seq inválido");
    if (!isIsoDateTime(obj.generated_at)) fail("generated_at inválido");
    if (obj.scope !== expected.scope) fail(`scope ${String(obj.scope)} diferente do pedido`);
    if (typeof obj.manifest_complete !== "boolean") fail("manifest_complete deve ser booleano");
    if (!Array.isArray(obj.grants)) fail("grants deve ser lista");
    const grantsRaw = obj.grants as unknown[];
    if (grantsRaw.length > MIRROR_MAX_GRANTS * 4) fail("grants acima do limite");
    const grants: MirrorGrant[] = [];
    const rejected: RejectedGrant[] = [];
    grantsRaw.forEach((g, i) => {
      try {
        grants.push(parseGrant(g, `grants[${i}]`));
      } catch (err) {
        if (!(err instanceof ContractError)) throw err;
        const id = isObject(g) && UUID_RE.test(String(g.grant_id)) ? String(g.grant_id) : null;
        rejected.push({ index: i, grant_id: id, error: err.message });
      }
    });
    const ids = new Set<string>();
    const liveDestinations = new Set<string>();
    for (const g of grants) {
      if (ids.has(g.grant_id)) fail(`grant_id repetido ${g.grant_id}`);
      ids.add(g.grant_id);
      if (!g.revoked_at) {
        if (liveDestinations.has(g.destination_student_id)) fail("dois vínculos vivos para o mesmo cliente");
        liveDestinations.add(g.destination_student_id);
      }
    }
    if (grants.filter((g) => !g.revoked_at).length > MIRROR_MAX_GRANTS) fail("vínculos ativos acima do limite");
    if (expected.scope === "one") {
      if (rejected.length > 0) fail(`autorização fora do contrato: ${rejected[0].error}`);
      if (grants.length !== 1) fail("scope one deve trazer exatamente uma autorização");
      if (grants[0].grant_id !== expected.grantId || grants[0].destination_student_id !== expected.destinationStudentId) {
        fail("autorização devolvida não é a pedida");
      }
    }
    return {
      ok: true,
      value: {
        snapshot: {
          schema_version: 1,
          destination_app: MIRROR_DESTINATION_APP,
          snapshot_seq: obj.snapshot_seq as number,
          generated_at: obj.generated_at as string,
          scope: expected.scope,
          // Com descarte, o manifesto deixa de ser completo: nada pode ser tratado como "sumiu".
          manifest_complete: (obj.manifest_complete as boolean) && rejected.length === 0,
          grants,
        },
        rejected,
      },
    };
  } catch (err) {
    if (err instanceof ContractError) return { ok: false, error: err.message };
    throw err;
  }
}
