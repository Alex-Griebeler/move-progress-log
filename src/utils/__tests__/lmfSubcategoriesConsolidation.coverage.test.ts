/**
 * Source-based coverage da consolidacao de `LMF_SUBCATEGORIES` em
 * `src/constants/backToBasics.ts`.
 *
 * Antes, `LMF_SUBCATEGORIES` existia como const local em
 * `src/pages/ExerciseReviewPage.tsx`, causando risco de drift com
 * AddExerciseDialog/EditExerciseLibraryDialog quando essas paginas
 * tambem comecarem a oferecer um select controlado para a categoria
 * `lmf`. Movendo pra backToBasics, garantimos fonte unica de verdade
 * (mesmo padrao de CORE_ATIVACAO_SUBCATEGORIES, POTENCIA_SUBCATEGORIES,
 * STRENGTH_SUBCATEGORIES, LATERALITY_OPTIONS, etc.).
 *
 * Mesmo padrao dos demais *.coverage.test.ts (readFileSync + asserts no
 * fonte) — sem render DOM.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import {
  LMF_SUBCATEGORIES,
  type LMFSubcategory,
} from "@/constants/backToBasics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const constantsSrc = read("../../constants/backToBasics.ts");
const useExercisesLibrarySrc = read("../../hooks/useExercisesLibrary.ts");
const exerciseReviewPageSrc = read("../../pages/ExerciseReviewPage.tsx");

const EXPECTED_KEYS: LMFSubcategory[] = [
  "adutores",
  "gluteos",
  "quadriceps",
  "isquiotibiais",
  "panturrilha",
  "coluna",
  "ombro",
  "pe",
];

describe("LMF_SUBCATEGORIES — fonte unica em backToBasics", () => {
  it("exporta LMF_SUBCATEGORIES com as 8 regioes esperadas", () => {
    const keys = Object.keys(LMF_SUBCATEGORIES).sort();
    expect(keys).toEqual([...EXPECTED_KEYS].sort());
  });

  it("labels em PT-BR estao definidos (cada chave aponta pra string nao vazia)", () => {
    for (const key of EXPECTED_KEYS) {
      const label = LMF_SUBCATEGORIES[key];
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("backToBasics.ts declara a constante como `as const` (literal types)", () => {
    expect(constantsSrc).toMatch(
      /export\s+const\s+LMF_SUBCATEGORIES\s*=\s*\{[\s\S]*?\}\s*as\s+const;/,
    );
  });

  it("backToBasics.ts exporta o tipo LMFSubcategory", () => {
    expect(constantsSrc).toMatch(
      /export\s+type\s+LMFSubcategory\s*=\s*keyof\s+typeof\s+LMF_SUBCATEGORIES/,
    );
  });

  it("useExercisesLibrary re-exporta LMF_SUBCATEGORIES", () => {
    expect(useExercisesLibrarySrc).toMatch(
      /export\s*\{[\s\S]*?LMF_SUBCATEGORIES[\s\S]*?\}\s*from\s*"@\/constants\/backToBasics"/,
    );
  });
});

describe("ExerciseReviewPage — consome a constante canonica", () => {
  it("nao redefine LMF_SUBCATEGORIES localmente", () => {
    // Bloqueia regressao: a duplicata local que tinha as mesmas 8 chaves
    // deve ter sido removida pra evitar drift.
    expect(exerciseReviewPageSrc).not.toMatch(
      /^\s*const\s+LMF_SUBCATEGORIES\s*:/m,
    );
    // E nao pode mais ter o trecho `: Record<string, string> = {` em LMF.
    expect(exerciseReviewPageSrc).not.toMatch(
      /const\s+LMF_SUBCATEGORIES\s*:\s*Record<string,\s*string>/,
    );
  });

  it("importa LMF_SUBCATEGORIES de backToBasics", () => {
    expect(exerciseReviewPageSrc).toMatch(
      /import\s*\{[\s\S]*?LMF_SUBCATEGORIES[\s\S]*?\}\s*from\s*"@\/constants\/backToBasics"/,
    );
  });

  it("continua usando LMF_SUBCATEGORIES no fallback de subcategoria", () => {
    expect(exerciseReviewPageSrc).toMatch(
      /category\s*===\s*"lmf"[\s\S]{0,80}LMF_SUBCATEGORIES/,
    );
  });
});

describe("Scope guard — PR cirurgico", () => {
  it("backToBasics nao importa types do Supabase (sem coupling com schema)", () => {
    expect(constantsSrc).not.toMatch(
      /from\s+["']@\/integrations\/supabase\/types["']/,
    );
  });
});
