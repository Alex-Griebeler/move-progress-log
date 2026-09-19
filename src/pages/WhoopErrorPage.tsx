import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicPageShell } from "@/components/PublicPageShell";

const ERROR_MESSAGES: Record<string, { title: string; description: string; suggestion: string }> = {
  access_denied: {
    title: "Acesso ao Whoop não autorizado",
    description: "O acesso aos dados do Whoop não foi autorizado.",
    suggestion: "Sem essa autorização os dados não sincronizam. Para tentar de novo, aprove o acesso na tela do Whoop.",
  },
  token_exchange: {
    title: "Autorização não concluída",
    description: "A autorização com o Whoop não foi concluída.",
    suggestion: "Isso acontece quando a autorização é cancelada ou a conexão cai no meio.",
  },
  database: {
    title: "Conexão não salva",
    description: "O Whoop autorizou o acesso, mas a conexão não foi salva no sistema.",
    suggestion: "É uma falha temporária. Tente de novo com o mesmo convite.",
  },
  default: {
    title: "Erro na conexão com o Whoop",
    description: "Ocorreu um erro inesperado ao conectar o Whoop.",
    suggestion: "Tente de novo em alguns instantes. Se o erro continuar, avise a equipe da Fabrik.",
  },
};

export default function WhoopErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get("invite_token");
  const reason = searchParams.get("reason");

  const error = ERROR_MESSAGES[reason || "default"] || ERROR_MESSAGES.default;
  const nextStep = inviteToken
    ? "Use o botão abaixo para tentar de novo com o mesmo convite."
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
            <Button onClick={() => navigate(`/whoop-connect/${inviteToken}`)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Tentar de novo
            </Button>
          )}
          {/* Aba aberta por link não pode ser fechada por script: só a instrução. */}
          <p className="text-caption text-center text-muted-foreground pt-sm">
            Nenhum dado seu foi alterado. Você pode fechar esta aba.
          </p>
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}
