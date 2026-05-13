/**
 * Form de registro dos testes de VO₂ em bike Technogym:
 *   - vo2_bike_max     (teste máximo)
 *   - vo2_bike_submax  (teste submáximo)
 *
 * Os 2 compartilham 100% do schema; difere apenas o `assessment_type`
 * enviado e algumas labels.
 *
 * Estrutura:
 *   - parent (assessments)
 *   - filha (vo2_assessment_details) — 1:1 com fc_max_predicted, fc_peak,
 *     vo2_final, last_valid_load (carga última válida), last_valid_watts,
 *     abort_reason, etc.
 *   - estágios (vo2_bike_stages) — 1:N, array dinâmico
 *
 * VO₂ final é calculado via fórmula ACSM:
 *   VO₂ = (10.8 × watts ÷ peso_kg) + 7
 * usando `last_valid_watts` + peso do aluno. Preview mostra cálculo
 * em tempo real; coach pode sobrescrever se houver razão clínica.
 */

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  vo2BikeMaxSchema,
  vo2BikeStageSchema,
} from "@/utils/assessmentValidation";
import { calcFcMaxPredicted, calcPercentFcMax, calcVo2Bike } from "@/utils/vo2";
import type { AssessmentType } from "@/types/assessment";

// ────────────────────────────────────────────────────────────────────────────

type BikeModality = "vo2_bike_max" | "vo2_bike_submax";

const MODALITY_LABELS: Record<BikeModality, string> = {
  vo2_bike_max: "Bike — VO₂ máximo",
  vo2_bike_submax: "Bike — VO₂ submáximo",
};

const ABORT_REASONS = [
  { value: "pse_10", label: "PSE 10 (exaustão)" },
  { value: "pse_9_submax", label: "PSE 9 (submáx, parada planejada)" },
  { value: "cadence_failure", label: "Queda de cadência (incapaz de manter RPM)" },
  { value: "fc_above_90pct", label: "FC ≥ 90% FCmáx prevista" },
  { value: "safety_bp", label: "Segurança — PA" },
  { value: "safety_ischemia", label: "Segurança — sinais isquêmicos" },
  { value: "student_request", label: "Aluno pediu parar" },
  { value: "equipment", label: "Falha de equipamento" },
] as const;

const formSchema = assessmentBaseSchema.extend({
  fc_max_predicted: vo2BikeMaxSchema.shape.fc_max_predicted,
  fc_peak: vo2BikeMaxSchema.shape.fc_peak,
  vo2_final: vo2BikeMaxSchema.shape.vo2_final,
  recovery_drop_1min: vo2BikeMaxSchema.shape.recovery_drop_1min,
  last_valid_load: vo2BikeMaxSchema.shape.last_valid_load,
  last_valid_watts: vo2BikeMaxSchema.shape.last_valid_watts,
  abort_reason: vo2BikeMaxSchema.shape.abort_reason,
  stages: z.array(vo2BikeStageSchema).min(1, "Registre pelo menos 1 estágio"),
});

type FormData = z.infer<typeof formSchema>;
type StageInput = z.infer<typeof vo2BikeStageSchema>;

interface Vo2BikeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  modality: BikeModality;
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

const blankStage = (order: number): StageInput => ({
  stage_order: order,
  time_label: null,
  phase: "test",
  load_value: null,
  rpm_target: null,
  watts_observed: null,
  hr_final: null,
  pse: null,
  vo2_estimated: null,
  notes: null,
});

// ────────────────────────────────────────────────────────────────────────────

