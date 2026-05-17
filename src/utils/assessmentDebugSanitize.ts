/**
 * Helper puro: sanitiza o payload de uma avaliação carregada antes de
 * exibi-lo em UI de debug (como o `JsonBlock "Debug técnico"` do
 * `AssessmentDetailSheet`).
 *
 * Motivação (PR-A hardening):
 *   O `scan_pdf_storage_path` e o `scan_pdf_url` do `dexa_results` são
 *   caminhos/URLs internos do bucket privado `dexa-pdfs`. Mesmo que o
 *   bucket seja privado e exija signed URL pra acesso, exibir o path
 *   cru em qualquer superfície (DOM, debug JSON, toast, logs) é um vazamento
 *   de estrutura interna que viola o princípio "nunca exponha o caminho
 *   do storage pro usuário final".
 *
 * Estratégia:
 *   - Aceita `unknown` (defensivo a payload malformado);
 *   - Faz deep clone via JSON (mantém imutabilidade do input);
 *   - Se o clone contém `dexa`, substitui dois campos sensíveis por um
 *     sentinel não-decoded (`REDACTED_SENTINEL`) — preservando a
 *     existência do campo pra que o coach/dev veja que ele EXISTE, sem
 *     revelar o valor;
 *   - Não toca em nenhum outro campo (mantém debug útil de campos
 *     clínicos, regional_distribution, etc).
 *
 * NÃO é uma função de validação nem de transporte — uso exclusivo
 * pra DEBUG UI. Não persiste, não loga, não muta input.
 */

/**
 * Sentinel exibido no lugar de campos redigidos. Curto e auto-explicativo,
 * pra que dev/coach vendo o debug entenda que o campo existe mas foi
 * deliberadamente oculto.
 */
export const REDACTED_SENTINEL = "[redacted]";

/**
 * Lista canônica de campos do `dexa_results` que NUNCA podem aparecer
 * crus em UI. Centralizada pra fácil extensão se outros campos forem
 * considerados sensíveis no futuro (ex.: `raw_extracted_json` parcial).
 */
export const DEXA_SENSITIVE_FIELDS: readonly string[] = [
  "scan_pdf_storage_path",
  "scan_pdf_url",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

function deepCloneJson<T>(value: T): T {
  // Evita carregar `structuredClone` desnecessariamente — o payload de
  // assessment é serializável (Json) por contrato do Supabase types.
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Sanitiza um payload de assessment pra exibição em debug. Aceita
 * qualquer shape (defensivo); só age sobre `clone.dexa` quando esse
 * subobjeto existe.
 *
 * @param payload — objeto carregado (geralmente `AssessmentWithChild`)
 * @returns clone do payload com campos sensíveis do DEXA redigidos
 */
export function sanitizeAssessmentDebugPayload<T>(payload: T): T {
  // Defensivo: payload null/undefined/primitive — devolve como está
  // (não há nada pra sanitizar).
  if (payload == null || typeof payload !== "object") {
    return payload;
  }

  const clone = deepCloneJson(payload);

  if (isPlainObject(clone)) {
    const dexa = (clone as Record<string, unknown>).dexa;
    if (isPlainObject(dexa)) {
      for (const field of DEXA_SENSITIVE_FIELDS) {
        if (field in dexa) {
          // Só substitui se o campo realmente tem valor (string não-vazia
          // ou número). Campos null/undefined permanecem null/undefined
          // pra preservar a semântica "ainda não anexado".
          const value = dexa[field];
          if (value != null && value !== "") {
            dexa[field] = REDACTED_SENTINEL;
          }
        }
      }
    }
  }

  return clone;
}
