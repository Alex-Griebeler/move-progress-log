/**
 * Armazenamento local de rascunho COM identidade na chave.
 *
 * Residual documentado na A-001 (src/lib/authIdentity.ts): os rascunhos de
 * sessão e de prescrição viviam em chaves fixas do localStorage, sem o id de
 * quem está logado, e não eram apagados no logout. No tablet do estúdio, onde
 * um treinador sai e o outro entra, o segundo abria "Histórico de rascunhos"
 * e via nome, peso, cargas e observações das alunas do primeiro.
 *
 * Agora cada chave carrega o userId, e a troca de identidade varre o que
 * pertence a outra pessoa (ou a ninguém, no caso das chaves antigas sem dono
 * conhecido). Rascunho é estado de trabalho, não fonte de verdade: na primeira
 * abertura depois desta mudança os rascunhos antigos são descartados, porque
 * não dá para saber de quem eram.
 */

/** Prefixos de tudo que guarda dado de aluna no navegador. */
const PRIVATE_KEY_PREFIXES = [
  "session_draft_v2_",
  "session_draft_history_",
  "prescription-draft",
  "prescription_draft_history_",
] as const;

/** Chaves antigas, de antes da identidade na chave — sempre descartadas. */
const LEGACY_KEYS = [
  "session_draft_history_v1",
  "prescription_draft_history_v1",
] as const;

const OWNER_MARK = "::u:";

/** `session_draft_v2_p1` + user → `session_draft_v2_p1::u:<userId>`. */
export const scopedDraftKey = (base: string, userId: string | null | undefined): string | null =>
  userId ? `${base}${OWNER_MARK}${userId}` : null;

const isPrivateDraftKey = (key: string): boolean =>
  PRIVATE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
  key.startsWith("prescription-draft");

const belongsTo = (key: string, userId: string): boolean => key.endsWith(`${OWNER_MARK}${userId}`);

/**
 * Remove do navegador todo rascunho que NÃO seja da identidade informada.
 * `null` (deslogado) apaga todos. Chamado na troca de identidade.
 */
export const purgeDraftsOutsideIdentity = (
  userId: string | null,
  storage: Storage | undefined = typeof localStorage !== "undefined" ? localStorage : undefined,
): number => {
  if (!storage) return 0;
  const doomed: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if ((LEGACY_KEYS as readonly string[]).includes(key)) { doomed.push(key); continue; }
      if (!isPrivateDraftKey(key)) continue;
      if (!userId || !belongsTo(key, userId)) doomed.push(key);
    }
    for (const key of doomed) storage.removeItem(key);
  } catch {
    // Navegador com armazenamento bloqueado: nada a limpar, nada a fazer.
  }
  return doomed.length;
};

/** Chaves de sessão (sessionStorage) que também carregam dado de aluna. */
const PRIVATE_SESSION_PREFIXES = ["percepcao_treino:", "fabrik:group-manual-saved:"] as const;

/** Mesma varredura no sessionStorage, que sobrevive à troca de usuário na aba. */
export const purgeSessionScopedPrivateData = (
  storage: Storage | undefined = typeof sessionStorage !== "undefined" ? sessionStorage : undefined,
): number => {
  if (!storage) return 0;
  const doomed: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && PRIVATE_SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) doomed.push(key);
    }
    for (const key of doomed) storage.removeItem(key);
  } catch {
    // idem
  }
  return doomed.length;
};
