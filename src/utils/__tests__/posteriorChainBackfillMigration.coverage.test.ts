/**
 * Source-based coverage da migration
 * `20260525140000_backfill_posterior_chain_movement_patterns.sql`.
 *
 * Contrato:
 *   - APENAS exercicios com movement_pattern = 'cadeia_posterior' sao
 *     reclassificados. Linhas com outros padroes (novos OU legados)
 *     ficam intocadas.
 *   - O backfill mexe SOMENTE na coluna movement_pattern. category,
 *     subcategory, boyle_score, dimensoes (AX/LOM/TEC/MET/JOE/QUA),
 *     tags, primary_muscles, emphasis: tudo preservado.
 *   - Hinge (deadlift/RDL/stiff/good morning/hip thrust/ponte/glute
 *     bridge/extensao de quadril) -> dobradica_quadril.
 *   - Nordica/leg curl/mesa flexora/cadeira flexora/flexao de joelho/
 *     sliding curl/hamstring curl -> flexao_joelho.
 *   - Sem ALTER TABLE, sem CREATE FUNCTION, sem touch em edge function.
 *   - Idempotente (filtro por valor legado garante).
 *
 * Mesmo padrao dos demais *.coverage.test.ts (readFileSync + asserts no
 * fonte) — sem Postgres, sem render.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationPath = resolve(
  __dirname,
  "../../../supabase/migrations/20260525140000_backfill_posterior_chain_movement_patterns.sql",
);
const migrationSql = readFileSync(migrationPath, "utf-8");

/** Migration sem comentarios SQL — usado nas asserts de "nao deve conter". */
const codeOnly = migrationSql
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/--[^\n]*/g, " ");
const codeLower = codeOnly.toLowerCase();

