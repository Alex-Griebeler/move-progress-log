/**
 * Onda 2 · Superfície 2 (sessões e prescrições) — invariantes source-based
 * das correções de UX que não têm teste de render próprio.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*\n/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const prescriptionsPage = stripComments(read("../../pages/PrescriptionsPage.tsx"));
const sessionsPage = stripComments(read("../../pages/SessionsPage.tsx"));
const detail = stripComments(read("../SessionDetailDialog.tsx"));
const group = stripComments(read("../RecordGroupSessionDialog.tsx"));
const individual = stripComments(read("../RecordIndividualSessionDialog.tsx"));
const tv = stripComments(read("../PrescriptionTVMode.tsx"));
const workoutCard = stripComments(read("../WorkoutCard.tsx"));
const popover = stripComments(read("../ExerciseLoadHistoryPopover.tsx"));

describe("erro de rede nunca vira vazio de primeiro uso", () => {
  it("PrescriptionsPage testa isError ANTES do vazio e oferece tentar de novo", () => {
    const errorIdx = prescriptionsPage.indexOf("isPrescriptionsError && !allPrescriptions ?");
    const emptyIdx = prescriptionsPage.indexOf("Comece criando sua primeira prescrição");
    expect(errorIdx).toBeGreaterThan(-1);
    expect(errorIdx).toBeLessThan(emptyIdx);
    expect(prescriptionsPage).toMatch(/<ErrorState[\s\S]*?onRetry=\{\(\) => \{ void refetchPrescriptions\(\); \}\}/);
  });

  it("SessionsPage mantém cabeçalho/filtros: carregando e erro ficam dentro da lista", () => {
    expect(sessionsPage).not.toMatch(/if \(isLoading\) \{\s*return/);
    expect(sessionsPage).not.toMatch(/if \(error\) \{\s*return/);
    expect(sessionsPage).toMatch(/\) : error \? \([\s\S]*?<ErrorState/);
    expect(sessionsPage).not.toContain("description={error.message}");
  });

  it("SessionsPage: linha da tabela operável por teclado e importação por Excel visível", () => {
    expect(sessionsPage).toContain("tabIndex={0}");
    expect(sessionsPage).toMatch(/e\.key === "Enter" \|\| e\.key === " "/);
    expect(sessionsPage).toContain("Importar Excel");
  });
});

describe("detalhe da sessão sem 'Intensidade' derivada do volume", () => {
  it("não há cartão, filtro nem badge de intensidade", () => {
    expect(detail).not.toContain("getIntensityBadge");
    expect(detail).not.toContain("getExerciseIntensity");
    expect(detail).not.toContain(">Intensidade<");
    expect(detail).not.toMatch(/5000|2000/);
  });

  it("status usa o mesmo componente da lista", () => {
    expect(detail).toContain("<SessionStatusBadge");
    expect(sessionsPage).toContain("<SessionStatusBadge");
    expect(detail).not.toContain("Em andamento");
  });
});

describe("grupo manual: tentar de novo não duplica", () => {
  it("filtra quem já foi salvo nesta abertura antes de inserir", () => {
    expect(group).toMatch(/const alreadySaved = new Set\(manualSavedStudentIds\)/);
    expect(group).toMatch(/\.filter\(se => !alreadySaved\.has\(se\.studentId\)\)/);
  });

  it("uma falha por pessoa não aborta as demais e o erro é descrito", () => {
    expect(group).toMatch(/for \(const session of sessionsToCreate\) \{\s*try \{\s*const result = await saveOneStudent\(session\)/);
    expect(group).toContain("describePartialGroupSave(outcome)");
    expect(group).toContain("throw new PartialGroupSaveError()");
  });

  it("window.confirm saiu; a guarda é um AlertDialog", () => {
    expect(group).not.toContain("window.confirm");
    expect(group).toContain("<DiscardSessionConfirm");
    expect(individual).toContain("<DiscardSessionConfirm");
  });
});

describe("sessão individual: manual como padrão, mesma persistência", () => {
  it("a entrada manual passa pelo mesmo persistSession (rollback do #216 preservado)", () => {
    expect(individual).toMatch(/const handleSaveManualEntry = async[\s\S]*?await persistSession\(exercises, \[\]\)/);
    expect(individual).toMatch(/const handleSave = async[\s\S]*?await persistSession\(editableExercises, editableObservations\)/);
    expect(individual).toContain("createdSessionId = session.id;");
  });

  it("reusa ExerciseFirstSessionEntry com uma pessoa e rascunho de escopo próprio", () => {
    expect(individual).toMatch(/<ExerciseFirstSessionEntry[\s\S]*?selectedStudents=\{\[\{ id: studentId/);
    expect(individual).toContain("draftScope={`individual-${studentId}`}");
  });
});

describe("modo TV e popover de carga", () => {
  it("tabela rola na horizontal em vez de cortar colunas; saída sem falar 'ESC'", () => {
    expect(tv).toMatch(/overflow-x-auto[^"]*"[\s\S]*?<table className="w-full min-w-\[720px\]/);
    expect(tv).not.toMatch(/>\s*ESC\s*</);
    expect(tv).toContain("[@media(pointer:fine)]:block");
  });

  it("foco preso no overlay e devolvido ao fechar", () => {
    expect(tv).toContain('e.key !== "Tab"');
    expect(tv).toContain("previouslyFocused?.focus?.()");
  });

  it("popover só com tokens (sem hex) e acima do overlay", () => {
    expect(popover).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(popover).toContain("z-[110]");
  });
});

describe("WorkoutCard acessível por teclado (achado UX-01 do Codex)", () => {
  it("abrir a sessão é um <button> real, e o Card não tem mais onClick", () => {
    expect(workoutCard).toMatch(/<button\s+type="button"\s+onClick=\{onClick\}/);
    expect(workoutCard).not.toMatch(/<Card[^>]*onClick=/);
  });
});
