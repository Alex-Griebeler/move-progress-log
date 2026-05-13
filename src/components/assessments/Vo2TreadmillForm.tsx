/**
 * Form de registro dos 3 testes de VO₂ em esteira:
 *   - treadmill_walk_submax  (caminhada submáxima)
 *   - treadmill_run_submax   (corrida submáxima)
 *   - treadmill_run_max      (corrida máxima)
 *
 * Discriminator: prop `modality`. Mesmo component cobre os 3 porque
 * compartilham 100% dos campos clinicamente relevantes (FCmax, vo2_final,
 * velocidade/inclinação final, tempo total, recuperação).
 *
 * Os 3 caem na mesma tabela filha `vo2_assessment_details` (1:1 com
 * assessments via assessment_id). NÃO usa bike_stages.
 *
 * Decisões:
 *   - Coach digita vo2_final. Cálculo automático fica em E5 (lookup-based).
 *   - Recovery (drop_1min) é input livre — classificação automática
 *     `classifyRecovery` é E5.
 *   - abort_reason é opcional pra teste máximo (esperado: pse_10 / fc_above_90pct
 *     / safety_*); submáximo aceita "pse_9_submax".
 */

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useCreateAssessment } from "@/hooks/useAssessments";
import {
  assessmentBaseSchema,
  localTodayIso,
  vo2TreadmillSchema,
} from "@/utils/assessmentValidation";
import { calcFcMaxPredicted, calcPercentFcMax } from "@/utils/vo2";
import type { AssessmentType } from "@/types/assessment";

// ────────────────────────────────────────────────────────────────────────────

type TreadmillModality =
  | "treadmill_walk_submax"
  | "treadmill_run_submax"
  | "treadmill_run_max";

const MODALITY_LABELS: Record<TreadmillModality, string> = {
  treadmill_walk_submax: "Esteira — caminhada submáxima",
  treadmill_run_submax: "Esteira — corrida submáxima",
  treadmill_run_max: "Esteira — corrida máxima",
};

const ABORT_REASONS = [
  { value: "pse_10", label: "PSE 10 (exaustão)" },
  { value: "pse_9_submax", label: "PSE 9 (submáx, parada planejada)" },
  { value: "fc_above_90pct", label: "FC ≥ 90% FCmáx prevista" },
  { value: "safety_bp", label: "Segurança — PA" },
  { value: "safety_ischemia", label: "Segurança — sinais isquêmicos" },
  { value: "student_request", label: "Aluno pediu parar" },
  { value: "equipment", label: "Falha de equipamento" },
] as const;

const CLEAR_SELECT_VALUE = "__none";

const formSchema = assessmentBaseSchema.extend({
  fc_max_predicted: vo2TreadmillSchema.shape.fc_max_predicted,
  fc_peak: vo2TreadmillSchema.shape.fc_peak,
  vo2_final: vo2TreadmillSchema.shape.vo2_final,
  total_time_min: vo2TreadmillSchema.shape.total_time_min,
  final_speed_kmh: vo2TreadmillSchema.shape.final_speed_kmh,
  final_incline_pct: vo2TreadmillSchema.shape.final_incline_pct,
  protocol_name: vo2TreadmillSchema.shape.protocol_name,
  recovery_drop_1min: vo2TreadmillSchema.shape.recovery_drop_1min,
  abort_reason: vo2TreadmillSchema.shape.abort_reason,
});

type FormData = z.infer<typeof formSchema>;

interface Vo2TreadmillFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  modality: TreadmillModality;
  defaults?: {
    age_years?: number | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    sex?: "M" | "F" | null;
  };
  onCreated?: (assessmentId: string) => void;
}

const parseNumber = (value: string): number | undefined =>
  value === "" ? undefined : Number(value);

// ────────────────────────────────────────────────────────────────────────────

