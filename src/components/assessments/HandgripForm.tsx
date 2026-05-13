/**
 * Form de registro de teste de preensão palmar (Mathiowetz 1985).
 *
 * Protocolo:
 *   - 3 tentativas com a mão direita
 *   - 3 tentativas com a mão esquerda
 *   - Banco calcula `best_kg` (generated column) = max das 6 tentativas
 *   - `right_kg` / `left_kg` = max da própria mão (coach digita ou banco calcula)
 *
 * Classificação clínica é feita em ciclo posterior (E5 Evidence) via
 * tabela `handgrip_reference_ranges` (Mathiowetz). Aqui só coleta.
 */

import { useState } from "react";
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
  handgripSchema,
  localTodayIso,
} from "@/utils/assessmentValidation";

// ────────────────────────────────────────────────────────────────────────────
// Schema do form (base + handgrip)
// ────────────────────────────────────────────────────────────────────────────

const formSchema = assessmentBaseSchema.extend({
  dominant_hand: handgripSchema.shape.dominant_hand,
  right_attempt_1: z.coerce.number().min(0).max(150),
  right_attempt_2: z.coerce.number().min(0).max(150),
  right_attempt_3: z.coerce.number().min(0).max(150),
  left_attempt_1: z.coerce.number().min(0).max(150),
  left_attempt_2: z.coerce.number().min(0).max(150),
  left_attempt_3: z.coerce.number().min(0).max(150),
  handgrip_notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface HandgripFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
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

export const HandgripForm = ({
  open,
  onOpenChange,
  studentId,
  defaults,
  onCreated,
}: HandgripFormProps) => {
  const createAssessment = useCreateAssessment();
  const [isSaving, setIsSaving] = useState(false);

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
      dominant_hand: null,
      right_attempt_1: undefined as unknown as number,
      right_attempt_2: undefined as unknown as number,
      right_attempt_3: undefined as unknown as number,
      left_attempt_1: undefined as unknown as number,
      left_attempt_2: undefined as unknown as number,
      left_attempt_3: undefined as unknown as number,
      handgrip_notes: "",
    },
  });

  // Preview do best_kg de cada mão pra coach validar
  const r1 = form.watch("right_attempt_1");
  const r2 = form.watch("right_attempt_2");
  const r3 = form.watch("right_attempt_3");
  const l1 = form.watch("left_attempt_1");
  const l2 = form.watch("left_attempt_2");
  const l3 = form.watch("left_attempt_3");

  const bestRight = [r1, r2, r3]
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .reduce((acc, v) => Math.max(acc, v), 0);
  const bestLeft = [l1, l2, l3]
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .reduce((acc, v) => Math.max(acc, v), 0);
  const bestOverall = Math.max(bestRight, bestLeft);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const result = await createAssessment.mutateAsync({
        parent: {
          student_id: data.student_id,
          assessment_type: "handgrip",
          assessment_date: data.assessment_date,
          status: "completed",
          age_years: data.age_years ?? null,
          weight_kg: data.weight_kg ?? null,
          height_cm: data.height_cm ?? null,
          sex: data.sex ?? null,
          notes: data.notes ?? null,
        },
        child: {
          kind: "handgrip",
          data: {
            dominant_hand: data.dominant_hand ?? null,
            right_kg_attempts: [data.right_attempt_1, data.right_attempt_2, data.right_attempt_3],
            left_kg_attempts: [data.left_attempt_1, data.left_attempt_2, data.left_attempt_3],
            right_kg: bestRight,
            left_kg: bestLeft,
            classification: null,
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
          <DialogTitle>Preensão palmar (Mathiowetz 1985)</DialogTitle>
          <DialogDescription>
            3 tentativas com cada mão. O sistema usa o maior valor de cada
            lado como força máxima da mão; o melhor entre as duas mãos
            é usado pra classificação Mathiowetz.
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
                    <FormLabel>Data do teste</FormLabel>
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
                name="dominant_hand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mão dominante</FormLabel>
                    <Select
                      value={field.value ?? undefined}
                      onValueChange={(v) => field.onChange(v as "left" | "right")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="right">Direita</SelectItem>
                        <SelectItem value="left">Esquerda</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* Mão direita */}
            <section className="space-y-3 rounded-md border p-4">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Mão direita</h3>
                <span
                  className="text-xs text-muted-foreground"
                  role="status"
                  aria-live="polite"
                  aria-label={`Melhor da direita: ${bestRight.toFixed(1)} kg`}
                >
                  Melhor: <span className="font-mono font-semibold">{bestRight.toFixed(1)} kg</span>
                </span>
              </header>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((n) => (
                  <FormField
                    key={`right_${n}`}
                    control={form.control}
                    name={`right_attempt_${n}` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tentativa {n} (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min={0}
                            max={150}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(parseNumber(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>

            {/* Mão esquerda */}
            <section className="space-y-3 rounded-md border p-4">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Mão esquerda</h3>
                <span
                  className="text-xs text-muted-foreground"
                  role="status"
                  aria-live="polite"
                  aria-label={`Melhor da esquerda: ${bestLeft.toFixed(1)} kg`}
                >
                  Melhor: <span className="font-mono font-semibold">{bestLeft.toFixed(1)} kg</span>
                </span>
              </header>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((n) => (
                  <FormField
                    key={`left_${n}`}
                    control={form.control}
                    name={`left_attempt_${n}` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tentativa {n} (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min={0}
                            max={150}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(parseNumber(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>

            <div
              className="rounded-md bg-muted/50 p-3 text-sm"
              role="status"
              aria-live="polite"
            >
              <strong>Melhor geral:</strong>{" "}
              <span className="font-mono">{bestOverall.toFixed(1)} kg</span>{" "}
              <span className="text-muted-foreground text-xs">
                (= best_kg armazenado no banco; usado pra classificação Mathiowetz)
              </span>
            </div>

            <FormField
              control={form.control}
              name="handgrip_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações do coach</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Posicionamento, sintomas, contexto…"
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
