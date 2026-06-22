/**
 * Source-based coverage da atomicidade de CRIAÇÃO de sessões (bug #5).
 *
 * Os fluxos de registro criam a sessão e depois inserem os exercícios em
 * chamadas separadas. Se o 2º insert falhar, sobra uma sessão órfã (sem
 * exercícios). Estes testes travam, por construção, que ambos os fluxos de
 * CRIAÇÃO revertem (DELETE) a sessão recém-criada quando os exercícios falham —
 * sem afetar o fluxo de reabertura (que reusa uma sessão existente).
 *
 * Lê o código-fonte SEM comentários (stripComments) para travar o
 * comportamento real, não o texto do comentário. Não roda DOM/jsdom.
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

const individualSource = stripComments(read("src/components/RecordIndividualSessionDialog.tsx"));
const groupSource = stripComments(read("src/components/RecordGroupSessionDialog.tsx"));

describe("atomicidade de criação de sessão — rollback de sessão órfã (#5)", () => {
  it("individual: rastreia a sessão recém-criada e a reverte se os exercícios falharem", () => {
    expect(individualSource).toContain("let createdSessionId");
    // createdSessionId só é setado no branch de criação (não na reabertura)
    expect(individualSource).toContain("createdSessionId = session.id;");
    // Estrutural: o rollback precisa estar DENTRO do if(exercisesError) E
    // guardado por if(createdSessionId), deletando por esse id — provando que
    // não dispara em falhas posteriores nem na reabertura.
    expect(individualSource).toMatch(
      /if \(exercisesError\)\s*\{\s*if \(createdSessionId\)\s*\{[\s\S]*?from\('workout_sessions'\)\.delete\(\)\.eq\('id', createdSessionId\)[\s\S]*?\}\s*throw exercisesError;/
    );
  });

  it("grupo manual: reverte a sessão do aluno se os exercícios falharem", () => {
    // Estrutural: DELETE da sessão do aluno dentro do if(exercisesError), antes do throw.
    expect(groupSource).toMatch(
      /if \(exercisesError\)\s*\{[\s\S]*?from\("workout_sessions"\)\.delete\(\)\.eq\("id", workoutSession\.id\)[\s\S]*?throw exercisesError;/
    );
  });
});
