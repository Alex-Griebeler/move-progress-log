/**
 * Source-based defensivo do `DexaPdfButton`.
 *
 * Bugfix capturado em produção (2026-05-18): no Chrome do usuário, a
 * aba aberta a partir do botão "Abrir laudo DEXA" mostrava
 * `ERR_BLOCKED_BY_CLIENT` ao navegar pra `*.supabase.co`. Extensões
 * de privacy/adblock classificam o host de Storage como terceiro e
 * bloqueiam silenciosamente.
 *
 * Fix: NUNCA navegar direto pro `signedUrl`. O botão precisa:
 *   1. Fazer `fetch(signedUrl)` pra baixar o PDF como Blob;
 *   2. Criar `URL.createObjectURL(blob)` local (mesma origem do app);
 *   3. Abrir o blob URL em nova aba com `noopener,noreferrer`;
 *   4. Revogar o blob URL após janela segura;
 *   5. Lidar com pop-up bloqueado (`window.open` → null).
 *
 * Estas asserções TRAVAM a regressão por construção. Padrão coverage-
 * test sem DOM/jsdom (alinhado com `useDexaPdfSignedUrl.coverage.test.ts`).
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buttonPath = resolve(__dirname, "../DexaPdfButton.tsx");
const buttonSource = readFileSync(buttonPath, "utf-8");

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*\n/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

describe("DexaPdfButton — abertura via Blob URL local (fix ERR_BLOCKED_BY_CLIENT)", () => {
  const code = stripComments(buttonSource);

  it("usa useDexaPdfSignedUrl pra obter o signedUrl (acesso ao bucket privado)", () => {
    expect(code).toMatch(/useDexaPdfSignedUrl/);
    expect(code).toMatch(/const\s*\{\s*sign[^}]*\}\s*=\s*useDexaPdfSignedUrl\(\)/);
  });

  it("NÃO abre o signedUrl diretamente (zero window.open(signedUrl, ...))", () => {
    // O bug: `window.open(signedUrl, ...)` faz o Chrome navegar pra
    // `*.supabase.co`, que é bloqueado por filtros de privacy.
    expect(code).not.toMatch(/window\.open\(\s*signedUrl/);
    expect(code).not.toMatch(/window\.open\(\s*url\s*,/);
  });

  it("baixa o PDF via fetch(signedUrl) e converte em Blob", () => {
    expect(code).toMatch(/await\s+fetch\(\s*signedUrl\s*\)/);
    expect(code).toMatch(/await\s+response\.blob\(\)/);
  });

  it("valida response.ok antes de prosseguir (não converte body de erro em blob)", () => {
    expect(code).toMatch(/if\s*\(\s*!response\.ok\s*\)/);
  });

  it("força MIME type application/pdf no Blob (storage pode devolver octet-stream)", () => {
    expect(code).toMatch(/new\s+Blob\([\s\S]*?type:\s*["']application\/pdf["']/);
  });

  it("cria blob URL local via URL.createObjectURL", () => {
    expect(code).toMatch(/URL\.createObjectURL\(\s*pdfBlob\s*\)/);
  });

  it("abre o BLOB URL em nova aba com noopener,noreferrer (não o signedUrl)", () => {
    expect(code).toMatch(
      /window\.open\(\s*blobUrl\s*,\s*["']_blank["']\s*,\s*["']noopener,noreferrer["']\s*\)/,
    );
  });

  it("revoga o blob URL após janela de tempo segura (URL.revokeObjectURL)", () => {
    expect(code).toMatch(/URL\.revokeObjectURL\(/);
    // Janela de delay em ms — qualquer constante > 0.
    expect(code).toMatch(/setTimeout\(\(\)\s*=>\s*URL\.revokeObjectURL/);
  });

  it("se window.open retornar null (pop-up bloqueado), revoga IMEDIATAMENTE", () => {
    // Padrão esperado: `if (!opened) { URL.revokeObjectURL(blobUrl); ... }`
    expect(code).toMatch(
      /if\s*\(\s*!opened\s*\)\s*\{[\s\S]*?URL\.revokeObjectURL\(/,
    );
  });

  it("se fetch/blob falhar, toast genérico (sem expor URL/path/token via err.message)", () => {
    // Catch precisa ser vazio (sem `catch (err)`).
    expect(code).toMatch(/\}\s*catch\s*\{/);
    expect(code).not.toMatch(/\berr\.message\b/);
    expect(code).not.toMatch(/\berror\.message\b/);
    expect(code).not.toMatch(/\.stack\b/);
  });

  it("toast usa constantes humanas fixas (zero interpolação de URL/path/token)", () => {
    expect(code).toMatch(/const\s+DEXA_PDF_OPEN_ERROR_TITLE\s*=\s*"[^"]+"/);
    expect(code).toMatch(/const\s+DEXA_PDF_OPEN_GENERIC_DESCRIPTION\s*=\s*"[^"]+"/);
    expect(code).toMatch(/const\s+DEXA_PDF_OPEN_POPUP_DESCRIPTION\s*=\s*"[^"]+"/);
    // Cada notify.error é uma statement que termina em `;`. Escopamos
    // os checks de ausência dentro dos ARGUMENTOS de cada call (entre
    // `(` e `;`), pra não bater em ocorrências legítimas de
    // signedUrl/blobUrl/storagePath em código posterior.
    const notifyErrorCalls = [
      ...code.matchAll(/notify\.error\([^;]*?\);/g),
    ].map((m) => m[0]);
    expect(notifyErrorCalls.length).toBeGreaterThan(0);
    for (const call of notifyErrorCalls) {
      expect(call).not.toMatch(/\bsignedUrl\b/);
      expect(call).not.toMatch(/\bblobUrl\b/);
      expect(call).not.toMatch(/\bstoragePath\b/);
      expect(call).not.toMatch(/\btoken\b/);
    }
  });

  it("NÃO persiste signedUrl/blobUrl/path em localStorage/sessionStorage", () => {
    expect(code).not.toMatch(/\blocalStorage\b/);
    expect(code).not.toMatch(/\bsessionStorage\b/);
    expect(code).not.toMatch(/\bIndexedDB\b/);
    expect(code).not.toMatch(/\bdocument\.cookie\b/);
  });

  it("NÃO loga signedUrl/blobUrl/path/token via console.*", () => {
    expect(code).not.toMatch(/console\.(log|info|warn|error|debug)/);
  });

  it("estado de loading composto (sign + fetch) — botão fica disabled durante a etapa de fetch", () => {
    expect(code).toMatch(/setIsFetching/);
    expect(code).toMatch(/disabled=\{isLoading\}/);
  });

  it("storagePath vazio/null/undefined renderiza estado 'sem PDF' (zero botão exposto)", () => {
    expect(code).toMatch(/data-testid="dexa-pdf-empty"/);
    expect(code).toMatch(/Laudo DEXA ainda não anexado/);
  });

  it("read-only absoluto: zero insert/update/delete/upsert/rpc/invoke/useMutation", () => {
    expect(code).not.toMatch(/\.insert\(/);
    expect(code).not.toMatch(/\.update\(/);
    expect(code).not.toMatch(/\.delete\(/);
    expect(code).not.toMatch(/\.upsert\(/);
    expect(code).not.toMatch(/\.rpc\(/);
    expect(code).not.toMatch(/functions\.invoke/);
    expect(code).not.toMatch(/\buseMutation\b/);
  });
});