describe("migration backfill_posterior_chain_movement_patterns", () => {
  it("existe e tem o nome esperado", () => {
    expect(migrationSql.length).toBeGreaterThan(0);
  });

  it("envolve as alteracoes num BEGIN/COMMIT", () => {
    expect(codeLower).toMatch(/\bbegin\s*;/);
    expect(codeLower).toMatch(/\bcommit\s*;/);
  });

  it("atualiza APENAS public.exercises_library", () => {
    const updateMatches = codeOnly.match(/UPDATE\s+\S+/gi) ?? [];
    expect(updateMatches.length).toBeGreaterThan(0);
    for (const m of updateMatches) {
      expect(m.toLowerCase()).toMatch(/update\s+public\.exercises_library/);
    }
  });

  it("filtra estritamente por movement_pattern = 'cadeia_posterior'", () => {
    // Cada UPDATE deve ter o filtro pelo valor legado — garante idempotencia
    // e nao toca em padroes ja na taxonomia v2.
    const updateBlocks = codeOnly
      .split(/(?=UPDATE\s+public\.exercises_library)/i)
      .slice(1);
    expect(updateBlocks.length).toBe(2);
    for (const block of updateBlocks) {
      expect(block).toMatch(
        /WHERE[\s\S]*?movement_pattern\s*=\s*'cadeia_posterior'/i,
      );
    }
  });

  it("seta movement_pattern = 'dobradica_quadril' para padroes de hinge", () => {
    expect(codeOnly).toMatch(
      /SET\s+movement_pattern\s*=\s*'dobradica_quadril'/i,
    );
    // Padroes textuais minimos exigidos pela spec.
    const requiredHingeNeedles = [
      "deadlift",
      "levantamento terra",
      "rdl",
      "stiff",
      "good morning",
      "hip hinge",
      "hinge",
      "hip thrust",
      "ponte",
      "glute bridge",
      "extensão de quadril",
      "extensao de quadril",
    ];
    for (const needle of requiredHingeNeedles) {
      expect(codeLower).toContain(`like '%${needle.toLowerCase()}%'`);
    }
  });

  it("seta movement_pattern = 'flexao_joelho' para flexao de joelho", () => {
    expect(codeOnly).toMatch(/SET\s+movement_pattern\s*=\s*'flexao_joelho'/i);
    const requiredKneeNeedles = [
      "nórdica",
      "nordica",
      "nordic",
      "leg curl",
      "mesa flexora",
      "cadeira flexora",
      "flexão de joelho",
      "flexao de joelho",
      "sliding curl",
      "hamstring curl",
    ];
    for (const needle of requiredKneeNeedles) {
      expect(codeLower).toContain(`like '%${needle.toLowerCase()}%'`);
    }
  });

  it("NAO toca em category", () => {
    expect(codeOnly).not.toMatch(/SET[\s\S]*?\bcategory\s*=/i);
    expect(codeOnly).not.toMatch(/\bcategory\s*=\s*'/i);
  });

  it("NAO toca em subcategory", () => {
    expect(codeOnly).not.toMatch(/\bsubcategory\b/i);
  });

  it("NAO toca em boyle_score", () => {
    expect(codeOnly).not.toMatch(/\bboyle_score\b/i);
  });

  it("NAO toca nos scores AX/LOM/TEC/MET/JOE/QUA", () => {
    const scoreColumns = [
      "axial_load",
      "lumbar_demand",
      "technical_complexity",
      "metabolic_potential",
      "knee_dominance",
      "hip_dominance",
    ];
    for (const col of scoreColumns) {
      expect(codeOnly).not.toMatch(new RegExp(`\\b${col}\\b`, "i"));
    }
  });

  it("NAO toca em tags / primary_muscles / emphasis / functional_group / level / numeric_level", () => {
    const otherColumns = [
      "tags",
      "primary_muscles",
      "emphasis",
      "functional_group",
      "level",
      "numeric_level",
    ];
    for (const col of otherColumns) {
      expect(codeOnly).not.toMatch(new RegExp(`\\b${col}\\b`, "i"));
    }
  });

  it("NAO cria coluna (sem ALTER TABLE / ADD COLUMN / DROP COLUMN / RENAME)", () => {
    expect(codeOnly).not.toMatch(/\balter\s+table\b/i);
    expect(codeOnly).not.toMatch(/\badd\s+column\b/i);
    expect(codeOnly).not.toMatch(/\bdrop\s+column\b/i);
    expect(codeOnly).not.toMatch(/\brename\s+column\b/i);
  });

  it("NAO cria/altera funcoes ou edge artefatos", () => {
    expect(codeOnly).not.toMatch(/\bcreate\s+(or\s+replace\s+)?function\b/i);
    expect(codeOnly).not.toMatch(/\bcreate\s+trigger\b/i);
    expect(codeOnly).not.toMatch(/\bcreate\s+policy\b/i);
    expect(codeOnly).not.toMatch(/\bcreate\s+index\b/i);
  });

  it("e idempotente por construcao (filtro pelo valor legado)", () => {
    // Re-rodar a migration apos sucesso deve ser no-op porque
    // movement_pattern foi alterado para um valor != 'cadeia_posterior'.
    // O teste apenas re-confirma o filtro do WHERE (chave da idempotencia).
    const filteredUpdates = codeOnly.match(
      /UPDATE\s+public\.exercises_library[\s\S]*?WHERE\s+movement_pattern\s*=\s*'cadeia_posterior'/gi,
    );
    expect(filteredUpdates?.length).toBe(2);
  });

  it("nao loga nem seleciona valores sensiveis (sem RAISE / SELECT)", () => {
    expect(codeOnly).not.toMatch(/\braise\s+(notice|log|info|warning|debug)/i);
    // Permitimos UPDATE; ele nao deve embutir SELECT solto que escape do
    // escopo (a migration nao precisa de subqueries pra esse backfill).
    expect(codeOnly).not.toMatch(/\bselect\b/i);
  });
});

describe("escopo do PR (verificacoes a nivel de repositorio)", () => {
  const repoRoot = resolve(__dirname, "../../..");

  it("Supabase types nao foram modificados neste PR (codigo gerado intacto)", () => {
    // Heuristica: o tipo da tabela continua expondo movement_pattern: string | null.
    // Nenhuma modificacao no shape e esperada por este PR.
    const typesSrc = readFileSync(
      resolve(repoRoot, "src/integrations/supabase/types.ts"),
      "utf-8",
    );
    expect(typesSrc).toMatch(/movement_pattern:\s*string\s*\|\s*null/);
    // E o registro de exercises_library: { ... } continua existindo.
    expect(typesSrc).toMatch(/exercises_library:\s*\{/);
  });

  it("nenhuma edge function nova adicionada com data 2026-05-25", () => {
    // Esse PR nao deveria criar pastas em supabase/functions.
    // Source-based: lemos a propria migration; se ela referenciar edge
    // functions, isso seria um sinal de drift de escopo.
    expect(codeOnly).not.toMatch(/supabase\/functions/i);
    expect(codeOnly).not.toMatch(/edge\s+function/i);
  });
});
