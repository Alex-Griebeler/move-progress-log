import { useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OnboardingSuccessPage() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("student_id");

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      <Card className="max-w-md w-full" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 animate-scale-in">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl" style={{ color: '#ffffff' }}>
            Cadastro Realizado com Sucesso! 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p style={{ color: '#a1a1aa' }}>
            Seu perfil foi criado e seu treinador já pode acessar suas informações.
          </p>
          
          {studentId && (
            <p 
              className="text-sm p-3 rounded-md" 
              style={{ color: '#a1a1aa', backgroundColor: '#27272a' }}
            >
              Seus dados do Oura Ring estão sendo sincronizados automaticamente.
            </p>
          )}

          <div className="pt-4">
            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
              style={{ borderColor: '#3f3f46', color: '#ffffff' }}
            >
              Fechar
            </Button>
          </div>

          <p className="text-sm" style={{ color: '#71717a' }}>
            Você pode fechar esta janela.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
