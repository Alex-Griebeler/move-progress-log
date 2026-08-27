import { describe, expect, it } from "vitest";
import { ageOnDate, resolveAssessmentSubject } from "../assessmentSubject";

describe("ageOnDate", () => {
  it("idade na data do teste, não a de hoje", () => {
    expect(ageOnDate("1980-06-15", "2020-06-15")).toBe(40);
    expect(ageOnDate("1980-06-15", "2026-08-27")).toBe(46);
  });

  it("aniversário ainda não feito no ano da avaliação", () => {
    expect(ageOnDate("1980-12-31", "2026-06-01")).toBe(45);
  });

  it("aniversário exatamente no dia conta o ano", () => {
    expect(ageOnDate("1990-08-27", "2026-08-27")).toBe(36);
  });

  it("véspera do aniversário não conta", () => {
    expect(ageOnDate("1990-08-27", "2026-08-26")).toBe(35);
  });

  it("data de avaliação anterior ao nascimento → null (dado incoerente)", () => {
    expect(ageOnDate("2000-01-01", "1999-01-01")).toBeNull();
  });

  it("entrada inválida → null", () => {
    expect(ageOnDate("", "2026-01-01")).toBeNull();
    expect(ageOnDate("1980-06-15", "")).toBeNull();
    expect(ageOnDate("nao-e-data", "2026-01-01")).toBeNull();
  });
});

describe("resolveAssessmentSubject", () => {
  it("sexo do snapshot vence o cadastro; idade vem do nascimento quando dá", () => {
    const s = resolveAssessmentSubject({
      snapshotSex: "F",
      snapshotAgeYears: 34,
      assessmentDate: "2026-01-10",
      studentSex: "M",
      studentBirthDate: "1990-01-01",
    });
    expect(s.sex).toBe("F");
    expect(s.ageYears).toBe(36); // idade em 2026-01-10, não o snapshot 34
    expect(s.source).toBe("derived");
  });

  it("sem nascimento, o snapshot é usado como está", () => {
    const s = resolveAssessmentSubject({
      snapshotSex: "F",
      snapshotAgeYears: 34,
      assessmentDate: "2026-01-10",
    });
    expect(s).toEqual({ sex: "F", ageYears: 34, source: "snapshot" });
  });

  it("avaliação RETROATIVA usa a faixa etária da época, não a de hoje", () => {
    // O formulário grava a idade ATUAL no snapshot mesmo quando o coach
    // registra um teste antigo — por isso o cálculo por nascimento vence.
    const s = resolveAssessmentSubject({
      snapshotSex: "M",
      snapshotAgeYears: 51, // idade em 2026, gravada por engano
      assessmentDate: "2020-03-01",
      studentBirthDate: "1975-06-15",
    });
    expect(s.ageYears).toBe(44); // 44 em março/2020 (aniversário em junho)
  });

  it("sem snapshot: deriva do cadastro usando a idade NA DATA da avaliação", () => {
    const s = resolveAssessmentSubject({
      snapshotSex: null,
      snapshotAgeYears: null,
      assessmentDate: "2024-03-01",
      studentSex: "F",
      studentBirthDate: "1990-01-15",
    });
    expect(s.sex).toBe("F");
    expect(s.ageYears).toBe(34); // 34 em 2024, não 36 em 2026
    expect(s.source).toBe("derived");
  });

  it("snapshot parcial (só idade) ainda é 'derived'", () => {
    const s = resolveAssessmentSubject({
      snapshotAgeYears: 40,
      snapshotSex: null,
      studentSex: "M",
      assessmentDate: "2026-01-10",
    });
    expect(s).toEqual({ sex: "M", ageYears: 40, source: "derived" });
  });

  it("normaliza sexo por extenso e caixa", () => {
    expect(resolveAssessmentSubject({ snapshotSex: "feminino", snapshotAgeYears: 30 }).sex).toBe("F");
    expect(resolveAssessmentSubject({ snapshotSex: "m", snapshotAgeYears: 30 }).sex).toBe("M");
  });

  it("valor de sexo desconhecido não vira classificação errada", () => {
    const s = resolveAssessmentSubject({ snapshotSex: "outro", snapshotAgeYears: 30 });
    expect(s.sex).toBeNull();
  });

  it("sem nada → unknown (chamador esconde a classificação)", () => {
    expect(resolveAssessmentSubject({})).toEqual({
      sex: null,
      ageYears: null,
      source: "unknown",
    });
  });

  it("aluno sem data de nascimento e avaliação sem snapshot: só o sexo resolve", () => {
    const s = resolveAssessmentSubject({ studentSex: "F", assessmentDate: "2026-01-10" });
    expect(s.sex).toBe("F");
    expect(s.ageYears).toBeNull();
    expect(s.source).toBe("derived");
  });

  it("nascimento incoerente com a data do teste NÃO cai no snapshot", () => {
    // Avaliação anterior ao nascimento: os dois fatos brigam. Classificar em
    // cima do snapshot aqui seria classificar sobre dado sabidamente errado.
    const s = resolveAssessmentSubject({
      snapshotSex: "M",
      snapshotAgeYears: 40,
      assessmentDate: "1999-01-01",
      studentBirthDate: "2000-01-01",
    });
    expect(s.ageYears).toBeNull();
  });

  it("idade zero é válida (não confundir com ausente)", () => {
    const s = resolveAssessmentSubject({ snapshotSex: "M", snapshotAgeYears: 0 });
    expect(s.ageYears).toBe(0);
    expect(s.source).toBe("snapshot");
  });
});
