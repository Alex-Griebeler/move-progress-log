import { describe, expect, it } from "vitest";
import { EXERCISE_SIGLAS, expandExerciseName, siglasInNames } from "@/constants/exerciseSiglas";

describe("expandExerciseName — expansão do dicionário canônico", () => {
  it("expande o exemplo-bandeira do dono", () => {
    expect(expandExerciseName("LMF posteriores da coxa")).toBe(
      "Liberação Miofascial posteriores da coxa",
    );
  });

  it("expande equipamento + conector c/", () => {
    expect(expandExerciseName("Afundo c/ DB")).toBe("Afundo com halter");
    expect(expandExerciseName("Deadlift c/ BB")).toBe("Deadlift com barra");
  });

  it("tolera pontuação nas bordas dos tokens", () => {
    expect(expandExerciseName("Push press (DB/KB)")).toBe("Push press (halter/kettlebell)");
    expect(expandExerciseName("Levantamento terra (BB) — sumô")).toBe(
      "Levantamento terra (barra) — sumô",
    );
  });

  it("expande múltiplas siglas no mesmo nome", () => {
    expect(expandExerciseName("Anti-rotação SAJ c/ SB")).toBe(
      "Anti-rotação semi-ajoelhado com super band",
    );
  });

  it("não toca nomes sem sigla", () => {
    const n = "Agachamento búlgaro";
    expect(expandExerciseName(n)).toBe(n);
  });

  it("não expande substrings dentro de palavras (DB não casa em 'DBoa')", () => {
    expect(expandExerciseName("Cardio DBoa")).toBe("Cardio DBoa");
  });

  it("CARs (caixa mista) expande; 'cars' minúsculo não", () => {
    expect(expandExerciseName("CARs de quadril")).toBe("controlled articular rotations de quadril");
    expect(expandExerciseName("cars de quadril")).toBe("cars de quadril");
  });
});

describe("siglasInNames — legenda do modo TV", () => {
  it("coleta siglas únicas ordenadas, ignorando conectores", () => {
    const legenda = siglasInNames(["Afundo c/ DB", "LMF glúteos", "Deadlift c/ BB", "Stiff c/ DB"]);
    expect(legenda).toEqual([
      ["BB", EXERCISE_SIGLAS.BB],
      ["DB", EXERCISE_SIGLAS.DB],
      ["LMF", EXERCISE_SIGLAS.LMF],
    ]);
  });

  it("lista vazia quando não há siglas", () => {
    expect(siglasInNames(["Agachamento búlgaro"])).toEqual([]);
  });
});
