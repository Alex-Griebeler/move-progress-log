/**
 * E3.6 — Página pública do Questionário Precision 12.
 *
 * Rota: /precision-questionnaire/:token
 *
 * Estados:
 *   1. loading     — chamando validate-precision12-questionnaire-link
 *   2. invalid     — token inválido/expirado/usado/revogado
 *   3. form        — preenchendo (delega pro QuestionnaireFlow). O envio
 *                    acontece DENTRO deste estado: erro de rede / 500 /
 *                    submit duplicado vira `submitError` e o formulário
 *                    segue montado com as respostas (UX-10).
 *   4. completed   — submit OK e PAR-Q negativo
 *   5. blocked     — submit OK mas PAR-Q positivo (precisa revisão)
 *
 * Segurança:
 *   - Token NUNCA salvo em localStorage/sessionStorage. Vive só na URL e
 *     em memória do componente.
 *   - Token NUNCA logado.
 *   - Payload é enviado ao edge `submit-precision12-questionnaire`;
 *     normalização e regras finais (PAR-Q soft block, status do
 *     assessment) ficam server-side.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

import { QuestionnaireFlow } from "@/components/assessments/questionnaire/QuestionnaireFlow";

// ────────────────────────────────────────────────────────────────────────────

interface ValidateResponse {
  ok: true;
  require_birthdate: boolean;
  expires_at: string;
  questionnaire_version: string;
}

interface SubmitResponse {
  ok: true;
  assessment_id: string;
  status: "completed" | "blocked";
  parq_blocked: boolean;
  submitted_at: string;
}

type PageState =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "form"; requireBirthdate: boolean; submitError: string | null }
  | { kind: "done"; status: "completed" | "blocked" };

const SUBMIT_ERROR_LINK =
  "Não foi possível registrar suas respostas. Verifique se o link ainda é válido ou peça um novo ao seu treinador.";
const SUBMIT_ERROR_GENERIC =
  "Não foi possível enviar agora. Verifique a conexão e tente novamente.";

// ────────────────────────────────────────────────────────────────────────────

export default function PrecisionQuestionnairePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ kind: "loading" });

  // Valida token ao montar
  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", message: "Link inválido ou expirado" });
      return;
    }

    let cancelled = false;
    const validate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke<ValidateResponse>(
          "validate-precision12-questionnaire-link",
          { body: { token } },
        );

        if (cancelled) return;

        if (error || !data || !data.ok) {
          setState({
            kind: "invalid",
            message: "Link inválido ou expirado",
          });
          return;
        }

        setState({
          kind: "form",
          requireBirthdate: data.require_birthdate,
          submitError: null,
        });
      } catch {
        if (cancelled) return;
        setState({ kind: "invalid", message: "Link inválido ou expirado" });
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setSubmitError = (message: string) =>
    setState((prev) =>
      prev.kind === "form" ? { ...prev, submitError: message } : prev,
    );

  const handleSubmit = async (payload: Record<string, unknown>) => {
    if (!token) return;

    try {
      const { data, error } = await supabase.functions.invoke<SubmitResponse>(
        "submit-precision12-questionnaire",
        { body: { token, payload } },
      );

      if (error || !data) {
        // Não vazar detalhes do erro. 409 (já enviado) / 400 (link
        // inválido) orientam a pedir novo link; o resto é "tente de novo".
        const msg = error?.message ?? "";
        if (/already_submitted|409/i.test(msg) || /400|invalid/i.test(msg)) {
          setSubmitError(SUBMIT_ERROR_LINK);
          return;
        }
        setSubmitError(SUBMIT_ERROR_GENERIC);
        return;
      }

      setState({ kind: "done", status: data.status });
    } catch {
      setSubmitError(SUBMIT_ERROR_GENERIC);
    }
  };

  // ─── Renderização por estado ────────────────────────────────────────────

  if (state.kind === "loading") {
    return (
      <CenteredCard>
        <div
          className="flex flex-col items-center gap-3 py-8"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando seu link…</p>
        </div>
      </CenteredCard>
    );
  }

  if (state.kind === "invalid") {
    return (
      <CenteredCard
        icon={<AlertTriangle className="h-10 w-10 text-destructive" />}
        title="Link inválido"
        description={state.message}
      >
        <p className="text-sm text-muted-foreground">
          Peça um novo link ao seu treinador na Fabrik.
        </p>
      </CenteredCard>
    );
  }

  if (state.kind === "done") {
    if (state.status === "blocked") {
      return (
        <CenteredCard
          icon={<AlertTriangle className="h-10 w-10 text-warning" aria-hidden />}
          title="Respostas registradas"
          description="Algumas respostas pedem uma revisão do treinador antes de seguir."
        >
          <p className="text-sm text-muted-foreground">
            A equipe Fabrik vai avaliar suas respostas e orientar o próximo passo.
            Este questionário não substitui avaliação médica.
          </p>
        </CenteredCard>
      );
    }
    return (
      <CenteredCard
        icon={<CheckCircle2 className="h-10 w-10 text-success" aria-hidden />}
        title="Respostas registradas"
        description="Seu treinador na Fabrik vai conferir e combinar os próximos passos."
      />
    );
  }

  // state.kind === "form"
  return (
    <QuestionnaireFlow
      requireBirthdate={state.requireBirthdate}
      onSubmit={handleSubmit}
      submitError={state.submitError}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers visuais
// ────────────────────────────────────────────────────────────────────────────

interface CenteredCardProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

function CenteredCard({ icon, title, description, children }: CenteredCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            {icon ?? <ClipboardList className="h-10 w-10 text-primary" />}
          </div>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {children && (
          <CardContent className="flex flex-col items-center gap-3 text-center">
            {children}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
