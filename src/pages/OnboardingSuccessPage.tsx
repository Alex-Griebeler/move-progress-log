import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOuraMetrics } from "@/hooks/useOuraMetrics";
import { useOuraConnection } from "@/hooks/useOuraConnection";
import { PublicPageShell } from "@/components/PublicPageShell";

/**
 * Fim do onboarding público da aluna.
 *
 * `?oura=pulado` chega de "Concluir sem o Oura" (OuraErrorPage): cadastro
 * concluído, sem verificar sincronização. Sem botão "Fechar janela": uma aba
 * aberta por link não pode ser fechada por script — a tela só orienta.
 */
export default function OnboardingSuccessPage() {
  const [searchParams] = useSearchParams();
  const ouraSkipped = searchParams.get("oura") === "pulado";
  const studentId = ouraSkipped ? null : searchParams.get("student_id");

  const { data: ouraMetrics, isLoading: metricsLoading } = useOuraMetrics(studentId || "", 7);
  const { data: ouraConnection, isLoading: connectionLoading } = useOuraConnection(studentId || "", {
    pollUntilConnected: true,
    refetchIntervalMs: 3000,
  });

  const renderOuraStatus = () => {
    if (!studentId) return null;

    if (connectionLoading || metricsLoading) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3" role="status">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="text-body-sm text-muted-foreground">Verificando a sincronização do Oura Ring</span>
        </div>
      );
    }

    if (ouraConnection && ouraMetrics && ouraMetrics.length > 0) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3" role="status">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-body-sm font-medium">Oura Ring conectado</p>
            <p className="text-caption text-muted-foreground">
              {ouraMetrics.length} {ouraMetrics.length === 1 ? "dia sincronizado" : "dias sincronizados"}
            </p>
          </div>
        </div>
      );
    }

    if (ouraConnection && (!ouraMetrics || ouraMetrics.length === 0)) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3" role="status">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-body-sm font-medium">Sincronização em andamento</p>
            <p className="text-caption text-muted-foreground">Os dados do Oura Ring estão chegando.</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const summary = ouraSkipped
    ? "A equipe da Fabrik já tem seus dados. O Oura pode ser conectado depois, com um novo link."
    : ouraConnection
      ? "Os dados do Oura Ring estão sincronizando e a equipe da Fabrik já pode acompanhar."
      : "A equipe da Fabrik já tem seus dados para planejar os treinos.";

  return (
    <PublicPageShell centered>
      <Card>
        <CardHeader className="text-center space-y-sm">
          <div className="mx-auto rounded-xl bg-success/10 p-md" aria-hidden="true">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <CardTitle className="text-h2">Cadastro concluído</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <p className="text-center text-body-sm text-muted-foreground">{summary}</p>

          {renderOuraStatus()}

          <div className="border-t pt-md text-center">
            <p className="text-body-sm text-muted-foreground">
              Próximo passo: a equipe entra em contato para agendar a primeira sessão.
            </p>
            <p className="text-caption text-muted-foreground mt-2">Você pode fechar esta aba.</p>
          </div>
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}
