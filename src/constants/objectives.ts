export const STUDENT_OBJECTIVES = [
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "recondicionamento_lesao", label: "Recondicionamento de Lesão" },
  { value: "saude_longevidade", label: "Saúde e Longevidade" },
  { value: "condicionamento_fisico", label: "Condicionamento Físico" },
  { value: "performance_esportiva", label: "Performance Esportiva" },
] as const;

export type ObjectiveValue = typeof STUDENT_OBJECTIVES[number]["value"];
