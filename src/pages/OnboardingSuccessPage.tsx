import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOuraMetrics } from "@/hooks/useOuraMetrics";
import { useOuraConnection } from "@/hooks/useOuraConnection";

export default function OnboardingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get("student_id");

  const { data: ouraMetrics, isLoading: metricsLoading } = useOuraMetrics(studentId || "", 7);
  const { data: ouraConnection, isLoading: connectionLoading } = useOuraConnection(studentId || "");

  const handleAccessProfile = () => {
    if (studentId) {
      navigate(`/alunos/${studentId}`);
    }
  };

  const renderOuraStatus = () => {
    if (!studentId) return null;

    if (connectionLoading || metricsLoading) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-sm text-muted-foreground">
            Verificando sincronização do Oura Ring...
          </span>
        </div>
      );
    }

    if (ouraConnection && ouraMetrics && ouraMetrics.length > 0) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Oura Ring conectado com sucesso!
              </p>
              <p className="text-xs text-muted-foreground">
                {ouraMetrics.length} {ouraMetrics.length === 1 ? 'dia sincronizado' : 'dias sincronizados'}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          </div>
        </div>
      );
    }

    if (ouraConnection && (!ouraMetrics || ouraMetrics.length === 0)) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <div>
            <p className="text-sm font-medium">
              Sincronização em andamento...
            </p>
            <p className="text-xs text-muted-foreground">
              Seus dados do Oura Ring estão sendo carregados
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 animate-scale-in">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">
            Cadastro Realizado com Sucesso! 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Seu perfil foi criado e seu treinador já pode acessar suas informações.
          </p>
          
          {renderOuraStatus()}

          <div className="space-y-2 pt-4">
            <Button
              onClick={handleAccessProfile}
              className="w-full"
            >
              Acessar Meu Perfil
            </Button>

            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
            >
              Fechar
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Você pode acessar seu perfil a qualquer momento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
