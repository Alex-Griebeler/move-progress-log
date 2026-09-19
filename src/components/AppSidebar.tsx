import { LogOut, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useUserRole";
import { ROUTES, ROUTE_CONFIG, POST_LOGIN_ROUTE, RouteDefinition, NAV_LABELS } from "@/constants/navigation";
import logoFabrik from "@/assets/logo-fabrik.png";
import { isRouteActive } from "@/lib/navigationUtils";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildErrorDescription } from "@/utils/errorParsing";
import { isExperimentalNavigationEnabled } from "@/utils/featureFlags";

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

export function AppSidebar() {
  const { open, isMobile, setOpenMobile } = useSidebar();
  // No celular o menu é uma folha (Sheet) de largura cheia: rótulos sempre
  // visíveis. `open` é o estado do DESKTOP (expandido/ícones) e não vale aqui.
  const showLabels = isMobile || open;
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const showExperimentalNav = isExperimentalNavigationEnabled();

  // Fechar a folha do menu no celular após navegação. Usa o estado MÓVEL
  // (openMobile); o `setOpen` do desktop gravava cookie e colapsava o desktop.
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  const closeMobileMenu = () => {
    if (isMobile) setOpenMobile(false);
  };

  // Filtrar rotas baseado em permissões e manter módulos piloto fora do menu padrão.
  const items = ROUTE_CONFIG.filter(item =>
    (!item.requiresAdmin || isAdmin) && (!item.experimentalNav || showExperimentalNav)
  );
  const menuGroups = [
    { id: "operations", label: "Operação" },
    { id: "library", label: "Biblioteca" },
    { id: "admin", label: "Administração" },
    { id: "experimental", label: "Experimental" },
  ] as const;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: buildErrorDescription(error, "Tente novamente."),
        variant: "destructive",
      });
    } else {
      navigate(ROUTES.auth);
    }
  };

  const MenuItemComponent = ({ item }: { item: RouteDefinition }) => {
    const active = isRouteActive(location.pathname, item.path, { exact: true });
    
    const button = (
      <SidebarMenuButton asChild className="max-md:h-10">
        <NavLink 
          to={item.path} 
          end={item.path === ROUTES.dashboard}
          className={
            active 
              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
              : "hover:bg-muted/50 hover:border-l-2 hover:border-muted-foreground/20"
          }
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          onClick={closeMobileMenu}
        >
          {item.icon && <item.icon className="h-4 w-4" aria-hidden="true" />}
          {showLabels && <span className="truncate">{item.label}</span>}
        </NavLink>
      </SidebarMenuButton>
    );

    if (!showLabels) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
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
        <div className="h-14 flex items-center justify-between gap-2 px-md">
          <NavLink 
            to={ROUTES.dashboard} 
            onClick={closeMobileMenu}
            className="flex items-center gap-sm hover:opacity-80 transition-opacity"
            aria-label="Página inicial - Fabrik Performance"
          >
            <img 
              src={logoFabrik} 
              alt="Fabrik Performance" 
              className="h-8 w-auto object-contain"
            />
            {showLabels && (
              <span className="font-bold text-primary text-sm">
                Fabrik Performance
              </span>
            )}
          </NavLink>
          {isMobile && (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              aria-label="Fechar menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Navegação centralizada via ROUTE_CONFIG */}
        {menuGroups.map((group) => {
          const groupItems = items.filter((item) => item.navGroup === group.id);

          if (groupItems.length === 0) {
            return null;
          }

          return (
            <SidebarGroup key={group.id} className="py-xs">
              {showLabels && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <MenuItemComponent item={item} />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Footer with Logout */}
      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            {!showLabels ? (
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
                className="max-md:h-10 hover:bg-destructive/10 hover:text-destructive"
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
