import { useSearchParams, useNavigate } from "react-router-dom";
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

  const errorMessages: Record<string, { title: string; description: string }> = {
    token_exchange: {
      title: "Erro na Autorização",
      description: "Não foi possível completar a autorização com o Oura Ring. Isso pode acontecer se você cancelou a autorização ou se houve um problema de conexão."
    },
    database: {
      title: "Erro ao Salvar Conexão",
      description: "A autorização foi bem-sucedida, mas houve um erro ao salvar a conexão no sistema."
    },
    default: {
      title: "Erro ao Conectar Oura Ring",
      description: "Ocorreu um erro inesperado durante a conexão com o Oura Ring."
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
      navigate(`/alunos/${studentId}`);
    } else {
      navigate("/");
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
          <CardDescription>
            {error.description}
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

          <p className="text-xs text-center text-muted-foreground">
            Você pode conectar o Oura Ring mais tarde através do seu perfil.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
