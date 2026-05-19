/**
 * Source-based defensivo da calculadora de carga dentro de
 * `supabase/functions/process-voice-session/index.ts`.
 *
 * Trava os invariantes do parser-por-gramática espelhado do cliente:
 *
 *   1. Cobertura textual de "cada lado" (com/sem "de", com/sem parens)
 *      idêntica ao cliente.
 *   2. Reconhece variantes PT-BR/EN de unidade (libras/pounds/quilos).
 *   3. Suporta multiplicador `2x` / `2×` / `2*`.
 *   4. Normaliza "barra N" (sem unidade) → "barra Nkg".
 *   5. Halteres / kettlebells / dumbbells / DB / par de halteres.
 *   6. Modo landmine (do nome do exercício).
 *   7. Modo barra bilateral (do nome do exercício).
 *   8. Placa N sem unidade → null.
 *   9. Edge passa `exerciseName` (executed > prescribed) pro calculator.
 *  10. Sem arredondamento intermediário em lb (`POUND_TO_KG_CONVERSION` raw).
 *  11. `roundToDecimal` SÓ no return final do calculator.
 *
 * Padrão coverage-test (sem Deno runtime), igual aos testes source-based
 * da edge `extract-dexa-pdf`.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const edgePath = resolve(
  __dirname,
  "../../../supabase/functions/process-voice-session/index.ts",
);
const edgeSource = readFileSync(edgePath, "utf-8");

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*\n/g, "");

describe("process-voice-session — calculator espelha o cliente (grammar parser)", () => {
  const code = stripComments(edgeSource);

  it("declara as listas de keywords bilateral/unilateral", () => {
    expect(code).toMatch(/BILATERAL_BARBELL_KEYWORDS\s*=\s*\[/);
    expect(code).toMatch(/UNILATERAL_KEYWORDS\s*=\s*\[/);
    // Exemplos obrigatórios na lista bilateral
    expect(code).toMatch(/'supino'/);
    expect(code).toMatch(/'agachamento'/);
    expect(code).toMatch(/'deadlift'/);
  });

  it("normalizeText converte libras/pounds/lbs → lb (variantes PT-BR/EN)", () => {
    expect(code).toMatch(/\\blibras\?\\b\|\\bpounds\?\\b\|\\blbs\\b[\s\S]*?'lb'/);
  });

  it("normalizeText converte quilos/quilogramas/kgs → kg", () => {
    expect(code).toMatch(/\\bquilogramas\?\\b\|\\bquilos\?\\b\|\\bkgs\\b[\s\S]*?'kg'/);
  });

  it("normalizeText trata 'par de halteres' / dumbbells / DB", () => {
    expect(code).toMatch(/\\bpar\\s\+de\\s\+halteres\?\\b[\s\S]*?'2 halteres'/);
    expect(code).toMatch(/\\bdumbbells\?\\b[\s\S]*?'halteres'/);
    expect(code).toMatch(/\\bdb\\b[\s\S]*?'halteres'/);
  });

  it("normalizeText converte operadores × * → x", () => {
    expect(code).toMatch(/\[×\*\][\s\S]*?'x'/);
  });

  it("normalizeText injeta unidade kg em 'barra N' sem unidade", () => {
    expect(code).toMatch(/\\bbarra\\s\+\(\?:de\\s\+\)\?\(\\d\+/);
    expect(code).toMatch(/`barra \$\{num\}\$\{\(unit \?\? 'kg'\)\.toLowerCase\(\)\}`/);
  });

  it("normalizeText remove parêntese de fechamento órfão", () => {
    expect(code).toMatch(/while\s*\(\s*closeCount\s*>\s*openCount\s*\)/);
    expect(code).toMatch(/lastIndexOf\(\s*'\)'\s*\)/);
  });

  it("WEIGHT_TERM_RE suporta multiplicador opcional Nx", () => {
    expect(code).toMatch(/WEIGHT_TERM_RE\s*=\s*\/\(\?:\(\\d/);
    // Captura o `x` literal (já normalizado dos operadores × *).
    expect(code).toMatch(/\\d\+\(\?:\[\.,\]\\d\+\)\?\)\s*\\s\*x\\s\*\s*\)\?/);
  });

  it("calculateLoadFromBreakdown aceita exerciseName como segundo argumento (contexto)", () => {
    expect(code).toMatch(
      /function\s+calculateLoadFromBreakdown\(\s*[\s\S]*?breakdown:\s*string\s*\|\s*null\s*,\s*[\s\S]*?exerciseName:\s*string\s*\|\s*null/,
    );
  });

  it("decideContext determina isLandmine via exerciseName OR substring no breakdown", () => {
    expect(code).toMatch(/exLower\.includes\('landmine'\)/);
    expect(code).toMatch(/\\blandmine\\b/);
  });

  it("decideContext detecta bilateral SOMENTE quando exerciseName é fornecido e bate keyword", () => {
    expect(code).toMatch(/!!exerciseName\s*&&\s*\n?\s*BILATERAL_BARBELL_KEYWORDS\.some/);
  });

  it("decideContext NÃO ativa bilateral em landmine ou unilateral", () => {
    expect(code).toMatch(/!isLandmine\s*&&\s*\n?\s*!isUnilateralHint/);
  });

  it("validateAndRecalculateLoad passa exerciseName (executed > prescribed > null)", () => {
    expect(code).toMatch(
      /exerciseNameForContext\s*=[\s\S]*?executed_exercise_name[\s\S]*?prescribed_exercise_name[\s\S]*?null/,
    );
    expect(code).toMatch(
      /calculateLoadFromBreakdown\(\s*[\s\S]*?exerciseNameForContext\s*,?\s*\)/,
    );
  });

  it("modo landmine força multiplier=1 em cada lado (NÃO dobra)", () => {
    expect(code).toMatch(/multiplier\s*=\s*ctx\.isLandmine\s*\?\s*1\s*:\s*2/);
  });

  it("modo bilateral só dobra peso solto quando há barra + 1 plate SEM quantity explícita", () => {
    expect(code).toMatch(
      /onlyImplicitSingle\s*=\s*\n?\s*looseTerms\.length\s*===\s*1[\s\S]*?!looseTerms\[0\]\.explicitQuantity/,
    );
    expect(code).toMatch(
      /inferBilateralX2\s*=\s*\n?\s*ctx\.isBilateralBarbell\s*&&\s*\n?\s*!eachSide\s*&&\s*\n?\s*bar\s*!==\s*null\s*&&\s*\n?\s*onlyImplicitSingle/,
    );
  });

  it("sumTerms NÃO duplica termos com quantity explícita dentro de 'cada lado'", () => {
    expect(code).toMatch(
      /if\s*\(\s*multiplier\s*===\s*2\s*&&\s*!term\.explicitQuantity\s*\)\s*\{\s*\n?\s*sum\s*\+=\s*term\.quantity\s*\*\s*term\.valueKg\s*\*\s*2/,
    );
  });

  it("UNKNOWN_PLATE_RE retorna null para 'placa N' sem unidade", () => {
    expect(code).toMatch(/UNKNOWN_PLATE_RE\s*=\s*\/[\s\S]*?placa/);
    expect(code).toMatch(/if\s*\(\s*UNKNOWN_PLATE_RE\.test\(normalized\)\s*\)\s*return\s+null/);
  });

  it("elástico/banda → null preservado", () => {
    expect(code).toMatch(/ELASTIC_RE\s*=/);
    expect(code).toMatch(/if\s*\(\s*ELASTIC_RE\.test\(normalized\)\s*\)\s*return\s+null/);
  });

  it("peso corporal: edge devolve null (sem studentWeight no contexto da edge)", () => {
    // No edge, o LLM já preenche load_kg = weight_kg quando aplicável.
    // O calculator próprio devolve null pra peso corporal sem valor.
    expect(code).toMatch(/BODYWEIGHT_RE\.test\(normalized\)[\s\S]*?return\s+null/);
  });

  it("converte lb com POUND_TO_KG_CONVERSION raw (sem arredondamento intermediário)", () => {
    expect(code).toMatch(/const POUND_TO_KG_CONVERSION\s*=\s*0\.4536/);
    expect(code).toMatch(/value\s*\*\s*POUND_TO_KG_CONVERSION/);
  });

  it("roundToDecimal SÓ no return final do calculator (não em sums intermediárias)", () => {
    const fnBlock = code.match(
      /function\s+calculateLoadFromBreakdown\([\s\S]*?\n\s{4}\}\s*\n/,
    )?.[0] ?? "";
    expect(fnBlock.length).toBeGreaterThan(0);
    const rounds = fnBlock.match(/roundToDecimal\(/g) ?? [];
    // 1 chamada principal (return total > 0 ? roundToDecimal(total) : null)
    // + opcional 1 no path "Peso corporal = X kg".
    expect(rounds.length).toBeLessThanOrEqual(2);
    expect(fnBlock).toMatch(
      /return\s+total\s*>\s*0\s*\?\s*roundToDecimal\(\s*total\s*\)\s*:\s*null/,
    );
  });

  it("prompt da IA usa 'de cada lado' como forma canônica (não contradiz o calculator)", () => {
    expect(edgeSource).toMatch(/"\(25 lb \+ 2 kg \+ 1 kg\) de cada lado/);
  });

  it("regra de barra documentada no prompt", () => {
    expect(edgeSource).toContain("BARRA_BILATERAL");
  });

  it("sanitiza load_kg/load_breakdown vazios → null", () => {
    expect(code).toMatch(/function\s+sanitizeExerciseData/);
    expect(code).toMatch(/'load_kg'\s*,\s*'load_breakdown'/);
  });
});
