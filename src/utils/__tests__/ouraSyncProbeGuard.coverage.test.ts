/**
 * Source-based: a sonda do oura-sync (`probe: true`) é diagnóstico de ADMIN —
 * o dono da aluna (trainer) não pode acioná-la — e não pode gravar métricas,
 * logs ou last_sync_at (retorna antes de qualquer upsert).
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dirname, "../../../supabase/functions/oura-sync/index.ts"), "utf-8");

describe("oura-sync — sonda (probe) é só de admin e não grava", () => {
  it("rejeita trainer dono com 403 antes da checagem de ownership", () => {
    expect(src).toMatch(/if \(probe && !isAdmin\) \{\s*return jsonResponse\(403/);
    const probeGuard = src.indexOf("if (probe && !isAdmin)");
    const ownerCheck = src.indexOf("Access denied: you are not this student");
    expect(probeGuard).toBeGreaterThan(0);
    expect(probeGuard).toBeLessThan(ownerCheck);
  });

  it("devolve o relatório antes de qualquer gravação (upsert / last_sync_at / logs)", () => {
    const probeReturn = src.indexOf("return jsonResponse(200, { probe: true");
    const firstUpsert = src.indexOf(".upsert(");
    const lastSync = src.indexOf("last_sync_at: new Date().toISOString()");
    expect(probeReturn).toBeGreaterThan(0);
    expect(probeReturn).toBeLessThan(firstUpsert);
    expect(probeReturn).toBeLessThan(lastSync);
  });

  it("janela enviada à API é D..D+1 em todos os endpoints por data (end_date exclusivo)", () => {
    const legacy = (src.match(/start_date=\$\{syncDate\}&end_date=\$\{syncDate\}/g) ?? []).length;
    const current = (src.match(/start_date=\$\{window\.start_date\}&end_date=\$\{window\.end_date\}/g) ?? []).length;
    expect(legacy).toBe(0);
    expect(current).toBe(9);
  });
});
