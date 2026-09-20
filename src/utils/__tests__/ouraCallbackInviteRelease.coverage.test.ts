/**
 * Auditoria técnica de 20/09 (fase 5) — o convite do Oura não pode ser
 * queimado por um erro que acontece DEPOIS da reivindicação e ANTES de os
 * tokens serem gravados.
 *
 * `oura-callback` reivindica o convite de forma atômica (is_used = true) e só
 * então troca o código por tokens. Cada falha prevista devolve o convite
 * (`releaseInviteForRetry`), mas o catch externo não devolvia: qualquer erro
 * inesperado deixava a aluna sem conexão, sem convite válido e com um
 * "Internal server error" cru.
 *
 * Invariantes de fonte (a função é um Deno.serve monolítico, sem harness de
 * teste próprio).
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(__dirname, "../../../supabase/functions/oura-callback/index.ts"),
  "utf-8",
);

describe("oura-callback — convite devolvido em erro inesperado", () => {
  it("o catch externo devolve o convite e manda para a página de erro", () => {
    const catchIdx = source.indexOf("console.error('Error in oura-callback:', error);");
    expect(catchIdx).toBeGreaterThan(-1);
    const tail = source.slice(catchIdx);
    expect(tail).toMatch(/await releaseInviteOnUnexpectedFailure\(\)/);
    expect(tail).toMatch(/if \(redirectToOuraError\) return redirectToOuraError\(/);
  });

  it("o gancho é armado depois da reivindicação e desarmado com os tokens gravados", () => {
    const armIdx = source.indexOf("releaseInviteOnUnexpectedFailure = () => releaseInviteForRetry(");
    const claimIdx = source.indexOf("validatedInvite = claimedInvite");
    const disarmIdx = source.indexOf("releaseInviteOnUnexpectedFailure = null;");
    const storeIdx = source.indexOf("store_oura_tokens");
    expect(claimIdx).toBeGreaterThan(-1);
    expect(armIdx).toBeGreaterThan(claimIdx);
    expect(storeIdx).toBeGreaterThan(armIdx);
    // Só deixa de devolver o convite depois que a conexão existe.
    expect(disarmIdx).toBeGreaterThan(storeIdx);
  });

  it("expires_in inválido vira falha de troca, não exceção", () => {
    expect(source).toMatch(/const expiresInSeconds = Number\(tokenData\.expires_in\);/);
    expect(source).toMatch(
      /if \(!Number\.isFinite\(expiresInSeconds\) \|\| expiresInSeconds <= 0\) \{[\s\S]{0,400}?releaseInviteForRetry\('token_expiry'\)/,
    );
    // A expiração é calculada a partir do número validado, nunca do cru.
    expect(source).toMatch(/expiresAt\.setSeconds\(expiresAt\.getSeconds\(\) \+ expiresInSeconds\)/);
    expect(source).not.toMatch(/getSeconds\(\) \+ tokenData\.expires_in/);
  });
});
