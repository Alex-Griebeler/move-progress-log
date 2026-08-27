import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Cobertura do redesign da aba Avaliações (PR-8b).
 *
 * Asserts miram CHAMADAS e IMPORTS, nunca palavras soltas — um comentário
 * mencionando o mesmo termo já derrubou testes assim antes.
 */

const read = (relative: string) =>
  readFileSync(join(__dirname, "..", relative), "utf8");

const TAB = read("AssessmentsTab.tsx");
const CARD = read("AssessmentResultCard.tsx");
const HERO = read("AssessmentHero.tsx");
const SHEET = read("AssessmentDetailSheet.tsx");
const HOOK = readFileSync(join(__dirname, "../../../hooks/useAssessments.ts"), "utf8");

describe("lista traz o resultado, não só o tipo do teste", () => {
  it("o select da lista embute as 5 tabelas filhas numa query só", () => {
    expect(HOOK).toMatch(/ASSESSMENT_LIST_SELECT/);
    for (const rel of [
      "vo2_assessment_details(",
      "handgrip_results(",
      "dexa_results(",
      "sit_to_stand_results(",
      "questionnaire_responses(",
    ]) {
      expect(HOOK).toContain(rel);
    }
  });

  it("a query da lista usa o select novo (não o antigo, sem resultados)", () => {
    expect(HOOK).toMatch(/\.select\(ASSESSMENT_LIST_SELECT\)/);
  });

  it("relação 1:1 embutida é normalizada (PostgREST devolve objeto OU array)", () => {
    expect(HOOK).toMatch(/const normalizeEmbedded/);
    expect(HOOK).toMatch(/Array\.isArray\(value\)/);
  });

  it("a aba renderiza o card de resultado", () => {
    expect(TAB).toMatch(/import .*AssessmentResultCard.* from "\.\/AssessmentResultCard"/);
    expect(TAB).toMatch(/<AssessmentResultCard/);
  });

  it("classifica com as faixas seedadas via os hooks de referência", () => {
    expect(TAB).toMatch(/from "@\/hooks\/useReferenceRanges"/);
    expect(TAB).toMatch(/useVo2ReferenceRanges\(\)/);
    expect(TAB).toMatch(/useHandgripReferenceRanges\(\)/);
    expect(TAB).toMatch(/useSitToStandReferenceRanges\(\)/);
    expect(TAB).toMatch(/classifyAssessmentValue\(/);
  });

  it("o Δ é calculado sobre a lista INTEIRA, não sobre a filtrada", () => {
    // O useMemo do enriquecimento não pode depender de `filter` nem de
    // `filtered`: se dependesse, trocar de categoria mudaria a base de
    // comparação e o mesmo teste mostraria Δ diferente por aba aberta.
    const match = TAB.match(/const enriched = useMemo\(([\s\S]*?)\n {2}\}, \[([^\]]*)\]\);/);
    expect(match).not.toBeNull();
    const [, body, deps] = match!;
    expect(body).toMatch(/computeAssessmentDeltas\(/);
    expect(body).toMatch(/const rows = assessments \?\? \[\]/);
    expect(deps).not.toMatch(/\bfilter(ed)?\b/);
  });

  it("contagem por categoria é memoizada (era O(6n) dentro do JSX)", () => {
    expect(TAB).toMatch(/const categoryCounts = useMemo/);
    expect(TAB).not.toMatch(/\{cat === "all"\s*\?\s*assessments\.length\s*:\s*assessments\.filter/);
  });

  it("continua sem mutation na aba (regra travada desde a E4.3b)", () => {
    expect(TAB).not.toContain("useMutation");
  });
});

describe("card: direção do 'melhor' por métrica", () => {
  it("usa higherIsBetter em vez de assumir que subir é bom", () => {
    expect(CARD).toMatch(/higherIsBetter/);
    expect(CARD).toMatch(/deltaIsGood/);
  });

  it("delta zero não pinta de verde nem de vermelho", () => {
    expect(CARD).toMatch(/delta === 0\s*\?\s*null/);
  });

  it("valor ausente não vira zero na tela", () => {
    expect(CARD).toMatch(/value !== null && Number\.isFinite\(value\)/);
  });
});

describe("hero: barra de referência só onde existe régua", () => {
  it("a barra é condicionada a hasReference", () => {
    expect(HERO).toMatch(/hasReference \? buildReferenceBands\(/);
    expect(HERO).toMatch(/\{bands && <RefRangeBar/);
  });

  it("diz POR QUE não classificou em vez de ficar mudo", () => {
    expect(HERO).toMatch(/unclassifiedReason/);
    expect(SHEET).toMatch(/unclassifiedReason = /);
  });

  it("hero some quando não há valor (não renderiza card vazio)", () => {
    expect(HERO).toMatch(/if \(!hasValue\) return null/);
  });
});

describe("sheet: comparador clínico correto e debug protegido", () => {
  it("handgrip é comparado pela média das 3 da direita, não por best_kg", () => {
    expect(SHEET).toMatch(/rightHandMeanKg\(handgrip\.right_kg_attempts\)/);
    expect(SHEET).toMatch(/"Média direita \(comparador\)"/);
  });

  it("o payload de debug fica atrás do gate de admin", () => {
    expect(SHEET).toMatch(/\{isAdmin && \(/);
    expect(SHEET).toMatch(/useUserRole\(\)/);
    // e continua sanitizado (regra do PR-A)
    expect(SHEET).toMatch(/value=\{sanitizeAssessmentDebugPayload\(data\)\}/);
  });

  it("a ressalva de protocolo aparece só fora do padrão da norma", () => {
    expect(SHEET).toMatch(/!modality\.matchesReferenceProtocol \? VO2_REFERENCE_NOTE : null/);
  });

  it("o sujeito da classificação prefere o snapshot da avaliação", () => {
    expect(SHEET).toMatch(/resolveAssessmentSubject\(\{/);
    expect(SHEET).toMatch(/snapshotSex: assessment\.sex/);
    expect(SHEET).toMatch(/snapshotAgeYears: assessment\.age_years/);
  });

  it("o gráfico de FC por estágio rotula estágio, não data", () => {
    expect(SHEET).toMatch(/labelFormatter=\{\(k\) => `Estágio \$\{k\}`\}/);
    expect(SHEET).toMatch(/stage\.hr_final/);
  });

  it("o gráfico só aparece quando há alguma FC registrada", () => {
    expect(SHEET).toMatch(/some\(\(stage\) => stage\.hr_final !== null\)/);
  });
});
