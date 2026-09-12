/**
 * Source-based: o oura-sync grava métricas diárias e agudas SÓ pelo RPC
 * `upsert_oura_row_merge` (merge atômico no banco: INSERT … ON CONFLICT DO
 * UPDATE SET col = COALESCE(novo, atual)). Não pode voltar o padrão
 * "ler a linha → merge em memória → upsert", que tinha janela de corrida
 * entre cron e botão manual.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const src = readFileSync(resolve(root, "supabase/functions/oura-sync/index.ts"), "utf-8");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260912150000_oura_upsert_merge_rpc.sql"),
  "utf-8",
);

describe("oura-sync — merge atômico no banco", () => {
  it("grava oura_metrics e oura_acute_metrics pelo RPC upsert_oura_row_merge", () => {
    const calls = src.match(/rpc\('upsert_oura_row_merge'/g) ?? [];
    expect(calls.length).toBe(2);
    expect(src).toMatch(/p_table: 'oura_metrics',\s*p_row: metrics/);
    expect(src).toMatch(/p_table: 'oura_acute_metrics',\s*p_row: acuteUpsertPayload/);
  });

  it("não lê a linha antes de gravar nem faz upsert direto nas duas tabelas", () => {
    expect(src).not.toMatch(/from\('oura_metrics'\)[\s\S]{0,200}\.upsert\(/);
    expect(src).not.toMatch(/from\('oura_acute_metrics'\)/);
    expect(src).not.toMatch(/mergePreservingExisting/);
  });

  it("migration: COALESCE(EXCLUDED, atual), só as duas tabelas, só service_role", () => {
    expect(migration).toMatch(/COALESCE\(EXCLUDED\.%1\$I, t\.%1\$I\)/);
    expect(migration).toMatch(/NOT IN \('oura_metrics', 'oura_acute_metrics'\)/);
    expect(migration).toMatch(/ON CONFLICT \(student_id, date\) DO UPDATE SET/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.upsert_oura_row_merge\(text, jsonb\) FROM PUBLIC/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.upsert_oura_row_merge\(text, jsonb\) TO service_role/);
  });
});
