import { useSearchParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicPageShell } from "@/components/PublicPageShell";

/**
 * Tela pública de erro da conexão Oura (aluna, sem conta).
 *
 * "Concluir sem o Oura" leva ao FIM do onboarding (tela de cadastro
 * concluído) — antes navegava para /alunos/:id, rota da treinadora, e a aluna
 * caía na tela de login.
 */
const OURA_SKIPPED_SUCCESS_PATH = `${ROUTES.onboardingSuccess}?oura=pulado`;

const ERROR_MESSAGES: Record<string, { title: string; description: string; suggestion: string }> = {
  access_denied: {
    title: "Acesso ao Oura não autorizado",
    description: "O acesso aos dados do Oura Ring não foi autorizado.",
    suggestion: "Sem essa autorização os dados não sincronizam. Para tentar de novo, aprove o acesso na tela do Oura.",
  },
  token_exchange: {
    title: "Autorização não concluída",
    description: "A autorização com o Oura Ring não foi concluída.",
    suggestion: "Isso acontece quando a autorização é cancelada ou a conexão cai no meio.",
  },
  database: {
    title: "Conexão não salva",
    description: "O Oura autorizou o acesso, mas a conexão não foi salva no sistema.",
    suggestion: "É uma falha temporária. Tente de novo com o mesmo convite, se ele ainda estiver válido.",
  },
  sync: {
    title: "Primeira sincronização com falha",
    description: "O Oura Ring foi conectado, mas os primeiros dados não chegaram.",
    suggestion: "A sincronização automática tenta de novo nas próximas horas. Nada precisa ser feito agora.",
  },
  default: {
    title: "Erro na conexão com o Oura",
    description: "Ocorreu um erro inesperado ao conectar o Oura Ring.",
    suggestion: "Tente de novo em alguns instantes. Se o erro continuar, avise a equipe da Fabrik.",
  },
};

export default function OuraErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get("invite_token");
  const reason = searchParams.get("reason");

  const error = ERROR_MESSAGES[reason || "default"] || ERROR_MESSAGES.default;
  const nextStep = inviteToken
    ? "Use o botão abaixo para reabrir o convite."
    : "Por segurança, tentar de novo exige um novo link da equipe da Fabrik.";

  return (
    <PublicPageShell centered>
      <Card>
        <CardHeader className="text-center space-y-sm">
          <div className="mx-auto rounded-xl bg-warning/10 p-md" aria-hidden="true">
            <AlertCircle className="h-6 w-6 text-warning" />
          </div>
          <CardTitle className="text-h2">{error.title}</CardTitle>
          <div className="space-y-2 text-body-sm text-muted-foreground">
            <p>{error.description}</p>
            <p className="text-foreground">
              {error.suggestion} {nextStep}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-sm">
          {inviteToken && (
            <Button onClick={() => navigate(`/oura-connect/${inviteToken}`)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Tentar de novo
            </Button>
          )}
          <Button
            onClick={() => navigate(OURA_SKIPPED_SUCCESS_PATH)}
            variant={inviteToken ? "ghost" : "default"}
            className="w-full"
          >
            Concluir sem o Oura
          </Button>
          <p className="text-caption text-center text-muted-foreground pt-sm">
            O Oura pode ser conectado depois, com um novo link enviado pela equipe.
          </p>
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}
