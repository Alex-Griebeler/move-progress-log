import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WhoopErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get("invite_token");
  const reason = searchParams.get("reason");

  const errorMessages: Record<string, { title: string; description: string; suggestion: string }> = {
    access_denied: {
      title: "Autorização Negada",
      description: "Você não autorizou o acesso aos seus dados do Whoop.",
      suggestion: "Sem essa autorização não conseguimos sincronizar seus dados. Se mudou de ideia, tente novamente e aprove o acesso na tela do Whoop."
    },
    token_exchange: {
      title: "Autorização Não Concluída",
      description: "Não conseguimos completar a autorização com o Whoop.",
      suggestion: "Isso acontece quando você cancela a autorização ou há um problema temporário de conexão."
    },
    database: {
      title: "Erro ao Salvar Conexão",
      description: "A autorização com o Whoop foi bem-sucedida, mas não conseguimos salvar no sistema.",
      suggestion: "Este é um erro temporário. Tente novamente com o mesmo convite."
    },
    default: {
      title: "Erro na Conexão",
      description: "Ocorreu um erro inesperado ao conectar com o Whoop.",
      suggestion: "Tente novamente em alguns instantes. Se o erro persistir, entre em contato com seu treinador para assistência."
    }
  };

  const error = errorMessages[reason || "default"] || errorMessages.default;
  const retrySuggestion = inviteToken
    ? `${error.suggestion} Use o botão abaixo para tentar novamente com o mesmo convite.`
    : `${error.suggestion} Solicite ao seu treinador um novo link de convite.`;

  const handleRetry = () => {
    if (!inviteToken) {
      toast.info("Solicite um novo link ao seu treinador", {
        description: "Por segurança, não é possível tentar novamente sem um convite válido.",
      });
      return;
    }
    navigate(`/whoop-connect/${inviteToken}`);
  };

  const handleClose = () => {
    window.close();

    setTimeout(() => {
      if (!window.closed) {
        toast.info("Você pode fechar esta aba agora", {
          description: "Seu treinador pode gerar um novo link de convite quando você quiser conectar o Whoop.",
          duration: 10000,
        });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertCircle className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">
            {error.title}
          </CardTitle>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{error.description}</p>
            <p className="text-sm font-medium text-foreground mt-2">
              💡 {retrySuggestion}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button
              onClick={handleRetry}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {inviteToken ? "Tentar Novamente" : "Solicitar Novo Link"}
            </Button>

            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full"
            >
              Fechar Janela
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground space-y-1 border-t pt-3">
            <p>
              ℹ️ Seus dados no app não foram afetados por este erro
            </p>
            <p>
              Seu treinador também pode gerar um novo link de convite com integração Whoop
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
