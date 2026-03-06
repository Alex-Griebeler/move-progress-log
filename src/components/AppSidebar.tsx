import { Home, Users, Library, FileText, Heart, LogOut, Shield, UserCog, Bot, BarChart2, Brain, LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useUserRole";
import { NAV_LABELS } from "@/constants/navigation";
import logoFabrik from "@/assets/logo-fabrik.webp";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const mainItems: MenuItem[] = [
  { title: NAV_LABELS.dashboard, url: "/", icon: Home },
  { title: NAV_LABELS.students, url: "/alunos", icon: Users },
  { title: NAV_LABELS.exercises, url: "/exercicios", icon: Library },
  { title: NAV_LABELS.prescriptions, url: "/prescricoes", icon: FileText },
  { title: NAV_LABELS.protocols, url: "/protocolos", icon: Heart },
];

const adminItems: MenuItem[] = [
  { title: NAV_LABELS.adminUsers, url: "/admin/usuarios", icon: UserCog },
  { title: NAV_LABELS.adminDiagnostics, url: "/admin/diagnostico-oura", icon: Shield },
  { title: NAV_LABELS.aiBuilder, url: "/ai-builder", icon: Bot },
  { title: NAV_LABELS.athleteInsights, url: "/athlete-insights", icon: BarChart2 },
  { title: NAV_LABELS.coachConsole,    url: "/coach-console",    icon: Brain },
];

export function AppSidebar() {
  const { open, setOpen, isMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();

  // Fechar sidebar automaticamente no mobile após navegação
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, isMobile, setOpen]);

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

  const MenuItemComponent = ({ item }: { item: MenuItem }) => {
    const isActive = location.pathname === item.url || 
      (item.url === "/" && location.pathname === "/");
    
    const button = (
      <SidebarMenuButton asChild>
        <NavLink 
          to={item.url} 
          end={item.url === "/"}
          className={
            isActive 
              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
              : "hover:bg-muted/50 hover:border-l-2 hover:border-muted-foreground/20"
          }
          aria-label={item.title}
          aria-current={isActive ? "page" : undefined}
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          {open && <span className="truncate">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    );

    if (!open) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo - sem border para alinhamento */}
        <div className="h-14 flex items-center px-4">
          <NavLink 
            to="/" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            aria-label="Página inicial - Fabrik Performance"
          >
            <img 
              src={logoFabrik} 
              alt="Fabrik Performance" 
              className="h-8 w-auto object-contain"
            />
            {open && (
              <span className="font-bold text-primary text-sm">
                Fabrik Performance
              </span>
            )}
          </NavLink>
        </div>

        {/* Main Navigation */}
        <SidebarGroup className="overflow-hidden">
          <SidebarGroupLabel className="overflow-hidden">Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu role="navigation" aria-label="Navegação principal">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <MenuItemComponent item={item} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {isAdmin && (
          <SidebarGroup className="overflow-hidden">
            <SidebarGroupLabel className="overflow-hidden">Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu role="navigation" aria-label="Navegação administrativa">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <MenuItemComponent item={item} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with Logout */}
      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            {!open ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton 
                    onClick={handleSignOut}
                    aria-label={NAV_LABELS.signOut}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {NAV_LABELS.signOut}
                </TooltipContent>
              </Tooltip>
            ) : (
              <SidebarMenuButton 
                onClick={handleSignOut}
                aria-label={NAV_LABELS.signOut}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>{NAV_LABELS.signOut}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
