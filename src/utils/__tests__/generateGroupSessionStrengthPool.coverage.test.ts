/**
 * Source-based coverage de generate-group-session: garante que os pools compound
 * de FORÇA (BP1/BP2/BP3) excluem potencia_pliometria via strengthCompoundPool.
 *
 * Contexto: sob o contrato "forma x qualidade", exercícios balísticos (kettlebell
 * swing, push press) são potência mas mantêm o padrão de forma (dobradica_quadril,
 * empurrar_vertical). A seleção dos blocos de força é por movement_pattern, então
 * sem este filtro eles vazariam pros blocos de força. A parte explosiva vem do
 * abridor de pliometria (category === "potencia_pliometria"), à parte.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const genPath = resolve(
  __dirname,
  "../../../supabase/functions/generate-group-session/index.ts",
);
const src = readFileSync(genPath, "utf-8");

describe("generate-group-session — strengthCompoundPool", () => {
  it("define o helper excluindo potencia_pliometria (filtro negativo)", () => {
    expect(src).toMatch(
      /const strengthCompoundPool\s*=\s*\(exercises:\s*Exercise\[\]\)/,
    );
    expect(src).toMatch(
      /exercises\.filter\(\(ex\)\s*=>\s*ex\.category\s*!==\s*"potencia_pliometria"\)/,
    );
  });

  it("aplica strengthCompoundPool aos 3 pools de força (BP1/BP2/BP3)", () => {
    expect(src).toMatch(/let pool1 = strengthCompoundPool\(exercises\);/);
    expect(src).toMatch(/let pool2 = strengthCompoundPool\(exercises\);/);
    expect(src).toMatch(/let bp3Pool = strengthCompoundPool\(exercises\);/);
    // nenhum pool de força deve voltar a copiar a lista bruta
    expect(src).not.toMatch(/let (pool1|pool2|bp3Pool) = \[\.\.\.exercises\];/);
  });

  it("mantém o abridor de pliometria selecionando potência por categoria", () => {
    expect(src).toMatch(/ex\.category === "potencia_pliometria"/);
  });
});
