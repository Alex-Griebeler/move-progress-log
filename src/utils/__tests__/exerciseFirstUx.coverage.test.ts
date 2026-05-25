/**
 * Source-based coverage do PR de UX no modo manual "Por Exercício".
 *
 * Trava os invariantes:
 *   - Observação agora é um <Textarea> editável, persistido no state e no
 *     payload final de onSave (corrige o bug de campo "não digitável" que
 *     vinha da tabela espremida em desktop).
 *   - Nome do aluno é exibido por extenso — sem `.split(" ")[0]`.
 *   - O layout de tabela em desktop foi removido; todos os viewports usam
 *     o layout de cards.
 *   - Painel lateral "Roteiro do treino" existe, navega ao clicar e
 *     destaca o exercício atual.
 *   - O autosave do PR #189 continua wired (useSessionDraft + saveDraft
 *     + clearDraft após onSave bem-sucedido + DraftHistoryDialog).
 *   - calculateLoadFromBreakdown e parser de carga continuam intactos.
 *   - RecordGroupSessionDialog foi alargado (max-w-7xl).
 *
 * Mesmo padrão dos demais *.coverage.test.ts (readFileSync + asserts no
 * fonte) — sem render, sem Postgres.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const componentSrc = read("../../components/ExerciseFirstSessionEntry.tsx");
const recordDialogSrc = read("../../components/RecordGroupSessionDialog.tsx");

describe("ExerciseFirstSessionEntry — UX overhaul", () => {
  describe("Bug fix: campo Observação digitável", () => {
    it("usa Textarea (não Input) para observações", () => {
      // Importa Textarea + usa <Textarea ... > com onChange que escreve em
      // observations via updateField.
      expect(componentSrc).toMatch(
        /import\s*\{\s*Textarea\s*\}\s*from\s*"@\/components\/ui\/textarea"/,
      );
      expect(componentSrc).toMatch(
        /<Textarea[\s\S]*?value=\{entry\.observations\}[\s\S]*?onChange=\{[\s\S]*?updateField\(student\.id,\s*exerciseIndex,\s*"observations"/,
      );
    });

    it("observations entra no payload final de onSave", () => {
      // O studentExercises[].exercises[].observations é construído em
      // handleSubmit a partir de entry.observations.
      expect(componentSrc).toMatch(
        /observations:\s*entry\?\.observations\s*\|\|\s*""/,
      );
    });
  });

  describe("Nome completo do aluno", () => {
    it("mostra student.name por extenso (sem .split)", () => {
      expect(componentSrc).toContain("{student.name}");
      // Não pode mais haver split(" ")[0] no componente.
      expect(componentSrc).not.toMatch(/student\.name\.split\(/);
    });
  });

  describe("Layout de cards em todos os viewports", () => {
    it("removeu a tabela espremida (sem <Table>, <TableHead>, <TableRow>)", () => {
      expect(componentSrc).not.toContain("<Table>");
      expect(componentSrc).not.toMatch(/<TableHead\b/);
      expect(componentSrc).not.toMatch(/<TableRow\b/);
      expect(componentSrc).not.toMatch(/<TableCell\b/);
    });

    it("renderiza os cards sem mais o gate lg:hidden", () => {
      // Antes: <div className="space-y-3 lg:hidden">; agora os cards são
      // o único caminho de render para todos os viewports.
      expect(componentSrc).not.toMatch(/space-y-3 lg:hidden/);
      expect(componentSrc).toMatch(
        /<CardContent[^>]*>[\s\S]*?\{selectedStudents\.map\(renderTouchStudentCard\)\}/,
      );
    });
  });

  describe("Painel lateral com treino completo (lg+)", () => {
    it("renderiza <aside> 'Roteiro do treino' visível só em lg+", () => {
      expect(componentSrc).toMatch(
        /<aside[\s\S]*?aria-label="Roteiro do treino"[\s\S]*?className="[^"]*hidden lg:block/,
      );
      expect(componentSrc).toContain("Roteiro do treino");
    });

    it("cada item da lista navega para o exercício correspondente", () => {
      expect(componentSrc).toMatch(
        /prescriptionExercises\.map\(\(px,\s*idx\)\s*=>[\s\S]*?onClick=\{\(\)\s*=>\s*setExerciseIndex\(idx\)\}/,
      );
    });

    it("destaca o exercício atual (aria-current=step)", () => {
      expect(componentSrc).toMatch(
        /isCurrent\s*=\s*idx\s*===\s*exerciseIndex/,
      );
      expect(componentSrc).toContain('aria-current={isCurrent ? "step" : undefined}');
    });

    it("mostra sets, reps, PSE/RIR, método e observações da prescrição", () => {
      // Linha de metadados do item.
      expect(componentSrc).toMatch(
        /\{px\.sets\}×\{px\.reps\}[\s\S]*?\{px\.pse[\s\S]*?\{px\.rir[\s\S]*?\{px\.training_method/,
      );
      // Bloco de observações do prescrito (linha pequena).
      expect(componentSrc).toMatch(/\{px\.observations\}/);
    });
  });

  describe("Autosave do PR #189 preservado", () => {
    it("continua importando e consumindo useSessionDraft", () => {
      expect(componentSrc).toMatch(
        /import\s*\{\s*useSessionDraft\s*\}\s*from\s*"@\/hooks\/useSessionDraft"/,
      );
      expect(componentSrc).toMatch(
        /\{\s*draft,\s*saveDraft,\s*clearDraft,\s*restoreDraft,\s*isSaving,\s*lastSaved\s*\}\s*=\s*useSessionDraft\(/,
      );
    });

    it("indicador 'Rascunho salvo' e DraftHistoryDialog continuam montados", () => {
      expect(componentSrc).toContain("Rascunho salvo ");
      expect(componentSrc).toMatch(/<DraftHistoryDialog[\s\S]*?onRestoreDraft=\{handleRestoreFromHistory\}/);
    });

    it("clearDraft continua ocorrendo só após onSave bem-sucedido", () => {
      expect(componentSrc).toMatch(
        /await\s+onSave\(\{\s*studentExercises\s*\}\)[\s\S]*?clearDraft\(\)[\s\S]*?\}\s*catch/,
      );
    });
  });

  describe("Comportamento original preservado", () => {
    it("calculateLoadFromBreakdown continua sendo usado", () => {
      expect(componentSrc).toContain("calculateLoadFromBreakdown");
    });

    it("carga total editável continua presente (handleManualLoadKgChange)", () => {
      expect(componentSrc).toContain("handleManualLoadKgChange");
    });

    it("aplicar carga p/ todos continua presente (handleApplyToAll)", () => {
      expect(componentSrc).toContain("handleApplyToAll");
      expect(componentSrc).toContain("Aplicar carga p/ todos");
    });

    it("troca de exercício (openSubstitution) continua presente", () => {
      expect(componentSrc).toContain("openSubstitution");
    });
  });

  describe("Modal mais largo (RecordGroupSessionDialog)", () => {
    it("DialogContent usa max-w-7xl em vez de max-w-4xl", () => {
      expect(recordDialogSrc).toMatch(
        /<DialogContent[\s\S]*?className="[^"]*max-w-7xl/,
      );
      expect(recordDialogSrc).not.toMatch(/<DialogContent[\s\S]*?max-w-4xl/);
    });
  });
});
