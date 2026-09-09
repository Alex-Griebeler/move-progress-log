/**
 * Resumo do `oura-sync-all` para a UI, por ALUNA. A função devolve `results`
 * por par (aluna, data) desde o lookback; contar pares como "alunos" mostrava
 * 15 para 5 alunas. Aluna falhou se qualquer data falhou; tem dado se
 * qualquer data trouxe dado (`outcome` !== "no_data").
 */
export interface SyncAllPairResult {
  student_id: string;
  student_name?: string;
  date?: string;
  status: "success" | "failed";
  outcome?: string;
  error?: string;
}

export interface SyncAllStudentsSummary {
  studentsTotal: number;
  studentsOk: number;
  studentsFailed: number;
  studentsWithData: number;
  failedNames: string[];
}

export const summarizeSyncAllByStudent = (results: SyncAllPairResult[]): SyncAllStudentsSummary => {
  const byStudent = new Map<string, { name: string; failed: boolean; withData: boolean }>();
  for (const r of results) {
    const agg = byStudent.get(r.student_id) ?? { name: r.student_name ?? r.student_id, failed: false, withData: false };
    if (r.status === "failed") agg.failed = true;
    if (r.status === "success" && r.outcome && r.outcome !== "no_data") agg.withData = true;
    byStudent.set(r.student_id, agg);
  }
  const all = Array.from(byStudent.values());
  const failed = all.filter((a) => a.failed);
  return {
    studentsTotal: all.length,
    studentsOk: all.length - failed.length,
    studentsFailed: failed.length,
    studentsWithData: all.filter((a) => a.withData).length,
    failedNames: failed.map((a) => a.name),
  };
};
