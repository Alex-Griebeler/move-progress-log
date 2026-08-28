/**
 * Tab "Avaliações" no StudentDetailPage.
 *
 * Lista todas as avaliações do aluno, agrupadas/filtráveis por
 * categoria, com botão "Nova avaliação" abrindo o wizard.
 *
 * Redesign PR-8b: cada card mostra o RESULTADO (número-chave, classificação
 * contra as faixas seedadas e variação vs a avaliação anterior do mesmo
 * tipo), não só o tipo do teste e o status. Detalhe drill-down abre um
 * painel read-only com os dados salvos.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ASSESSMENT_TYPE_METADATA } from "@/constants/assessmentProtocols";
import { useAssessmentsByStudent, type AssessmentListRow } from "@/hooks/useAssessments";
import {
  useHandgripReferenceRanges,
  useSitToStandReferenceRanges,
  useVo2ReferenceRanges,
} from "@/hooks/useReferenceRanges";
import type { AssessmentType } from "@/types/assessment";
import { computeAssessmentDeltas } from "@/utils/assessmentTrends";
import { resolveAssessmentSubject } from "@/utils/assessmentSubject";
import {
  classifyAssessmentKind,
  classifyAssessmentValue,
  extractKeyResult,
  questionnaireSummary,
  vo2Modality,
  type AssessmentKind,
} from "@/utils/assessmentSummary";

import { CreateAssessmentWizard } from "./CreateAssessmentWizard";
import { AssessmentDetailSheet } from "./AssessmentDetailSheet";
import { AssessmentResultCard } from "./AssessmentResultCard";

// ────────────────────────────────────────────────────────────────────────────

interface AssessmentsTabProps {
  studentId: string;
  studentBirthDate?: string | null;
  studentDefaults?: {
    age_years?: number | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    sex?: "M" | "F" | null;
  };
}

const ALL_CATEGORIES = ["all", "VO₂", "Força", "Composição", "Funcional", "Anamnese"] as const;
type CategoryFilter = (typeof ALL_CATEGORIES)[number];

/** Extrai os campos-resultado das relações embutidas pra forma normalizada. */
const detailsOf = (a: AssessmentListRow) => ({
  vo2Final: a.vo2_assessment_details?.vo2_final ?? null,
  rightKgAttempts: a.handgrip_results?.right_kg_attempts ?? null,
  fatPct: a.dexa_results?.fat_pct ?? null,
  sitToStandTotal: a.sit_to_stand_results?.total_score ?? null,
  parqBlocked: a.questionnaire_responses?.parq_blocked ?? null,
  questionnaireCompleted: a.questionnaire_responses?.submitted_at != null,
});

// ────────────────────────────────────────────────────────────────────────────

