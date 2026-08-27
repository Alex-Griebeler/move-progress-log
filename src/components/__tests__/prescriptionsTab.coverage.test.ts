/**
 * PR-3 do redesign — invariantes source-based da aba Prescrições.
 *
 * Cobre:
 *   • extração PrescriptionsTabContent (StudentDetailPage delega);
 *   • vigente como herói (status via assignmentStatus, borda primary);
 *   • preview read-only via usePrescriptionDetails (NUNCA PrescriptionCard,
 *     que importa o TVMode);
 *   • CTA student-scoped: prop OPCIONAL initialStudentIds no dialog,
 *     aplicada só na transição de abertura;
 *   • PrescriptionsPage intocada (coverage tests dela seguem valendo);
 *   • erro ≠ vazio na aba (DataErrorState com retry).
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const tab = read("../student-detail/PrescriptionsTabContent.tsx");
const preview = read("../student-detail/PrescriptionPreview.tsx");
const dialog = read("../AssignPrescriptionDialog.tsx");
const page = read("../../pages/StudentDetailPage.tsx");

describe("extração da aba", () => {
  it("página delega pra PrescriptionsTabContent com estados propagados", () => {
    expect(page).toContain("<PrescriptionsTabContent");
    expect(page).toContain("isError={assignmentsError}");
    expect(page).toContain("refetch={refetchAssignments}");
  });

  it("página não renderiza mais os cards de atribuição inline", () => {
    expect(page).not.toContain("Prescrição removida");
    expect(page).not.toContain("custom_adaptations");
  });
});

describe("vigente como herói", () => {
  it("agrupa por assignmentStatus e destaca vigente", () => {
    expect(tab).toContain("assignmentStatus");
    expect(tab).toContain("assignmentProgress");
    expect(tab).toContain('status === "vigente" && "border-l-2 border-l-primary"');
  });

  it("histórico (expiradas) colapsado em accordion", () => {
    expect(tab).toContain("grouped.expirada");
    expect(tab).toContain("AccordionTrigger");
  });

  it("erro ≠ vazio: DataErrorState com retry", () => {
    expect(tab).toContain("DataErrorState");
    expect(tab).toContain("onRetry={refetch}");
  });
});

describe("preview read-only", () => {
  it("usa usePrescriptionDetails habilitado só com preview aberto", () => {
    expect(preview).toContain("usePrescriptionDetails");
    expect(preview).toContain("open ? prescriptionId : null");
  });

  it("NUNCA importa PrescriptionCard (arrasta TVMode e ações de gestão)", () => {
    // O nome pode aparecer em comentário explicando a decisão — o que não
    // pode existir é o IMPORT.
    expect(preview).not.toMatch(/import .*PrescriptionCard/);
    expect(tab).not.toMatch(/import .*from "@\/components\/PrescriptionCard"/);
  });
});

describe("CTA student-scoped (prop aditiva no dialog)", () => {
  it("initialStudentIds é OPCIONAL", () => {
    expect(dialog).toContain("initialStudentIds?: string[]");
  });

  it("aplicada só na transição de abertura (dep [open])", () => {
    expect(dialog).toMatch(/if \(open && initialStudentIds !== undefined\)/);
    expect(dialog).toMatch(/\}, \[open\]\);/);
  });

  it("ficha passa o aluno atual", () => {
    expect(tab).toContain("initialStudentIds={[studentId]}");
  });
});

describe("fixes pós-review Codex", () => {
  it("prop [] reaplicada (limpa seleção): condição é !== undefined, não truthy", () => {
    expect(dialog).toContain("initialStudentIds !== undefined");
    expect(dialog).not.toContain("initialStudentIds && initialStudentIds.length > 0");
  });

  it("catálogo de prescrições com erro → retry; select desabilitado no loading", () => {
    expect(tab).toContain("refetchPrescriptions");
    expect(tab).toContain("disabled={loadingPrescriptions}");
  });
});
