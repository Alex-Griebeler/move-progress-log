/**
 * E4.3a — Filtros operacionais da tab Precision 12 no Coach Console.
 *
 * Read-only: ajusta o que aparece na fila de ação e na tabela de progresso
 * (KPIs continuam globais, propositalmente — o coach mantém o panorama
 * mesmo quando investiga subconjuntos).
 *
 * Sem mutations. Sem chamadas de rede. Recebe `filters` controlado de fora.
 */

import { Eye, EyeOff, Filter, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  ActionQueueAlertType,
  Precision12Filters,
  ProgressStatusFilter,
} from "@/utils/precision12CoachConsole";

interface Precision12FiltersProps {
  filters: Precision12Filters;
  onFiltersChange: (next: Precision12Filters) => void;
  /** Nº de alunos de smoke ocultos no momento — pra banner contextual. */
  hiddenSmokeCount: number;
}

const ALERT_TYPE_OPTIONS: { value: ActionQueueAlertType | "all"; label: string }[] = [
  { value: "all", label: "Todos os alertas" },
  { value: "parq_blocked", label: "PAR-Q bloqueado" },
  { value: "questionnaire_pending", label: "Questionário pendente" },
  { value: "assessment_incomplete", label: "Avaliação incompleta" },
  { value: "dexa_pending", label: "DEXA pendente" },
  { value: "student_no_assessment", label: "Sem avaliação no ciclo" },
  { value: "adherence_risk", label: "Possível risco de adesão" },
];

const PROGRESS_STATUS_OPTIONS: { value: ProgressStatusFilter; label: string }[] = [
  { value: "all", label: "Todos os alunos" },
  { value: "no_completed", label: "Sem categoria completa" },
  { value: "anamnese_done", label: "Anamnese feita" },
  { value: "parq_blocked", label: "PAR-Q bloqueado na fila" },
];

export function Precision12Filters({
  filters,
  onFiltersChange,
  hiddenSmokeCount,
}: Precision12FiltersProps) {
  function update<K extends keyof Precision12Filters>(
    key: K,
    value: Precision12Filters[K],
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const showHiddenBanner = filters.hideTestData && hiddenSmokeCount > 0;

  return (
    <section
      aria-label="Filtros do Coach Console Precision 12"
      className="rounded-md border bg-card/60 p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Filter className="h-4 w-4" aria-hidden />
        <span>Filtros</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="p12-search" className="text-xs">
            Buscar aluno
          </Label>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="p12-search"
              type="search"
              placeholder="Nome do aluno…"
              value={filters.searchQuery}
              onChange={(e) => update("searchQuery", e.target.value)}
              className="pl-8"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p12-alert-type" className="text-xs">
            Tipo de alerta (fila)
          </Label>
          <Select
            value={filters.alertType}
            onValueChange={(value) =>
              update("alertType", value as Precision12Filters["alertType"])
            }
          >
            <SelectTrigger id="p12-alert-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALERT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p12-progress-status" className="text-xs">
            Status de progresso (tabela)
          </Label>
          <Select
            value={filters.progressStatus}
            onValueChange={(value) =>
              update(
                "progressStatus",
                value as Precision12Filters["progressStatus"],
              )
            }
          >
            <SelectTrigger id="p12-progress-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROGRESS_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p12-hide-test" className="text-xs">
            Dados de teste
          </Label>
          <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-background">
            {filters.hideTestData ? (
              <EyeOff
                className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                aria-hidden
              />
            ) : (
              <Eye
                className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                aria-hidden
              />
            )}
            <Switch
              id="p12-hide-test"
              checked={filters.hideTestData}
              onCheckedChange={(checked) => update("hideTestData", checked)}
              aria-label="Ocultar alunos de teste/smoke"
            />
            <span className="text-xs text-muted-foreground truncate">
              {filters.hideTestData ? "Ocultos" : "Visíveis"}
            </span>
          </div>
        </div>
      </div>

      {showHiddenBanner && (
        <p
          className="text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Dados de teste ocultos:{" "}
          <span className="font-semibold tabular-nums">{hiddenSmokeCount}</span>{" "}
          aluno{hiddenSmokeCount === 1 ? "" : "s"}. Use o toggle pra
          exibi-los.
        </p>
      )}
    </section>
  );
}
