import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
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
      navigate(ROUTES.auth);
    }
  };

  return (
        <header className="mb-lg pb-md border-b border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-md">
            <div className="space-y-xs flex-1 min-w-0">
              <h1 className="text-[1.75rem] font-bold text-foreground tracking-tight leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-base text-muted-foreground/80 leading-normal">{subtitle}</p>
              )}
            </div>
            <div className="flex gap-xs items-center flex-wrap">
              {actions}
            </div>
          </div>
        </header>
  );
};