export const AssessmentsTab = ({
  studentId,
  studentBirthDate,
  studentDefaults,
}: AssessmentsTabProps) => {
  const { data: assessments, isLoading, isError, refetch } = useAssessmentsByStudent(studentId);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  // Réguas de classificação (PR-8a). Cache longo: mudam só num reseed.
  const vo2RangesQuery = useVo2ReferenceRanges();
  const handgripRangesQuery = useHandgripReferenceRanges();
  const sitToStandRangesQuery = useSitToStandReferenceRanges();
  const { data: vo2Ranges } = vo2RangesQuery;
  const { data: handgripRanges } = handgripRangesQuery;
  const { data: sitToStandRanges } = sitToStandRangesQuery;
  // Sem isso, régua que falhou é indistinguível de aluno sem faixa aplicável:
  // os cards simplesmente ficariam sem classificação, para sempre e em silêncio.
  const rangesFailed =
    vo2RangesQuery.isError || handgripRangesQuery.isError || sitToStandRangesQuery.isError;

  // E4.3b — Deep-link read-only: `?assessmentId=<uuid>` na URL abre o sheet
  // automaticamente após os assessments do aluno carregarem. Aplicado uma
  // única vez (ref-guard) pra não reabrir o sheet quando o coach o fechar.
  // Validado contra a lista carregada: assessmentId que não bate com nenhum
  // assessment do aluno é simplesmente ignorado (defensivo).
  const [searchParams] = useSearchParams();
  const deepLinkApplied = useRef(false);
  // Trocar de aluno sem desmontar o componente (navegação entre fichas)
  // deixaria o sheet do aluno anterior aberto e o guard já consumido — o
  // deep-link do novo aluno seria ignorado e a avaliação antiga apareceria
  // reclassificada com o sexo/nascimento do aluno novo.
  const lastStudentId = useRef(studentId);
  useEffect(() => {
    if (lastStudentId.current !== studentId) {
      lastStudentId.current = studentId;
      deepLinkApplied.current = false;
      setSelectedAssessmentId(null);
    }
  }, [studentId]);
  useEffect(() => {
    if (deepLinkApplied.current) return;
    if (!assessments) return;
    const requested = searchParams.get("assessmentId");
    if (requested && assessments.some((a) => a.id === requested)) {
      setSelectedAssessmentId(requested);
    }
    deepLinkApplied.current = true;
  }, [assessments, searchParams]);

  /**
   * Enriquece cada avaliação com resultado-chave, classificação e Δ.
   *
   * O Δ é calculado POR TIPO sobre a lista inteira — nunca sobre a lista
   * filtrada, senão trocar de filtro mudaria a base de comparação e o mesmo
   * teste mostraria variações diferentes conforme a aba aberta.
   */
  const enriched = useMemo(() => {
    const rows = assessments ?? [];
    const byId = new Map<
      string,
      {
        kind: AssessmentKind;
        keyResult: ReturnType<typeof extractKeyResult>;
        classification: string | null;
        delta: number | null;
        comparedTo: string | null;
        hasProtocolCaveat: boolean;
      }
    >();

    // 1ª passada: resultado-chave + classificação, por avaliação.
    // Bucket do Δ é o assessment_type EXATO, não o kind: os 5 protocolos de
    // VO₂ colapsam num kind só, e comparar uma bike submáxima com uma esteira
    // máxima seria comparar medidas de protocolos diferentes.
    const points = new Map<string, AssessmentPointLike[]>();
    for (const a of rows) {
      const kind = classifyAssessmentKind(a.assessment_type);
      const keyResult = extractKeyResult(kind, detailsOf(a));
      const subject = resolveAssessmentSubject({
        snapshotSex: a.sex,
        snapshotAgeYears: a.age_years,
        assessmentDate: a.assessment_date,
        studentSex: studentDefaults?.sex ?? null,
        studentBirthDate: studentBirthDate ?? null,
      });
      const classification = classifyAssessmentValue(kind, keyResult.value, subject, {
        vo2: vo2Ranges,
        handgrip: handgripRanges,
        sitToStand: sitToStandRanges,
      });
      const modality = vo2Modality(a.assessment_type);

      byId.set(a.id, {
        kind,
        keyResult,
        classification,
        delta: null,
        comparedTo: null,
        hasProtocolCaveat: kind === "vo2" && !modality.matchesReferenceProtocol,
      });

      const deltaBucket = a.assessment_type ?? kind;
      if (!points.has(deltaBucket)) points.set(deltaBucket, []);
      points.get(deltaBucket)!.push({
        id: a.id,
        date: a.assessment_date,
        value: keyResult.value,
        createdAt: a.created_at,
        status: a.status,
      });
    }

    // 2ª passada: Δ dentro de cada tipo.
    for (const list of points.values()) {
      for (const d of computeAssessmentDeltas(list)) {
        const entry = byId.get(d.id);
        if (entry) {
          entry.delta = d.delta;
          entry.comparedTo = d.comparedTo;
        }
      }
    }

    return byId;
  }, [assessments, studentDefaults?.sex, studentBirthDate, vo2Ranges, handgripRanges, sitToStandRanges]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assessments ?? []) {
      const category = ASSESSMENT_TYPE_METADATA[a.assessment_type as AssessmentType]?.category;
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [assessments]);

  const filtered = useMemo(() => {
    if (!assessments) return [];
    if (filter === "all") return assessments;
    return assessments.filter((a) => {
      const meta = ASSESSMENT_TYPE_METADATA[a.assessment_type as AssessmentType];
      return meta?.category === filter;
    });
  }, [assessments, filter]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, AssessmentListRow[]>();
    for (const a of filtered) {
      const key = a.assessment_date;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Erro de rede/RLS não pode virar "Nenhuma avaliação ainda" + CTA de criar —
  // falso negativo clínico e convite a duplicar avaliação existente.
  if (isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <Stethoscope className="h-10 w-10 text-destructive/60" />
        <div>
          <p className="font-semibold">Não foi possível carregar as avaliações</p>
          <p className="text-sm text-muted-foreground">
            Verifique a conexão e tente de novo.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Avaliações Precision 12</h2>
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nova avaliação
          </Button>
        </div>

        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Stethoscope className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">Nenhuma avaliação ainda</p>
            <p className="text-sm text-muted-foreground">
              Registre a primeira avaliação clínica deste aluno pra
              começar o programa Precision 12.
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nova avaliação
          </Button>
        </Card>

        <CreateAssessmentWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          studentId={studentId}
          defaults={studentDefaults}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Avaliações Precision 12</h2>
        <Button size="sm" onClick={() => setWizardOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova avaliação
        </Button>
      </div>

      {/* Filtro por categoria */}
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Filtrar avaliações por categoria"
      >
        {ALL_CATEGORIES.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={filter === cat ? "default" : "outline"}
            onClick={() => setFilter(cat)}
            aria-pressed={filter === cat}
            className="h-8 text-xs"
          >
            {cat === "all" ? "Todas" : cat}
            <Badge
              variant={filter === cat ? "secondary" : "outline"}
              className="ml-1.5 text-[10px]"
            >
              {cat === "all" ? assessments.length : (categoryCounts.get(cat) ?? 0)}
            </Badge>
          </Button>
        ))}
      </div>

      {rangesFailed && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          Não foi possível carregar parte das tabelas de referência. Os
          resultados abaixo estão corretos; algumas classificações podem
          ficar indisponíveis.
        </p>
      )}

      {/* Lista agrupada por data */}
      {groupedByDate.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma avaliação na categoria "{filter}".
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedByDate.map(([date, items]) => (
            <section key={date} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
              <div className="space-y-1.5">
                {items.map((a) => {
                  const meta =
                    ASSESSMENT_TYPE_METADATA[a.assessment_type as AssessmentType];
                  const e = enriched.get(a.id);
                  if (!e) return null;
                  return (
                    <AssessmentResultCard
                      key={a.id}
                      typeLabel={meta?.label ?? a.assessment_type}
                      category={meta?.category ?? "?"}
                      kind={e.kind}
                      status={a.status}
                      notes={a.notes}
                      keyResult={e.keyResult}
                      classification={e.classification}
                      delta={e.delta}
                      comparedTo={e.comparedTo}
                      hasProtocolCaveat={e.hasProtocolCaveat}
                      statusSummary={
                        e.kind === "questionnaire"
                          ? questionnaireSummary(detailsOf(a), a.status)
                          : null
                      }
                      onClick={() => setSelectedAssessmentId(a.id)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <CreateAssessmentWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        studentId={studentId}
        defaults={studentDefaults}
      />
      <AssessmentDetailSheet
        assessmentId={selectedAssessmentId}
        studentSex={studentDefaults?.sex ?? null}
        studentBirthDate={studentBirthDate ?? null}
        open={selectedAssessmentId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAssessmentId(null);
        }}
      />
    </div>
  );
};
