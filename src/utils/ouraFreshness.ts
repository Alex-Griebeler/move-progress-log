/**
 * Frescor do Oura para a UI: separa "última TENTATIVA de sincronização"
 * (`last_sync_at`, que avança mesmo sem dados) de "último DADO REAL" (dia mais
 * recente com score de sono ou prontidão). Antes, cinco dias sem dado com
 * sync "ok" a cada 8h passavam como saudáveis.
 */

export interface OuraFreshnessInput {
  /** `oura_connections.last_sync_at` (ISO) — última tentativa. */
  lastSyncAt: string | null;
  /** Dia (YYYY-MM-DD) mais recente com sleep_score ou readiness_score. */
  lastRealDataDate: string | null;
  /** Falhas registradas nas últimas 24h. */
  recentFailed: number;
  /** Hoje em America/Sao_Paulo (YYYY-MM-DD). */
  today: string;
  now?: number;
}

export interface OuraFreshness {
  /** Dias entre hoje e o último dado real (null = nunca houve dado). */
  realDataAgeDays: number | null;
  /** Tentativa há mais de 24h (cron parado / conexão morta). */
  attemptStale: boolean;
  /** Sem dado real há 2+ dias apesar das tentativas (anel não sincroniza, token, endpoint). */
  dataStale: boolean;
  hasIssues: boolean;
  /** Frase curta para badge/tooltip. */
  summary: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const dayDiff = (today: string, date: string): number => {
  const [ty, tm, td] = today.split("-").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / DAY_MS);
};

export const DATA_STALE_AFTER_DAYS = 2;

export function evaluateOuraFreshness(input: OuraFreshnessInput): OuraFreshness {
  const now = input.now ?? Date.now();
  const lastSyncMs = input.lastSyncAt ? Date.parse(input.lastSyncAt) : Number.NaN;
  const attemptStale = !Number.isFinite(lastSyncMs) || now - lastSyncMs > DAY_MS;

  const realDataAgeDays = input.lastRealDataDate ? dayDiff(input.today, input.lastRealDataDate) : null;
  // Data futura (linha gravada por caminho antigo) não é frescor: trata como problema.
  const futureData = realDataAgeDays !== null && realDataAgeDays < 0;
  const dataStale = realDataAgeDays === null || futureData || realDataAgeDays >= DATA_STALE_AFTER_DAYS;

  const hasIssues = input.recentFailed > 0 || attemptStale || dataStale;

  let summary: string;
  if (input.recentFailed > 0) summary = `${input.recentFailed} falha(s) de sincronização nas últimas 24h`;
  else if (attemptStale) summary = "Sem tentativa de sincronização há mais de 24h";
  else if (realDataAgeDays === null) summary = "Nenhum dado do Oura recebido ainda";
  else if (futureData) summary = `Dado com data futura (${input.lastRealDataDate}) — verificar registro`;
  else if (dataStale) summary = `Último dado real há ${realDataAgeDays} dias (sincronizações sem dados)`;
  else if (realDataAgeDays === 0) summary = "Dados de hoje recebidos";
  else summary = "Último dado real de ontem";

  return { realDataAgeDays, attemptStale, dataStale, hasIssues, summary };
}

/** `YYYY-MM-DD` → Date local ao meio-dia (evita o dia anterior ao formatar). */
export const parseDateOnly = (date: string): Date => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};
