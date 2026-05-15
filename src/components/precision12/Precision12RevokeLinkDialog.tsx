/**
 * E4.5 — Dialog de revogação manual de link de Questionário Precision 12.
 *
 * Segunda mutação controlada do Coach Console (a primeira foi reissue
 * em E4.4). Princípios e shape idênticos ao `Precision12ReissueLinkDialog`:
 *
 *   1. Confirmação OBRIGATÓRIA antes da chamada à edge — o dialog abre
 *      direto no estado "confirming". Cancel/Close NÃO chama a edge.
 *   2. Única superfície de write: `supabase.functions.invoke(
 *      "revoke-precision12-questionnaire-link", ...)`. Nenhum
 *      `.insert/.update/.delete/.upsert` no client. Nenhuma RPC.
 *   3. Não há token nem URL na resposta — só `{ ok, revoked_at }`.
 *      Mesmo assim, mantemos o resultado em React state local;
 *      nunca em localStorage/sessionStorage; nunca em console.log.
 *   4. Após sucesso, invalida `["precision12", "coach-console"]` +
 *      `["assessments", "by-student", studentId]` + `["student",
 *      studentId]` — a fila refetch e o botão some quando o link já
 *      não está ativo.
 *
 * Erro server-side específico ("Nenhum link ativo para revogar.") recebe
 * tradução amigável.
 */

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Ban, CheckCircle2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

// ────────────────────────────────────────────────────────────────────────────
// Edge function contract (E4.5)
// ────────────────────────────────────────────────────────────────────────────

interface RevokeLinkResponse {
  ok: true;
  revoked_at: string;
}

interface RevokeRequestBody {
  student_id: string;
  assessment_id: string;
}

interface Precision12RevokeLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  assessmentId: string;
}

type DialogState =
  | { kind: "confirming" }
  | { kind: "revoked"; revokedAt: string }
  | { kind: "error"; message: string };

const REVOKE_CONFIRM_MESSAGE =
  "Revogar este link impedirá que o aluno responda por ele. Deseja continuar?";

const SERVER_ERROR_FRIENDLY: Record<string, string> = {
  "Nenhum link ativo para revogar.":
    "Nenhum link ativo encontrado. Atualize a fila para ver o estado atual.",
};

function friendlyErrorMessage(raw: string | undefined): string {
  if (!raw) {
    return "Falha ao revogar link. Tente novamente em alguns instantes.";
  }
  return SERVER_ERROR_FRIENDLY[raw] ?? raw;
}

// ────────────────────────────────────────────────────────────────────────────

export function Precision12RevokeLinkDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  assessmentId,
}: Precision12RevokeLinkDialogProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DialogState>({ kind: "confirming" });

  // Reset visual ao fechar — próximo open volta pro confirming.
  useEffect(() => {
    if (!open) {
      setState({ kind: "confirming" });
    }
  }, [open]);

  const mutation = useMutation<RevokeLinkResponse, Error, RevokeRequestBody>({
    mutationFn: async (body) => {
      const { data, error } = await supabase.functions.invoke<RevokeLinkResponse>(
        "revoke-precision12-questionnaire-link",
        { body },
      );
      if (error) throw new Error(error.message ?? "Erro ao revogar link");
      if (!data) throw new Error("Resposta vazia da edge function");
      return data;
    },
    onSuccess: (data) => {
      setState({ kind: "revoked", revokedAt: data.revoked_at });
      queryClient.invalidateQueries({
        queryKey: ["precision12", "coach-console"],
      });
      queryClient.invalidateQueries({
        queryKey: ["assessments", "by-student", studentId],
      });
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
    },
    onError: (err) => {
      setState({
        kind: "error",
        message: friendlyErrorMessage(err.message),
      });
    },
  });

  const handleConfirm = () => {
    mutation.mutate({
      student_id: studentId,
      assessment_id: assessmentId,
    });
  };

  const handleClose = () => {
    if (mutation.isPending) return;
    onOpenChange(false);
  };

  const revokedLabel = (() => {
    if (state.kind !== "revoked") return null;
    try {
      return format(parseISO(state.revokedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
        locale: ptBR,
      });
    } catch {
      return state.revokedAt;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revogar link do questionário</DialogTitle>
          <DialogDescription>
            Aluno: <span className="font-medium">{studentName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {state.kind === "confirming" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{REVOKE_CONFIRM_MESSAGE}</AlertDescription>
            </Alert>
          )}

          {mutation.isPending && (
            <div
              className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Revogando link…
            </div>
          )}

          {state.kind === "error" && !mutation.isPending && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          {state.kind === "revoked" && !mutation.isPending && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription>
                <strong>Link revogado.</strong> O aluno não consegue mais
                responder pelo link anterior.
                {revokedLabel && (
                  <>
                    {" "}
                    Revogado em{" "}
                    <span className="font-semibold">{revokedLabel}</span>.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {state.kind === "revoked" ? (
            <Button type="button" onClick={handleClose}>
              Fechar
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
                disabled={mutation.isPending}
                aria-label="Confirmar revogação do link"
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="mr-2 h-4 w-4" />
                )}
                {state.kind === "error" ? "Tentar novamente" : "Revogar link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
