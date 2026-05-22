/**
 * Source-based coverage do PR 2 — drag-and-drop de pastas de prescrição.
 *
 * Trava os invariantes da migration `create_move_prescription_folder_rpc`,
 * do hook useMoveFolder e do frontend de drag de pastas — sem precisar de
 * Postgres nem de render. Mesmo padrão dos demais *.coverage.test.ts.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const rpcSql = read(
  "../../../supabase/migrations/20260522091438_create_move_prescription_folder_rpc.sql",
);
const useFoldersSrc = read("../../hooks/useFolders.ts");
const folderTreeSrc = read("../../components/FolderTree.tsx");
const folderSectionSrc = read("../../components/FolderSection.tsx");
const prescriptionsPageSrc = read("../../pages/PrescriptionsPage.tsx");
const supabaseTypesSrc = read("../../integrations/supabase/types.ts");

/** RPC SQL sem comentários — usado nas asserts de "não deve conter". */
const rpcCode = rpcSql
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/--[^\n]*/g, " ");
const rpcLower = rpcCode.toLowerCase();

describe("PR2 — drag-and-drop de pastas", () => {
  describe("RPC move_prescription_folder", () => {
    it("é uma função plpgsql que retorna void", () => {
      expect(rpcCode).toMatch(
        /create\s+or\s+replace\s+function\s+public\.move_prescription_folder/i,
      );
      expect(rpcLower).toContain("returns void");
      expect(rpcLower).toContain("language plpgsql");
    });

    it("exige um chamador autenticado (auth.uid())", () => {
      expect(rpcLower).toContain("auth.uid()");
      expect(rpcLower).toMatch(/v_uid\s+is\s+null/);
    });

    it("bloqueia mover uma pasta para dentro dela mesma", () => {
      expect(rpcCode).toMatch(/p_new_parent_id\s*=\s*p_folder_id/);
      expect(rpcSql).toContain("Cannot move a folder into itself");
    });

    it("usa CTE recursiva para bloquear move para descendente", () => {
      expect(rpcLower).toContain("with recursive descendants");
      expect(rpcSql).toContain("Cannot move a folder into its own descendant");
    });

    it("bloqueia move que ultrapasse profundidade 5", () => {
      expect(rpcCode).toMatch(/v_new_depth\s*\+\s*v_subtree_height\s*>\s*5/);
      expect(rpcSql).toContain("Maximum folder depth (5 levels) exceeded");
    });

    it("recalcula depth_level e full_path da subárvore via CTE recursiva", () => {
      expect(rpcLower).toContain("with recursive subtree");
      expect(rpcCode).toMatch(
        /update\s+prescription_folders[\s\S]*set[\s\S]*depth_level[\s\S]*full_path/i,
      );
    });

    it("concede EXECUTE só a authenticated, nunca a anon", () => {
      expect(rpcCode).toMatch(
        /grant\s+execute\s+on\s+function\s+public\.move_prescription_folder[^;]*to\s+authenticated/i,
      );
      expect(rpcCode).toMatch(/revoke\s+all[^;]*from\s+public,\s*anon/i);
      const grantsToAnon = rpcCode
        .split("\n")
        .filter((l) => /\bgrant\b/i.test(l) && /\banon\b/i.test(l));
      expect(grantsToAnon).toEqual([]);
    });
  });

  describe("hook useMoveFolder", () => {
    it("existe e chama a RPC move_prescription_folder", () => {
      expect(useFoldersSrc).toMatch(/export\s+const\s+useMoveFolder\s*=/);
      expect(useFoldersSrc).toContain('supabase.rpc("move_prescription_folder"');
    });

    it("invalida as queries de pastas e de prescrições", () => {
      const hookSlice = useFoldersSrc.slice(
        useFoldersSrc.indexOf("useMoveFolder"),
      );
      expect(hookSlice).toContain('"prescription-folders"');
      expect(hookSlice).toContain('"prescriptions"');
    });

    it("expõe helpers de árvore (subtree height + descendentes)", () => {
      expect(useFoldersSrc).toMatch(/export\s+const\s+getFolderSubtreeHeight/);
      expect(useFoldersSrc).toMatch(/export\s+const\s+getDescendantFolderIds/);
    });
  });

  describe("FolderTree — pastas draggable e droppable", () => {
    it("torna a pasta arrastável (useDraggable, type folder)", () => {
      expect(folderTreeSrc).toContain("useDraggable");
      expect(folderTreeSrc).toMatch(/type:\s*'folder'/);
    });

    it("mantém a pasta como drop target (useDroppable)", () => {
      expect(folderTreeSrc).toContain("useDroppable");
    });

    it("bloqueia visualmente self/descendente e excesso de profundidade", () => {
      expect(folderTreeSrc).toContain("ancestorIds");
      expect(folderTreeSrc).toContain("MAX_FOLDER_DEPTH");
      expect(folderTreeSrc).toMatch(/dropRejected|dropBlocked/);
    });
  });

  describe("FolderSection — raiz aceita drop de pasta", () => {
    it("detecta drag de pasta e oferece destino raiz", () => {
      expect(folderSectionSrc).toMatch(/type\s*===\s*'folder'/);
      expect(folderSectionSrc).toContain("raiz");
    });
  });

  describe("PrescriptionsPage — diferencia folder e prescription", () => {
    it("trata o drag de pasta separadamente do de prescrição", () => {
      expect(prescriptionsPageSrc).toMatch(
        /active\.data\.current\?\.type\s*===\s*'folder'/,
      );
      expect(prescriptionsPageSrc).toContain("moveFolder.mutateAsync");
    });

    it("mantém o comportamento de prescrição (move + reorder)", () => {
      expect(prescriptionsPageSrc).toContain("movePrescription.mutateAsync");
      expect(prescriptionsPageSrc).toContain("reorderPrescriptions.mutateAsync");
    });

    it("renderiza o destino raiz durante o drag de pasta", () => {
      expect(prescriptionsPageSrc).toMatch(/activeDragType\s*===\s*'folder'/);
    });
  });

  describe("types.ts — RPC declarada", () => {
    it("inclui move_prescription_folder em Functions", () => {
      expect(supabaseTypesSrc).toContain("move_prescription_folder");
    });
  });
});
