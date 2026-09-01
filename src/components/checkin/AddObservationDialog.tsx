import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { buildErrorDescription } from "@/utils/errorParsing";
import { logger } from "@/utils/logger";
import { sanitizeInput, studentObservationSchema } from "@/utils/validation";

/**
 * Observação clínica AVULSA (check-in v3, spec v7.2-B1): sintoma deixou de
 * ser pergunta do check-in — "caso o aluno tenha algum sintoma, o treinador
 * registra uma observação" (decisão 31/08). Disponível o dia inteiro (U5).
 * Contrato ratificado: session_id = null, is_resolved = false (é pendência
 * clínica de verdade, ao contrário do registro de percepção), created_by =
 * coach autenticado OBRIGATÓRIO; invalida ["student-observations"].
 */
const CATEGORIES = ["dor", "mobilidade", "força", "técnica", "geral"] as const;
const SEVERITIES = ["baixa", "média", "alta"] as const;

interface AddObservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

const AddObservationDialog = ({ open, onOpenChange, studentId, studentName }: AddObservationDialogProps) => {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("geral");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("baixa");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      // Sanitiza ANTES de validar (review B2 p2 rodada 2): texto que vira
      // vazio após a sanitização é rejeitado pelo schema — nunca grava "".
      const sanitized = sanitizeInput(text);
      const parsed = studentObservationSchema.safeParse({ observation: sanitized });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Observação inválida.");
      }
      const { data: userData } = await supabase.auth.getUser();
      const actorId = userData?.user?.id ?? null;
      if (!actorId) {
        throw new Error("Sem usuário autenticado — observação não registrada.");
      }
      const { error } = await supabase.from("student_observations").insert({
        student_id: studentId,
        observation_text: parsed.data.observation,
        categories: [category],
        severity,
        is_resolved: false,
        session_id: null,
        created_by: actorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-observations", studentId] });
      queryClient.invalidateQueries({ queryKey: ["perception-history", studentId] });
      toast({ title: `Observação de ${studentName} registrada` });
      setText("");
      setCategory("geral");
      setSeverity("baixa");
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error("[observacao] falha ao registrar", error);
      toast({
        title: `Observação de ${studentName} não foi salva`,
        description: buildErrorDescription(error, "Tente novamente."),
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar observação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="obs-text">Observação</Label>
            <Textarea
              id="obs-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex.: tontura ao levantar no aquecimento"
              rows={3}
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label id="obs-category-label">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger aria-labelledby="obs-category-label"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label id="obs-severity-label">Severidade</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                <SelectTrigger aria-labelledby="obs-severity-label"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((sev) => (
                    <SelectItem key={sev} value={sev}>{sev.charAt(0).toUpperCase() + sev.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!text.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando…" : "Salvar observação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddObservationDialog;
