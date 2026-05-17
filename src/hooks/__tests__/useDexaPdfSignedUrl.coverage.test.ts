/**
 * PR-A — testes source-based pra cobertura de segurança do hook
 * `useDexaPdfSignedUrl` e do componente `DexaPdfButton`, mais a
 * integração no `AssessmentDetailSheet`. Padrão coverage-test (sem DOM /
 * sem testing-library), alinhado ao resto do app (vide
 * `Precision12Console.coverage.test.ts`).
 *
 * Objetivos verificados:
 *   - hook usa `createSignedUrl` com TTL curto (60s) no bucket `dexa-pdfs`;
 *   - hook não introduz mutation (insert/update/delete/upsert/rpc/invoke);
 *   - hook não persiste a URL/token em localStorage/sessionStorage/cache;
 *   - hook não loga URL/token em console;
 *   - botão usa `target="_blank"` + `rel="noopener,noreferrer"`;
 *   - botão mostra estado "sem PDF" claro quando `storagePath` é falsy;
 *   - DetailSheet não renderiza mais o `scan_pdf_storage_path` cru na
 *     grid principal — agora consome o `DexaPdfButton`.
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const hookPath = resolve(__dirname, "../useDexaPdfSignedUrl.ts");
const hookSource = readFileSync(hookPath, "utf-8");

const buttonPath = resolve(
  __dirname,
  "../../components/assessments/DexaPdfButton.tsx",
);
const buttonSource = readFileSync(buttonPath, "utf-8");

const detailSheetPath = resolve(
  __dirname,
  "../../components/assessments/AssessmentDetailSheet.tsx",
);
const detailSheetSource = readFileSync(detailSheetPath, "utf-8");

// Strip de comentários — alguns asserts negativos pesquisam palavras-chave
// que aparecem em comentários explicativos do hardening (ex.: "não logar").
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*\n/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

// ── Hook: useDexaPdfSignedUrl ───────────────────────────────────────────────

describe("useDexaPdfSignedUrl — contract", () => {
  it("centraliza o bucket privado dexa-pdfs em constante exportada", () => {
    expect(hookSource).toContain('export const DEXA_PDFS_BUCKET = "dexa-pdfs"');
  });

  it("usa TTL curto (60 segundos) e exporta a constante", () => {
    expect(hookSource).toContain(
      "export const DEXA_PDF_SIGNED_URL_TTL_SECONDS = 60",
    );
  });

  it("invoca createSignedUrl com o TTL constante (não hard-coded)", () => {
    expect(hookSource).toMatch(
      /createSignedUrl\(\s*storagePath\s*,\s*DEXA_PDF_SIGNED_URL_TTL_SECONDS\s*\)/,
    );
  });

  it("opera apenas sobre o bucket dexa-pdfs (via constante)", () => {
    expect(hookSource).toMatch(/\.from\(\s*DEXA_PDFS_BUCKET\s*\)/);
  });

  it("é defensivo com storagePath vazio/null (early return null, sem chamar API)", () => {
    expect(hookSource).toMatch(
      /if\s*\(\s*!storagePath\s*\|\|\s*storagePath\.trim\(\)\.length\s*===\s*0\s*\)\s*\{\s*\n\s*return null/,
    );
  });

  it("não usa useMutation (não é mutação de dados — apenas request à Storage API)", () => {
    // Strip comentários — o jsdoc do hook menciona `useMutation` apenas
    // pra documentar que NÃO usa (auditoria semântica).
    const code = stripComments(hookSource);
    expect(code).not.toMatch(/\buseMutation\b/);
  });

  it("não introduz mutation de tabela / RPC / edge function", () => {
    const code = stripComments(hookSource);
    expect(code).not.toMatch(/\.insert\(/);
    expect(code).not.toMatch(/\.update\(/);
    expect(code).not.toMatch(/\.delete\(/);
    expect(code).not.toMatch(/\.upsert\(/);
    expect(code).not.toMatch(/\bsupabase\.rpc\b/);
    expect(code).not.toMatch(/\bfunctions\.invoke\b/);
  });

  it("não persiste a URL/token em localStorage/sessionStorage", () => {
    const code = stripComments(hookSource);
    expect(code).not.toMatch(/\blocalStorage\b/);
    expect(code).not.toMatch(/\bsessionStorage\b/);
    expect(code).not.toMatch(/\bIndexedDB\b/);
  });

  it("não persiste a URL no cache do React Query (sem useQuery/queryClient)", () => {
    expect(hookSource).not.toMatch(/\buseQuery\b/);
    expect(hookSource).not.toMatch(/\bqueryClient\b/);
    expect(hookSource).not.toMatch(/@tanstack\/react-query/);
  });

  it("não loga URL/token via console.* (sem console nenhum no code path)", () => {
    const code = stripComments(hookSource);
    expect(code).not.toMatch(/\bconsole\.(log|info|warn|error|debug)\b/);
  });
});

// ── Componente: DexaPdfButton ──────────────────────────────────────────────

describe("DexaPdfButton — UX/segurança", () => {
  it("importa e usa o hook useDexaPdfSignedUrl", () => {
    expect(buttonSource).toContain(
      'from "@/hooks/useDexaPdfSignedUrl"',
    );
    expect(buttonSource).toContain("useDexaPdfSignedUrl()");
  });

  it("renderiza estado claro quando storagePath é falsy ('Laudo DEXA ainda não anexado')", () => {
    expect(buttonSource).toContain("Laudo DEXA ainda não anexado");
    expect(buttonSource).toContain('data-testid="dexa-pdf-empty"');
  });

  it("abre o PDF em nova aba com noopener,noreferrer (proteção tab-nabbing)", () => {
    expect(buttonSource).toMatch(
      /window\.open\(\s*url\s*,\s*"_blank"\s*,\s*"noopener,noreferrer"\s*\)/,
    );
  });

  it("nunca renderiza o storagePath técnico como texto da UI", () => {
    const code = stripComments(buttonSource);
    // O componente recebe `storagePath` como prop. NÃO pode renderizá-lo
    // como conteúdo de texto pra não vazar caminhos internos do bucket.
    expect(code).not.toMatch(/\{storagePath\}/);
    expect(code).not.toMatch(/\{props\.storagePath\}/);
  });

  it("aria-label descritivo no botão (acessibilidade)", () => {
    expect(buttonSource).toContain(
      'aria-label="Abrir laudo DEXA em nova aba"',
    );
  });

  it("não introduz mutation / persistência local / log de URL", () => {
    const code = stripComments(buttonSource);
    expect(code).not.toMatch(/\.insert\(/);
    expect(code).not.toMatch(/\.update\(/);
    expect(code).not.toMatch(/\.delete\(/);
    expect(code).not.toMatch(/\.upsert\(/);
    expect(code).not.toMatch(/\bsupabase\.rpc\b/);
    expect(code).not.toMatch(/\bfunctions\.invoke\b/);
    expect(code).not.toMatch(/\blocalStorage\b/);
    expect(code).not.toMatch(/\bsessionStorage\b/);
    expect(code).not.toMatch(/\bconsole\.(log|info|warn|error|debug)\b/);
  });
});

// ── Integração: AssessmentDetailSheet ──────────────────────────────────────

describe("AssessmentDetailSheet — integra DexaPdfButton e não vaza path cru", () => {
  it("importa DexaPdfButton", () => {
    expect(detailSheetSource).toContain('from "./DexaPdfButton"');
  });

  it("renderiza <DexaPdfButton storagePath={dexa.scan_pdf_storage_path} /> na seção DEXA", () => {
    expect(detailSheetSource).toMatch(
      /<DexaPdfButton\s+storagePath=\{dexa\.scan_pdf_storage_path\}\s*\/>/,
    );
  });

  it("NÃO renderiza mais a tupla ['PDF no storage', dexa.scan_pdf_storage_path] no grid principal", () => {
    // Regressão: o path técnico era exibido como informação principal,
    // contradizendo as boas práticas de não vazar estrutura interna de
    // storage pro usuário final. Após PR-A, deve sumir do grid.
    expect(detailSheetSource).not.toContain(
      '["PDF no storage", dexa.scan_pdf_storage_path]',
    );
  });

  it("manteve a seção DEXA chamando renderDexa (não quebrou o pipeline existente)", () => {
    expect(detailSheetSource).toContain("const renderDexa = ");
    expect(detailSheetSource).toContain("data.dexa");
  });
});
