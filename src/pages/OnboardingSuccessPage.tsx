import { useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OnboardingSuccessPage() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("student_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Cadastro Realizado com Sucesso! 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Seu perfil foi criado e seu treinador já pode acessar suas informações.
          </p>
          
          {studentId && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              Seus dados do Oura Ring estão sendo sincronizados automaticamente.
            </p>
          )}

          <div className="pt-4">
            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
            >
              Fechar
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Você pode fechar esta janela.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
