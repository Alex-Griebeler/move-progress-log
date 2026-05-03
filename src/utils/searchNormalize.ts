/**
 * Normaliza um string para busca acento-insensitive e case-insensitive.
 *
 * Use em qualquer filtro client-side onde o usuário deve poder digitar
 * "joa" e encontrar "João", "São Paulo" ou "JOAQUIM" indistintamente.
 *
 * Implementação:
 *  1. `normalize('NFD')` decompõe caracteres acentuados em base + diacritic
 *     (ex.: "ã" → "a" + U+0303).
 *  2. Regex remove a faixa de combining diacritics (U+0300..U+036F).
 *  3. `toLowerCase()` para case-insensitive.
 *
 * Edge cases tratados:
 *  - `null` / `undefined` → string vazia (não quebra .includes()).
 *  - Cedilha "ç" → "c" (Unicode trata como char base + diacritic).
 *  - Strings já ASCII passam sem alteração além do lowercase.
 */
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export const normalizeForSearch = (value: string | null | undefined): string => {
  if (!value) return "";
  return value.normalize("NFD").replace(COMBINING_DIACRITICS, "").toLowerCase();
};

/**
 * Helper de conveniência: testa se `haystack` contém `needle` ignorando
 * acento e case. Use em vez de `haystack.toLowerCase().includes(needle.toLowerCase())`.
 */
export const matchesSearch = (
  haystack: string | null | undefined,
  needle: string | null | undefined,
): boolean => {
  const normalizedNeedle = normalizeForSearch(needle);
  if (!normalizedNeedle) return true; // busca vazia: sempre casa
  return normalizeForSearch(haystack).includes(normalizedNeedle);
};