export const Vo2TreadmillForm = ({
  open,
  onOpenChange,
  studentId,
  modality,
  defaults,
  onCreated,
}: Vo2TreadmillFormProps) => {
  const createAssessment = useCreateAssessment();
  const [isSaving, setIsSaving] = useState(false);

  const fcMaxPredictedAuto = defaults?.age_years
    ? calcFcMaxPredicted(defaults.age_years)
    : null;
  const lastAutoFcMax = useRef<number | null>(fcMaxPredictedAuto);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      student_id: studentId,
      assessment_date: localTodayIso(),
      age_years: defaults?.age_years ?? null,
      weight_kg: defaults?.weight_kg ?? null,
      height_cm: defaults?.height_cm ?? null,
      sex: defaults?.sex ?? null,
      notes: "",
      fc_max_predicted: fcMaxPredictedAuto,
      fc_peak: null,
      vo2_final: null,
      total_time_min: null,
      final_speed_kmh: null,
      final_incline_pct: null,
      protocol_name: null,
      recovery_drop_1min: null,
      abort_reason: null,
    },
  });

  const ageYears = form.watch("age_years");
  useEffect(() => {
    const nextAuto =
      typeof ageYears === "number" && Number.isFinite(ageYears)
        ? calcFcMaxPredicted(ageYears)
        : null;
    const current = form.getValues("fc_max_predicted");

    if (current === null || current === undefined || current === lastAutoFcMax.current) {
      form.setValue("fc_max_predicted", nextAuto, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }

    lastAutoFcMax.current = nextAuto;
  }, [ageYears, form]);

  const fcPeak = form.watch("fc_peak");
  const fcMaxPred = form.watch("fc_max_predicted");
  const percentFcMax =
    typeof fcPeak === "number" && typeof fcMaxPred === "number" && fcMaxPred > 0
      ? calcPercentFcMax(fcPeak, fcMaxPred) * 100
      : null;

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const result = await createAssessment.mutateAsync({
        parent: {
          student_id: data.student_id,
          assessment_type: modality as AssessmentType,
          assessment_date: data.assessment_date,
          status: "completed",
          age_years: data.age_years ?? null,
          weight_kg: data.weight_kg ?? null,
          height_cm: data.height_cm ?? null,
          sex: data.sex ?? null,
          notes: data.notes ?? null,
        },
        child: {
          kind: "vo2",
          data: {
            fc_max_predicted: data.fc_max_predicted ?? null,
            fc_peak: data.fc_peak ?? null,
            vo2_final: data.vo2_final ?? null,
            vo2_classification: null,
            recovery_drop_1min: data.recovery_drop_1min ?? null,
            recovery_classification: null,
            total_time_min: data.total_time_min ?? null,
            final_speed_kmh: data.final_speed_kmh ?? null,
            final_incline_pct: data.final_incline_pct ?? null,
            protocol_name: data.protocol_name ?? null,
            last_valid_load: null,
            last_valid_watts: null,
            abort_reason: data.abort_reason ?? null,
          },
        },
      });
      form.reset();
      onOpenChange(false);
      onCreated?.(result.id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{MODALITY_LABELS[modality]}</DialogTitle>
          <DialogDescription>
            Registre métricas finais do teste em esteira. FCmáx prevista é
            calculada por Tanaka 2001 (208 − 0.7 × idade) e pré-preenchida.
            Coach pode sobrescrever se houver dado clínico específico.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Base */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="assessment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age_years"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={500}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* FC */}
            <section className="space-y-3 rounded-md border p-4">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Frequência cardíaca</h3>
                {percentFcMax !== null && (
                  <span
                    className="text-xs text-muted-foreground"
                    role="status"
                    aria-live="polite"
                    aria-label={`Atingiu ${percentFcMax.toFixed(0)} por cento da FC máxima prevista`}
                  >
                    %FCmáx: <span className="font-mono font-semibold">{percentFcMax.toFixed(0)}%</span>
                  </span>
                )}
              </header>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fc_max_predicted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FCmáx prevista (Tanaka)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={30}
                          max={250}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fc_peak"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FC pico no teste</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={30}
                          max={250}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recovery_drop_1min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Δ FC em 1 min (HRR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={-30}
                          max={150}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* VO₂ + esteira */}
            <section className="space-y-3 rounded-md border p-4">
              <h3 className="text-sm font-semibold">VO₂ e configuração final da esteira</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vo2_final"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VO₂ final (ml/kg/min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={120}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_time_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo total (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={300}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="final_speed_kmh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Velocidade final (km/h)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={30}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="final_incline_pct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inclinação final (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={30}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="protocol_name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Protocolo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Ex: Bruce, Balke, Ellestad…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <FormField
              control={form.control}
              name="abort_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de parada</FormLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(v) =>
                      field.onChange(
                        v === CLEAR_SELECT_VALUE ? null : (v as FormData["abort_reason"]),
                      )
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={CLEAR_SELECT_VALUE}>Sem motivo registrado</SelectItem>
                      {ABORT_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações do coach</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Sintomas, contexto, dados do equipamento…"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar avaliação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
