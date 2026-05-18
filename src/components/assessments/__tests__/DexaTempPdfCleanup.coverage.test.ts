/**
 * Source-based tests do cleanup de PDFs DEXA temporários.
 *
 * O objetivo é garantir que uploads usados para leitura automática possam ser
 * removidos pela tela ANTES de salvar a avaliação, sem abrir permissão de delete
 * direto no bucket e sem apagar PDFs já referenciados no banco.
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dexaFormPath = resolve(__dirname, "../DexaForm.tsx");
const dexaFormSource = readFileSync(dexaFormPath, "utf-8");

const edgePath = resolve(
  __dirname,
  "../../../../supabase/functions/delete-dexa-temp-pdf/index.ts",
);
const edgeSource = readFileSync(edgePath, "utf-8");

const configPath = resolve(__dirname, "../../../../supabase/config.toml");
const configSource = readFileSync(configPath, "utf-8");

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*\n/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

// ── DexaForm client cleanup ────────────────────────────────────────────────

describe("DexaForm — cleanup de PDF temporário", () => {
  it("invoca a edge delete-dexa-temp-pdf (não remove storage direto no client)", () => {
    const code = stripComments(dexaFormSource);
    expect(code).toMatch(/supabase\.functions\.invoke\(\s*\n?\s*"delete-dexa-temp-pdf"/);
    expect(code).not.toMatch(/supabase\.storage\s*\n?\s*\.from\("dexa-pdfs"\)\s*\n?\s*\.remove\(/);
  });

  it("envia body mínimo { student_id, storage_path } pra edge", () => {
    const code = stripComments(dexaFormSource);
    expect(code).toMatch(/body:\s*\{\s*student_id:\s*studentId,\s*storage_path:\s*path\s*\}/);
  });

  it("remove upload temporário ao trocar arquivo depois de extração", () => {
    const code = stripComments(dexaFormSource);
    expect(code).toMatch(/const\s+previousUploadedPath\s*=\s*uploadedPdfPath/);
    expect(code).toMatch(/if\s*\(\s*previousUploadedPath\s*\)\s*\{[\s\S]*?deleteTemporaryUploadedPdf\(previousUploadedPath/);
  });

  it("remove upload temporário ao clicar no X do PDF selecionado", () => {
    const code = stripComments(dexaFormSource);
    const removePdfBlock = code.match(
      /const\s+removePdf\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/,
    )?.[0] ?? "";
    expect(removePdfBlock).toContain("const pathToDelete = uploadedPdfPath");
    expect(removePdfBlock).toContain("clearPdfDraftState()");
    expect(removePdfBlock).toContain("deleteTemporaryUploadedPdf(pathToDelete");
  });

  it("remove upload temporário ao cancelar/fechar modal sem salvar", () => {
    const code = stripComments(dexaFormSource);
    expect(code).toMatch(/<Dialog\s+open=\{open\}\s+onOpenChange=\{handleDialogOpenChange\}/);
    expect(code).toMatch(/onClick=\{discardDraftAndClose\}/);
    expect(code).toMatch(/const\s+discardDraftAndClose\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?deleteTemporaryUploadedPdf\(pathToDelete/);
  });

  it("não limpa PDF persistido após submit bem-sucedido", () => {
    const code = stripComments(dexaFormSource);
    expect(code).toContain("skipTemporaryPdfCleanupRef");
    expect(code).toMatch(/skipTemporaryPdfCleanupRef\.current\s*=\s*true[\s\S]*?onOpenChange\(false\)/);
    expect(code).toMatch(/if\s*\(\s*skipTemporaryPdfCleanupRef\.current\s*\)\s*\{[\s\S]*?onOpenChange\(false\)[\s\S]*?return/);
  });

  it("reseta o guard de pós-submit quando o modal abre novamente", () => {
    const code = stripComments(dexaFormSource);
    expect(code).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*open\s*\)[\s\S]*?skipTemporaryPdfCleanupRef\.current\s*=\s*false/);
    expect(code).toMatch(/},\s*\[open\]\s*\)/);
  });

  it("usa toast genérico no cleanup, sem err.message/path/token", () => {
    const code = stripComments(dexaFormSource);
    expect(code).toContain("DEXA_TEMP_PDF_CLEANUP_ERROR_TITLE");
    expect(code).toContain("DEXA_TEMP_PDF_CLEANUP_ERROR_DESCRIPTION");
    expect(code).toMatch(/}\s*catch\s*\{/);
    expect(code).not.toMatch(/err\.message|error\.message|storagePath.*notify|path.*notify/);
  });

  it("não persiste path/token em storage local nem loga no console", () => {
    const code = stripComments(dexaFormSource);
    expect(code).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bIndexedDB\b/);
    expect(code).not.toMatch(/console\.(log|info|warn|error|debug)\(/);
  });
});

// ── Edge cleanup: auth, ownership e referenced guard ───────────────────────

describe("delete-dexa-temp-pdf edge — contrato e segurança", () => {
  it("está registrada com verify_jwt=false para CORS preflight", () => {
    expect(configSource).toMatch(
      /\[functions\.delete-dexa-temp-pdf\]\s*\n\s*verify_jwt\s*=\s*false/,
    );
  });

  it("responde OPTIONS sem auth e rejeita métodos não-POST", () => {
    expect(edgeSource).toContain('req.method === "OPTIONS"');
    expect(edgeSource).toContain('req.method !== "POST"');
  });

  it("valida Bearer + auth.getUser antes de criar service-role client", () => {
    const authIdx = edgeSource.indexOf("await userClient.auth.getUser()");
    const adminIdx = edgeSource.indexOf(
      "const adminClient = createClient(supabaseUrl, supabaseServiceKey)",
    );
    const bearerIdx = edgeSource.indexOf('startsWith("Bearer ")');
    expect(bearerIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeGreaterThan(bearerIdx);
    expect(adminIdx).toBeGreaterThan(authIdx);
  });

  it("valida admin OU trainer dono do aluno", () => {
    expect(edgeSource).toContain('.eq("role", "admin")');
    expect(edgeSource).toMatch(/student\.trainer_id !== user\.id/);
  });

  it("valida path prefixado pelo student_id, bloqueia traversal e exige .pdf", () => {
    expect(edgeSource).toMatch(/storagePath\.startsWith\(`\$\{studentId\}\/`\)/);
    expect(edgeSource).toMatch(/!storagePath\.includes\("\.\."\)/);
    expect(edgeSource).toMatch(/!storagePath\.startsWith\("\/"\)/);
    expect(edgeSource).toMatch(/\\\.pdf\$\/i\.test\(storagePath\)/);
  });

  it("bloqueia delete se o PDF já está referenciado em dexa_results", () => {
    expect(edgeSource).toMatch(/\.from\("dexa_results"\)[\s\S]*?\.eq\("scan_pdf_storage_path",\s*storagePath\)[\s\S]*?\.maybeSingle\(\)/);
    expect(edgeSource).toContain("PDF já vinculado a uma avaliação");
    expect(edgeSource).toMatch(/if\s*\(referencedDexa\)\s*\{[\s\S]*?409/);
  });

  it("remove somente do bucket dexa-pdfs após o referenced guard", () => {
    const referenceIdx = edgeSource.indexOf('.from("dexa_results")');
    const removeIdx = edgeSource.indexOf(".remove([storagePath])");
    expect(edgeSource).toContain('const BUCKET_ID = "dexa-pdfs"');
    expect(removeIdx).toBeGreaterThan(referenceIdx);
    expect(edgeSource).toMatch(/adminClient\.storage\s*\n?\s*\.from\(BUCKET_ID\)\s*\n?\s*\.remove\(\[storagePath\]\)/);
  });

  it("não toca em banco com insert/update/delete/upsert/rpc", () => {
    const code = stripComments(edgeSource);
    expect(code).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
  });

  it("não loga path/token/pdf bytes/base64/prompt nem usa console", () => {
    const code = stripComments(edgeSource);
    expect(code).not.toMatch(/console\.(log|info|warn|error|debug)\(/);
    expect(code).not.toMatch(/base64|signedUrl|token|prompt|pdfBytes|raw_response/);
  });
});
