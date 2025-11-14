import { useSearchParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function OuraErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get("student_id");
  const reason = searchParams.get("reason");
  const [isRetrying, setIsRetrying] = useState(false);

  const errorMessages: Record<string, { title: string; description: string; suggestion: string }> = {
    token_exchange: {
      title: "Autorização Não Concluída",
      description: "Não conseguimos completar a autorização com o Oura Ring.",
      suggestion: "Isso acontece quando você cancela a autorização ou há um problema de conexão. Clique em 'Tentar Novamente' para uma nova tentativa."
    },
    database: {
      title: "Erro ao Salvar Conexão",
      description: "A autorização com o Oura Ring foi bem-sucedida, mas não conseguimos salvar no sistema.",
      suggestion: "Este é um erro temporário. Tente novamente em alguns instantes. Se o problema persistir, entre em contato com seu treinador."
    },
    sync: {
      title: "Erro na Sincronização Inicial",
      description: "Conseguimos conectar o Oura Ring, mas houve um problema ao buscar seus dados iniciais.",
      suggestion: "Não se preocupe! Você pode sincronizar manualmente através do seu perfil depois."
    },
    default: {
      title: "Erro na Conexão",
      description: "Ocorreu um erro inesperado ao conectar com o Oura Ring.",
      suggestion: "Tente novamente em alguns instantes. Se o erro persistir, entre em contato com seu treinador para assistência."
    }
  };

  const error = errorMessages[reason || "default"] || errorMessages.default;

  const handleRetry = async () => {
    if (!studentId) {
      toast.error("ID do estudante não encontrado");
      return;
    }

    setIsRetrying(true);
    
    try {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", studentId)
        .single();

      if (studentError || !student) {
        toast.error("Erro ao buscar informações do estudante");
        setIsRetrying(false);
        return;
      }

      const ouraClientId = import.meta.env.VITE_OURA_CLIENT_ID;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const redirectUri = `${supabaseUrl}/functions/v1/oura-callback`;
      const state = `${studentId}:retry`;

      if (!ouraClientId) {
        toast.error("Configuração do Oura Ring não encontrada");
        setIsRetrying(false);
        return;
      }

      const scope = 'email personal daily heartrate workout session spo2 tag sleep stress ring_configuration';
      const ouraAuthUrl = `https://cloud.ouraring.com/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${ouraClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${encodeURIComponent(state)}`;

      toast.info("Redirecionando para Oura Ring...", {
        description: "Tentando conectar novamente",
        duration: 2000,
      });

      setTimeout(() => {
        window.location.href = ouraAuthUrl;
      }, 2000);
    } catch (error) {
      console.error("Error generating OAuth URL:", error);
      toast.error("Erro ao tentar reconectar");
      setIsRetrying(false);
    }
  };

  const handleContinueWithoutOura = () => {
    if (studentId) {
      navigate(ROUTES.studentDetail(studentId));
    } else {
      navigate(ROUTES.dashboard);
    }
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
          <CardDescription className="space-y-2">
            <p>{error.description}</p>
            <p className="text-sm font-medium text-foreground mt-2">
              💡 {error.suggestion}
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </>
              )}
            </Button>

            <Button
              onClick={handleContinueWithoutOura}
              variant="outline"
              className="w-full"
            >
              Continuar sem Oura Ring
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground space-y-1 border-t pt-3">
            <p>
              ℹ️ Você pode conectar o Oura Ring mais tarde através do seu perfil
            </p>
            <p>
              Seu treinador também pode gerar um novo link de convite com integração Oura
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
