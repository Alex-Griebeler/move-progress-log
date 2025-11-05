import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useUserRole";
import logoFabrik from "@/assets/logo-fabrik.webp";
import { NAV_LABELS } from "@/constants/navigation";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AppHeader = ({ 
  title = "Fabrik Performance", 
  subtitle = NAV_LABELS.subtitleDefault,
  actions 
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <header className="mb-10 pb-6 border-b border-border">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
          <img 
            src={logoFabrik} 
            alt="Logo Fabrik Performance - Studio boutique de treinamento funcional" 
            className="h-12 md:h-14 w-auto object-contain"
            loading="eager"
          />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
        </Link>
        <div className="flex gap-2 items-center flex-wrap">
          {actions}
        </div>
      </div>
    </header>
  );
};