export const Vo2BikeForm = ({
  open,
  onOpenChange,
  studentId,
  modality,
  defaults,
  onCreated,
}: Vo2BikeFormProps) => {
  const createAssessment = useCreateAssessment();
  const [isSaving, setIsSaving] = useState(false);

  const fcMaxPredictedAuto = defaults?.age_years
    ? calcFcMaxPredicted(defaults.age_years)
    : null;

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
      recovery_drop_1min: null,
      last_valid_load: null,
      last_valid_watts: null,
      abort_reason: null,
      stages: [
        blankStage(1),
        { ...blankStage(2), phase: "test" },
      ],
    },
  });

  const stagesArray = useFieldArray({ control: form.control, name: "stages" });

  // Preview reativo: VO₂ ACSM e %FCmáx
  const weightKg = form.watch("weight_kg");
  const lastWatts = form.watch("last_valid_watts");
  const fcPeak = form.watch("fc_peak");
  const fcMaxPred = form.watch("fc_max_predicted");

  const vo2EstimatedPreview =
    typeof lastWatts === "number" &&
    Number.isFinite(lastWatts) &&
    typeof weightKg === "number" &&
    Number.isFinite(weightKg) &&
    weightKg > 0
      ? calcVo2Bike(lastWatts, weightKg)
      : null;
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
            total_time_min: null,
            final_speed_kmh: null,
            final_incline_pct: null,
            protocol_name: null,
            last_valid_load: data.last_valid_load ?? null,
            last_valid_watts: data.last_valid_watts ?? null,
            abort_reason: data.abort_reason ?? null,
          },
          stages: data.stages.map((s) => ({
            stage_order: s.stage_order,
            time_label: s.time_label ?? null,
            phase: s.phase ?? null,
            load_value: s.load_value ?? null,
            rpm_target: s.rpm_target ?? null,
            watts_observed: s.watts_observed ?? null,
            hr_final: s.hr_final ?? null,
            pse: s.pse ?? null,
            vo2_estimated: s.vo2_estimated ?? null,
            notes: s.notes ?? null,
          })),
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{MODALITY_LABELS[modality]}</DialogTitle>
          <DialogDescription>
            Registre os estágios do protocolo + métricas finais. VO₂ é
            estimado por ACSM (10.8 × W/kg + 7) usando carga da última
            etapa válida. FCmáx prevista é Tanaka 2001.
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

            {/* Estágios — array dinâmico */}
            <section className="space-y-3 rounded-md border p-4">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Estágios do protocolo</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => stagesArray.append(blankStage(stagesArray.fields.length + 1))}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                </Button>
              </header>

              <div className="space-y-2">
                {stagesArray.fields.map((stageField, index) => (
                  <div
                    key={stageField.id}
                    className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-2 sm:grid-cols-9"
                  >
                    <FormField
                      control={form.control}
                      name={`stages.${index}.stage_order` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">#</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={20}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stages.${index}.time_label` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">Tempo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="3:00"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stages.${index}.phase` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">Fase</FormLabel>
                          <Select
                            value={field.value ?? undefined}
                            onValueChange={(v) => field.onChange(v as StageInput["phase"])}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="warmup">Aquec.</SelectItem>
                              <SelectItem value="test">Teste</SelectItem>
                              <SelectItem value="recovery">Recup.</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stages.${index}.load_value` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">Carga</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              min={0}
                              max={1000}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stages.${index}.rpm_target` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">RPM</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="70-80"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stages.${index}.watts_observed` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">Watts</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={1000}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stages.${index}.hr_final` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">FC</FormLabel>
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
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stages.${index}.pse` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">PSE</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={6}
                              max={10}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end">
                      {stagesArray.fields.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => stagesArray.remove(index)}
                          aria-label={`Remover estágio ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {form.formState.errors.stages?.message && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.stages.message}
                </p>
              )}
            </section>

            {/* FC + VO2 finais */}
            <section className="space-y-3 rounded-md border p-4">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Métricas finais</h3>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {percentFcMax !== null && (
                    <span
                      role="status"
                      aria-live="polite"
                      aria-label={`Atingiu ${percentFcMax.toFixed(0)} por cento da FC máxima prevista`}
                    >
                      %FCmáx: <span className="font-mono font-semibold">{percentFcMax.toFixed(0)}%</span>
                    </span>
                  )}
                  {vo2EstimatedPreview !== null && (
                    <span
                      role="status"
                      aria-live="polite"
                      aria-label={`VO2 estimado ACSM: ${vo2EstimatedPreview.toFixed(1)} ml por quilograma por minuto`}
                    >
                      VO₂ ACSM:{" "}
                      <span className="font-mono font-semibold">
                        {vo2EstimatedPreview.toFixed(1)} ml/kg/min
                      </span>
                    </span>
                  )}
                </div>
              </header>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fc_max_predicted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FCmáx prevista</FormLabel>
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
                      <FormLabel>FC pico</FormLabel>
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
                      <FormLabel>Δ FC em 1 min</FormLabel>
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
                <FormField
                  control={form.control}
                  name="last_valid_load"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Última carga válida</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min={0}
                          max={1000}
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
                  name="last_valid_watts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Últimos watts válidos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={1000}
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
                  name="vo2_final"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VO₂ final (sobrescreve preview)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={120}
                          {...field}
                          value={field.value ?? ""}
                          placeholder={vo2EstimatedPreview?.toFixed(1) ?? "—"}
                          onChange={(e) => field.onChange(parseNumber(e.target.value) ?? null)}
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
                    onValueChange={(v) => field.onChange(v as FormData["abort_reason"])}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
