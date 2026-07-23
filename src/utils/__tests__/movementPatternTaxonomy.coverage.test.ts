/**
 * Source-based coverage da taxonomia refinada de `movement_pattern` (v2)
 * e da sua adoção em AddExerciseDialog, EditExerciseLibraryDialog e
 * ExercisesLibraryPage.
 *
 * Decisão de produto (sem migration / sem reclassificar dados):
 *   - 11 padrões novos em MOVEMENT_PATTERNS:
 *       agachamento_bilateral, agachamento_unilateral, base_assimetrica,
 *       passada_deslocamento, dobradica_quadril, flexao_joelho,
 *       empurrar_horizontal, empurrar_vertical, puxar_horizontal,
 *       puxar_vertical, carregamento.
 *   - Valores legados (empurrar, puxar, dominancia_joelho, cadeia_posterior,
 *     lunge, carregar) preservados em LEGACY_MOVEMENT_PATTERNS — não
 *     aparecem na lista padrão, mas a UI exibe `(legado)` ao editar.
 *   - STRENGTH_SUBCATEGORIES carrega as variações mínimas por padrão novo.
 *   - Filtro/dialogs não quebram com valor legado.
 *
 * Mesmo padrão dos demais *.coverage.test.ts (readFileSync + asserts no
 * fonte) — sem render DOM, sem Postgres.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import {
  MOVEMENT_PATTERNS,
  POWER_MOVEMENT_PATTERNS,
  LEGACY_MOVEMENT_PATTERNS,
  MOVEMENT_PATTERN_LABELS,
  MOVEMENT_PATTERN_HELP_TEXT,
  PATTERN_TO_CATEGORY,
  STRENGTH_SUBCATEGORIES,
  SESSION_PATTERN_GROUPS,
  getMovementPatternLabel,
  isLegacyMovementPattern,
  BOYLE_SCORE_SCALE,
  type MovementPattern,
} from "@/constants/backToBasics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const backToBasicsSrc = read("../../constants/backToBasics.ts");
const addDialogSrc = read("../../components/AddExerciseDialog.tsx");
const editDialogSrc = read("../../components/EditExerciseLibraryDialog.tsx");
const libraryPageSrc = read("../../pages/ExercisesLibraryPage.tsx");

const EXPECTED_NEW_PATTERNS: Array<{ key: MovementPattern; label: string }> = [
  { key: "agachamento_bilateral", label: "Agachamento bilateral" },
  { key: "agachamento_unilateral", label: "Agachamento unilateral" },
  { key: "base_assimetrica", label: "Base assimétrica" },
  { key: "passada_deslocamento", label: "Passada / deslocamento" },
  { key: "dobradica_quadril", label: "Dobradiça de quadril" },
  { key: "flexao_joelho", label: "Flexão de joelho" },
  { key: "empurrar_horizontal", label: "Empurrar horizontal" },
  { key: "empurrar_vertical", label: "Empurrar vertical" },
  { key: "puxar_horizontal", label: "Puxar horizontal" },
  { key: "puxar_vertical", label: "Puxar vertical" },
  { key: "carregamento", label: "Carregamento" },
];

const EXPECTED_LEGACY_KEYS = [
  "empurrar",
  "puxar",
  "dominancia_joelho",
  "cadeia_posterior",
  "lunge",
  "carregar",
] as const;

describe("MOVEMENT_PATTERNS — taxonomia v2", () => {
  it("tem exatamente os 11 padrões esperados com os labels esperados", () => {
    const keys = Object.keys(MOVEMENT_PATTERNS).sort();
    const expectedKeys = EXPECTED_NEW_PATTERNS.map((p) => p.key).sort();
    expect(keys).toEqual(expectedKeys);

    for (const { key, label } of EXPECTED_NEW_PATTERNS) {
      expect(MOVEMENT_PATTERNS[key]).toBe(label);
    }
  });

  it("não inclui mais os padrões legados na lista principal", () => {
    for (const legacyKey of EXPECTED_LEGACY_KEYS) {
      expect(legacyKey in MOVEMENT_PATTERNS).toBe(false);
    }
  });

  it("PATTERN_TO_CATEGORY mapeia todos os padrões novos para forca_hipertrofia", () => {
    for (const { key } of EXPECTED_NEW_PATTERNS) {
      expect(PATTERN_TO_CATEGORY[key]).toBe("forca_hipertrofia");
    }
  });
});

describe("LEGACY_MOVEMENT_PATTERNS — back-compat", () => {
  it("preserva os 6 valores legados com label legível", () => {
    const keys = Object.keys(LEGACY_MOVEMENT_PATTERNS).sort();
    expect(keys).toEqual([...EXPECTED_LEGACY_KEYS].sort());
    for (const key of EXPECTED_LEGACY_KEYS) {
      expect(
        LEGACY_MOVEMENT_PATTERNS[key as keyof typeof LEGACY_MOVEMENT_PATTERNS],
      ).toBeTruthy();
    }
  });

  it("PATTERN_TO_CATEGORY ainda mapeia legados para forca_hipertrofia (não quebra Edit)", () => {
    for (const key of EXPECTED_LEGACY_KEYS) {
      expect(PATTERN_TO_CATEGORY[key]).toBe("forca_hipertrofia");
    }
  });

  it("MOVEMENT_PATTERN_LABELS resolve tanto novos quanto legados", () => {
    expect(MOVEMENT_PATTERN_LABELS.agachamento_bilateral).toBe("Agachamento bilateral");
    expect(MOVEMENT_PATTERN_LABELS.cadeia_posterior).toBe("Cadeia Posterior");
    expect(MOVEMENT_PATTERN_LABELS.lunge).toBe("Lunge");
  });

  it("getMovementPatternLabel falha graceful para chave desconhecida", () => {
    expect(getMovementPatternLabel("agachamento_bilateral")).toBe("Agachamento bilateral");
    expect(getMovementPatternLabel("cadeia_posterior")).toBe("Cadeia Posterior");
    expect(getMovementPatternLabel("foo_bar_inventado")).toBe("foo_bar_inventado");
    expect(getMovementPatternLabel(null)).toBeNull();
    expect(getMovementPatternLabel(undefined)).toBeNull();
    expect(getMovementPatternLabel("")).toBeNull();
  });

  it("isLegacyMovementPattern só retorna true para os 6 valores legados", () => {
    for (const key of EXPECTED_LEGACY_KEYS) {
      expect(isLegacyMovementPattern(key)).toBe(true);
    }
    for (const { key } of EXPECTED_NEW_PATTERNS) {
      expect(isLegacyMovementPattern(key)).toBe(false);
    }
    expect(isLegacyMovementPattern(null)).toBe(false);
    expect(isLegacyMovementPattern(undefined)).toBe(false);
    expect(isLegacyMovementPattern("foo_bar_inventado")).toBe(false);
  });
});

const EXPECTED_POWER_PATTERNS = [
  { key: "salto_pliometria", label: "Salto / Pliometria" },
  { key: "arremesso", label: "Arremesso" },
  { key: "levantamento_potencia", label: "Levantamento de potência" },
  { key: "rotacao_potencia", label: "Rotação de potência" },
  { key: "tecnica_locomocao", label: "Técnica de locomoção" },
] as const;

describe("POWER_MOVEMENT_PATTERNS — forma dos gestos de potência (contrato forma × qualidade)", () => {
  it("tem exatamente os 5 padrões de potência com os labels esperados", () => {
    const keys = Object.keys(POWER_MOVEMENT_PATTERNS).sort();
    expect(keys).toEqual(EXPECTED_POWER_PATTERNS.map((p) => p.key).sort());
    for (const { key, label } of EXPECTED_POWER_PATTERNS) {
      expect(
        POWER_MOVEMENT_PATTERNS[key as keyof typeof POWER_MOVEMENT_PATTERNS],
      ).toBe(label);
    }
  });

  it("é eixo à parte: nenhum padrão de potência aparece em MOVEMENT_PATTERNS (força)", () => {
    for (const { key } of EXPECTED_POWER_PATTERNS) {
      expect(key in MOVEMENT_PATTERNS).toBe(false);
    }
  });

  it("PATTERN_TO_CATEGORY mapeia os 5 padrões de potência para potencia_pliometria", () => {
    for (const { key } of EXPECTED_POWER_PATTERNS) {
      expect(PATTERN_TO_CATEGORY[key]).toBe("potencia_pliometria");
    }
  });

  it("os padrões compartilhados seguem em força no auto-fill (dobradica_quadril, empurrar_vertical)", () => {
    expect(PATTERN_TO_CATEGORY.dobradica_quadril).toBe("forca_hipertrofia");
    expect(PATTERN_TO_CATEGORY.empurrar_vertical).toBe("forca_hipertrofia");
  });

  it("MOVEMENT_PATTERN_LABELS e getMovementPatternLabel resolvem os padrões de potência", () => {
    for (const { key, label } of EXPECTED_POWER_PATTERNS) {
      expect(MOVEMENT_PATTERN_LABELS[key]).toBe(label);
      expect(getMovementPatternLabel(key)).toBe(label);
    }
  });

  it("os diálogos Add e Edit renderizam o select de POWER_MOVEMENT_PATTERNS", () => {
    expect(addDialogSrc).toMatch(/Object\.entries\(POWER_MOVEMENT_PATTERNS\)\.map/);
    expect(editDialogSrc).toMatch(/Object\.entries\(POWER_MOVEMENT_PATTERNS\)\.map/);
  });
});

describe("STRENGTH_SUBCATEGORIES — variações mínimas dos padrões novos", () => {
  it("agachamento_unilateral cobre step-up/step-down, single-leg squat e caixa/banco", () => {
    const map = STRENGTH_SUBCATEGORIES.agachamento_unilateral;
    expect(map).toBeDefined();
    expect(map.step_up_step_down).toBe("Step-up / Step-down");
    expect(map.single_leg_squat).toBe("Single-leg squat / pistol");
    expect(map.caixa_banco).toBe("Caixa / banco");
  });

  it("base_assimetrica cobre split squat, búlgaro e afundo parado (base FIXA)", () => {
    const map = STRENGTH_SUBCATEGORIES.base_assimetrica;
    expect(map).toBeDefined();
    expect(map.split_squat).toBe("Split squat");
    expect(map.bulgaro).toBe("Búlgaro");
    expect(map.afundo_parado).toBe("Afundo parado");
  });

  it("passada_deslocamento cobre frente/reversa/lateral/walking/curtsy (base que SE DESLOCA)", () => {
    const map = STRENGTH_SUBCATEGORIES.passada_deslocamento;
    expect(map).toBeDefined();
    expect(map.frente).toBe("Frente");
    expect(map.reversa).toBe("Reversa");
    expect(map.lateral).toBe("Lateral");
    expect(map.walking).toBe("Walking");
    expect(map.curtsy).toBe("Curtsy");
  });

  it("dobradica_quadril cobre deadlift/rdl_stiff/ponte_hip_thrust/hinge_tecnico (bi/uni vive no laterality)", () => {
    const map = STRENGTH_SUBCATEGORIES.dobradica_quadril;
    expect(map).toBeDefined();
    expect(map.deadlift).toBe("Deadlift");
    expect(map.rdl_stiff).toBe("RDL / Stiff");
    expect(map.ponte_hip_thrust).toBe("Ponte / Hip thrust");
    expect(map.hinge_tecnico).toBe("Hinge técnico");
  });

  it("flexao_joelho cobre nórdica/leg curl/sliding curl (não-hinge)", () => {
    const map = STRENGTH_SUBCATEGORIES.flexao_joelho;
    expect(map).toBeDefined();
    expect(map.nordica).toBe("Nórdica");
    expect(map.leg_curl).toBe("Leg curl");
    expect(map.sliding_curl).toBe("Sliding curl");
  });

  it("não inclui mais as subcategorias atreladas aos padrões legados", () => {
    // empurrar/puxar/cadeia_posterior foram substituídos. Não devem ter
    // entrada em STRENGTH_SUBCATEGORIES.
    expect(STRENGTH_SUBCATEGORIES.empurrar).toBeUndefined();
    expect(STRENGTH_SUBCATEGORIES.puxar).toBeUndefined();
    expect(STRENGTH_SUBCATEGORIES.cadeia_posterior).toBeUndefined();
  });
});

describe("SESSION_PATTERN_GROUPS — inclui novos + legados pra cobrir produção", () => {
  it("lower_knee inclui agachamentos/passada/flexao + legados (dominancia_joelho, lunge)", () => {
    const group = SESSION_PATTERN_GROUPS.lower_knee as readonly string[];
    expect(group).toContain("agachamento_bilateral");
    expect(group).toContain("agachamento_unilateral");
    expect(group).toContain("base_assimetrica");
    expect(group).toContain("passada_deslocamento");
    expect(group).toContain("flexao_joelho");
    expect(group).toContain("dominancia_joelho");
    expect(group).toContain("lunge");
  });

  it("lower_hip inclui dobradica_quadril + cadeia_posterior (legado)", () => {
    const group = SESSION_PATTERN_GROUPS.lower_hip as readonly string[];
    expect(group).toContain("dobradica_quadril");
    expect(group).toContain("cadeia_posterior");
  });

  it("upper_push inclui horizontal/vertical + empurrar (legado)", () => {
    const group = SESSION_PATTERN_GROUPS.upper_push as readonly string[];
    expect(group).toContain("empurrar_horizontal");
    expect(group).toContain("empurrar_vertical");
    expect(group).toContain("empurrar");
  });

  it("upper_pull inclui horizontal/vertical + puxar (legado)", () => {
    const group = SESSION_PATTERN_GROUPS.upper_pull as readonly string[];
    expect(group).toContain("puxar_horizontal");
    expect(group).toContain("puxar_vertical");
    expect(group).toContain("puxar");
  });

  it("carry inclui carregamento + carregar (legado)", () => {
    const group = SESSION_PATTERN_GROUPS.carry as readonly string[];
    expect(group).toContain("carregamento");
    expect(group).toContain("carregar");
  });
});

describe("AddExerciseDialog — taxonomia refinada", () => {
  it("importa LEGACY_MOVEMENT_PATTERNS, MOVEMENT_PATTERN_HELP_TEXT e STRENGTH_SUBCATEGORIES", () => {
    expect(addDialogSrc).toMatch(/import\s*\{[\s\S]*?LEGACY_MOVEMENT_PATTERNS[\s\S]*?\}/);
    expect(addDialogSrc).toMatch(/import\s*\{[\s\S]*?MOVEMENT_PATTERN_HELP_TEXT[\s\S]*?\}/);
    expect(addDialogSrc).toMatch(/import\s*\{[\s\S]*?STRENGTH_SUBCATEGORIES[\s\S]*?\}/);
  });

  it("expõe o helper text do padrão de movimento sob o select", () => {
    expect(addDialogSrc).toMatch(
      /<Label[^>]*>Padrão de Movimento<\/Label>[\s\S]*?\{MOVEMENT_PATTERN_HELP_TEXT\}/,
    );
  });

  it("renderiza SelectItem (legado) quando movementPattern atual é legado", () => {
    expect(addDialogSrc).toMatch(
      /movementPattern in LEGACY_MOVEMENT_PATTERNS[\s\S]*?<SelectItem value=\{movementPattern\}>/,
    );
  });

  it("oferece select controlado de subcategoria para force + padrão com STRENGTH_SUBCATEGORIES", () => {
    expect(addDialogSrc).toMatch(
      /category === "forca_hipertrofia"[\s\S]*?STRENGTH_SUBCATEGORIES\[movementPattern\]/,
    );
  });
});

describe("EditExerciseLibraryDialog — taxonomia refinada", () => {
  it("importa LEGACY_MOVEMENT_PATTERNS, MOVEMENT_PATTERN_HELP_TEXT e STRENGTH_SUBCATEGORIES", () => {
    expect(editDialogSrc).toMatch(/import\s*\{[\s\S]*?LEGACY_MOVEMENT_PATTERNS[\s\S]*?\}/);
    expect(editDialogSrc).toMatch(/import\s*\{[\s\S]*?MOVEMENT_PATTERN_HELP_TEXT[\s\S]*?\}/);
    expect(editDialogSrc).toMatch(/import\s*\{[\s\S]*?STRENGTH_SUBCATEGORIES[\s\S]*?\}/);
  });

  it("preserva o valor legado no select com a tag (legado)", () => {
    expect(editDialogSrc).toMatch(
      /movementPattern in LEGACY_MOVEMENT_PATTERNS[\s\S]*?<SelectItem value=\{movementPattern\}>/,
    );
  });

  it("renderiza o helper text abaixo do select", () => {
    expect(editDialogSrc).toMatch(
      /<Label[^>]*>Padrão de Movimento<\/Label>[\s\S]*?\{MOVEMENT_PATTERN_HELP_TEXT\}/,
    );
  });

  it("oferece subcategoria controlada para force + padrão novo, mantendo Core controlado", () => {
    expect(editDialogSrc).toMatch(
      /category === "forca_hipertrofia"[\s\S]*?STRENGTH_SUBCATEGORIES\[movementPattern\]/,
    );
    expect(editDialogSrc).toMatch(/category === "core_ativacao"/);
  });
});

describe("ExercisesLibraryPage — badge legível para valores legados", () => {
  it("usa getMovementPatternLabel/isLegacyMovementPattern em vez de lookup direto", () => {
    expect(libraryPageSrc).toMatch(/getMovementPatternLabel\(exercise\.movement_pattern\)/);
    expect(libraryPageSrc).toMatch(/isLegacyMovementPattern\(exercise\.movement_pattern\)/);
  });
});

describe("Nível Fabrik / sem regressão do Boyle textual", () => {
  it("BOYLE_SCORE_SCALE continua exposto com os 5 níveis", () => {
    expect(Object.keys(BOYLE_SCORE_SCALE).sort()).toEqual(["1", "2", "3", "4", "5"]);
    expect(BOYLE_SCORE_SCALE[1].label).toBe("Nível 1");
    expect(BOYLE_SCORE_SCALE[5].label).toBe("Nível 5");
  });

  it("Label do select continua sendo 'Nível Fabrik' (não voltou a 'Nível Boyle')", () => {
    expect(addDialogSrc).toMatch(/<Label[^>]*>Nível Fabrik<\/Label>/);
    expect(editDialogSrc).toMatch(/<Label[^>]*>Nível Fabrik<\/Label>/);
    expect(addDialogSrc).not.toMatch(/<Label[^>]*>Nível Boyle<\/Label>/);
    expect(editDialogSrc).not.toMatch(/<Label[^>]*>Nível Boyle<\/Label>/);
  });
});

describe("Scope guard — backToBasics permanece isolado do schema", () => {
  // Nota: o guard que vetava migrations citando os padrões novos
  // (presente no PR #192) era escopado a aquele PR — vide
  // "Scope guard ... neste PR". O follow-up de backfill (PR #193) faz
  // exatamente esse tipo de UPDATE de forma controlada, então o guard
  // foi removido. Os asserts abaixo continuam protegendo backToBasics
  // contra coupling com Supabase types ou edge function paths.

  it("backToBasics.ts não importa types do Supabase (não toca schema)", () => {
    expect(backToBasicsSrc).not.toMatch(/from\s+["']@\/integrations\/supabase\/types["']/);
  });

  it("os arquivos modificados não disparam writes a edge functions", () => {
    expect(backToBasicsSrc).not.toMatch(
      /from\s+["']\.\.\/\.\.\/supabase\/functions/,
    );
  });
});
