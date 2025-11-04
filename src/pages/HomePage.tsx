import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/login");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta com sucesso.",
    });
    navigate("/login");
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Carregando..." />;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-[var(--gradient-primary)] bg-clip-text text-transparent">
              Fabrik Studio
            </h1>
            <p className="text-muted-foreground mt-2">Body & Mind Fitness</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <Card className="p-8 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-[var(--gradient-primary)] flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Bem-vindo de volta!
              </h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-4">
              Próximos Passos
            </h3>
            <div className="space-y-4">
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-primary/20">
                <h4 className="font-medium mb-1">Meus Treinos</h4>
                <p className="text-sm text-muted-foreground">
                  Acesse seu plano de treinamento personalizado
                </p>
              </Card>
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-primary/20">
                <h4 className="font-medium mb-1">Métricas de Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Acompanhe sua evolução e resultados
                </p>
              </Card>
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-primary/20">
                <h4 className="font-medium mb-1">Protocolos de Recuperação</h4>
                <p className="text-sm text-muted-foreground">
                  Ice bath, sauna e outras terapias disponíveis
                </p>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
