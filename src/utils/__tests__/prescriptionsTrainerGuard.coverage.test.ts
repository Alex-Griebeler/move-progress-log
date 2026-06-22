/**
 * Source-based coverage: o gatilho de "gerar sessão em grupo" na
 * PrescriptionsPage é uma ação de treinador (a edge generate-group-session só
 * aceita admin/moderator) e deve ficar escondido para aluno (user). O backend
 * já retorna 403; isto trava que a UI não exponha um botão que sempre falharia.
 *
 * Lê a fonte SEM comentários (stripComments) para travar o código real.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function read(rel: string) {
  return readFileSync(resolve(__dirname, "../../..", rel), "utf-8");
}

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*\n/g, "");

const prescriptionsSource = stripComments(read("src/pages/PrescriptionsPage.tsx"));

describe("PrescriptionsPage — gatilho de sessão em grupo é guardado por role (#212/UX)", () => {
  it("importa e usa useIsModerator para derivar a permissão", () => {
    expect(prescriptionsSource).toContain('from "@/hooks/useUserRole"');
    expect(prescriptionsSource).toContain("useIsModerator()");
  });

  it("o botão 'Gerar com IA' (generate-group-session) só renderiza para treinador/admin", () => {
    // Existe exatamente UM gatilho que abre o generate-group-session...
    const triggers = prescriptionsSource.match(/setGenerateSessionDialogOpen\(true\)/g) ?? [];
    expect(triggers).toHaveLength(1);
    // ...e ele precisa estar DENTRO do guard (pega um futuro 2º trigger desprotegido).
    expect(prescriptionsSource).toMatch(
      /\{canGenerateGroupSession && \([\s\S]*?setGenerateSessionDialogOpen\(true\)/
    );
  });
});
