/**
 * E4.2 — KPIs do Coach Console Precision 12.
 *
 * Cards read-only com as 5 métricas principais derivadas do hook
 * `usePrecision12CoachConsole`. Sem ações mutáveis.
 */

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Precision12CoachConsoleData } from "@/hooks/usePrecision12CoachConsole";

interface Precision12KpiCardsProps {
  data: Precision12CoachConsoleData;
}

interface Kpi {
  label: string;
  value: number;
  icon: typeof Users;
  /** Cor do ícone — Tailwind class. */
  tone: string;
  /** Microcopy explicativa pra hover/screen-reader. */
  description: string;
}

export function Precision12KpiCards({ data }: Precision12KpiCardsProps) {
  const parqBlocked = data.actionQueue.filter(
    (item) => item.alertType === "parq_blocked",
  ).length;
  const questionnairePending = data.actionQueue.filter(
    (item) => item.alertType === "questionnaire_pending",
  ).length;

  const kpis: Kpi[] = [
    {
      label: "Alunos Precision 12",
      value: data.students.length,
      icon: Users,
      tone: "text-foreground",
      description: "Total de alunos no programa Precision 12 ou com avaliação Precision 12",
    },
    {
      label: "PAR-Q bloqueados",
      value: parqBlocked,
      icon: AlertTriangle,
      tone: "text-destructive",
      description: "Questionários com PAR-Q positivo — revisar antes de liberar treino",
    },
    {
      label: "Questionários pendentes",
      value: questionnairePending,
      icon: ClipboardList,
      tone: "text-warning",
      description: "Link enviado e ainda sem resposta",
    },
    {
      label: "Avaliações em andamento",
      value: data.statusCounts.in_progress,
      icon: Clock,
      tone: "text-info",
      description: "Avaliações Precision 12 iniciadas e ainda não concluídas",
    },
    {
      label: "Avaliações concluídas",
      value: data.statusCounts.completed,
      icon: CheckCircle2,
      tone: "text-success",
      description: "Total de avaliações Precision 12 concluídas",
    },
  ];

  return (
    <div
      className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      role="list"
      aria-label="Indicadores Precision 12"
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} role="listitem" title={kpi.description}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {kpi.value}
                  </p>
                </div>
                <Icon
                  className={`h-5 w-5 shrink-0 ${kpi.tone}`}
                  aria-hidden="true"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
