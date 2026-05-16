/**
 * E5.5 — Preview read-only de evidências clínico-operacionais por aluno
 * no Coach Console Precision 12.
 *
 * Consome dados JÁ carregados pelo `usePrecision12CoachConsole` (E4.1) e
 * roda os derivadores E5.3 sem nova query. Renderiza cada conjunto de
 * claims dentro do componente burro `EvidenceClaimList` (E5.4).
 *
 * Cobertura atual (E5.5):
 *   - PAR-Q (a partir de questionnaire_responses.parq_blocked)
 *   - Sono/Estresse/Energia/Adesão (a partir das colunas da response)
 *
 * Cobertura PENDENTE (ver LIMITATIONS_NOT_COVERED_YET):
 *   - VO₂, FC recovery, Handgrip, Sit-to-Stand, DEXA
 *   Esses domínios precisam fetch adicional + lookups de ref_ranges.
 *   Próximo PR pode estender o hook E4.1 (`usePrecision12CoachConsole`)
 *   pra carregar esses dados e adicionar mappers aqui.
 *
 * Read-only absoluto: sem hook próprio, sem fetch, sem mutation, sem
 * abertura automática de janela. Componente "burro".
 */

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CoachConsoleQuestionnaire,
  CoachConsoleStudent,
} from "@/utils/precision12CoachConsole";
import { deriveEvidenceClaims } from "@/utils/precision12EvidenceDerivation";
import {
  LIMITATIONS_NOT_COVERED_YET,
  indexResponsesByAssessmentId,
  mapQuestionnaireResponseToEvidenceInput,
} from "@/utils/precision12EvidenceMapping";

import { EvidenceClaimList } from "./EvidenceClaimList";

interface Precision12EvidencePreviewProps {
  /** Mesmos `students` carregados pelo hook E4.1. */
  students: readonly CoachConsoleStudent[];
  /** Mesmas `responses` carregadas pelo hook E4.1. */
  responses: readonly CoachConsoleQuestionnaire[];
  /** Repassa pra cada card (default: false). */
  showPrinciples?: boolean;
}

interface StudentEvidenceGroup {
  studentId: string;
  studentName: string;
  /** Claims derivadas das responses do aluno. Pode estar vazio. */
  claims: ReturnType<typeof deriveEvidenceClaims>;
}

/**
 * Agrupa responses por student_id (via assessment → student) e devolve a
 * lista de claims derivadas por aluno. Apenas alunos com PELO MENOS uma
 * claim entram no resultado (estado vazio é responsabilidade do
 * componente-pai).
 *
 * Nota: o hook E4.1 expõe `responses` (CoachConsoleQuestionnaire) que
 * contém `assessment_id`, mas NÃO `student_id`. Não temos lookup direto
 * response→student aqui sem cruzar com `assessments`. Como a UI principal
 * já mostra a fila por nome do aluno, e essa preview é COMPLEMENTAR (foco
 * em wording clínico), nesta rodada usamos um agrupamento simples por
 * `assessment_id` → claim, sem nome de aluno. Quando essa preview ganhar
 * espaço real na UI (por exemplo dentro do drawer), o cross-join pode
 * vir do componente-pai.
 */
function deriveAllClaimsFromResponses(
  responses: readonly CoachConsoleQuestionnaire[],
): Array<{ assessmentId: string; claims: ReturnType<typeof deriveEvidenceClaims> }> {
  const out: Array<{
    assessmentId: string;
    claims: ReturnType<typeof deriveEvidenceClaims>;
  }> = [];
  for (const response of responses) {
    if (!response.assessment_id) continue;
    const input = mapQuestionnaireResponseToEvidenceInput(response);
    const claims = deriveEvidenceClaims(input);
    if (claims.length === 0) continue;
    out.push({ assessmentId: response.assessment_id, claims });
  }
  return out;
}

export function Precision12EvidencePreview({
  students,
  responses,
  showPrinciples = false,
}: Precision12EvidencePreviewProps) {
  // Mantemos `students` na assinatura para usos futuros (ex.: cruzar
  // response.assessment_id → student.name). Esta rodada não precisa,
  // mas evita breaking change quando a integração crescer.
  void students;

  const responseGroups = useMemo(
    () => deriveAllClaimsFromResponses(responses),
    [responses],
  );

  // `indexResponsesByAssessmentId` é exportado pra ser reusável fora — aqui
  // garantimos pelo menos uma chamada pra exercitar o helper em build, mas
  // sem retornar valor (não usado nesta versão da preview).
  void indexResponsesByAssessmentId;

  const totalClaims = responseGroups.reduce(
    (sum, g) => sum + g.claims.length,
    0,
  );

  return (
    <Card
      className="border"
      data-testid="precision12-evidence-preview"
      aria-labelledby="p12-evidence-preview-heading"
    >
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle
            id="p12-evidence-preview-heading"
            className="text-sm uppercase tracking-wide text-muted-foreground"
          >
            Evidência clínica-operacional · Preview
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {totalClaims} claim{totalClaims === 1 ? "" : "s"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Texto associativo, não diagnóstico. Cobertura atual:{" "}
          <strong>PAR-Q + Sono/Estresse/Energia/Adesão</strong>. Demais domínios
          ficam pendentes de dados (ver lista abaixo).
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {responseGroups.length === 0 ? (
          <EvidenceClaimList claims={[]} showPrinciples={showPrinciples} />
        ) : (
          responseGroups.map((group) => (
            <section
              key={group.assessmentId}
              aria-label={`Evidências do questionário ${group.assessmentId}`}
              className="space-y-2"
            >
              <p className="text-[11px] font-mono text-muted-foreground">
                Questionário · assessment_id{" "}
                <span data-testid="evidence-assessment-id">
                  {group.assessmentId}
                </span>
              </p>
              <EvidenceClaimList
                claims={group.claims}
                showPrinciples={showPrinciples}
              />
            </section>
          ))
        )}

        <details
          className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground"
          data-testid="evidence-preview-limitations"
        >
          <summary className="cursor-pointer font-semibold">
            Limitações conhecidas ({LIMITATIONS_NOT_COVERED_YET.length} domínios
            ainda não cobertos)
          </summary>
          <ul className="mt-2 space-y-1">
            {LIMITATIONS_NOT_COVERED_YET.map((item) => (
              <li key={item.domain}>
                <span className="font-mono">{item.domain}</span> — {item.reason}
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
