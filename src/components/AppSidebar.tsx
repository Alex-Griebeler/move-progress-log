import { Home, Users, Library, FileText, Heart, LogOut, Shield, UserCog } from "lucide-react";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useUserRole";
import { NAV_LABELS } from "@/constants/navigation";
import logoFabrik from "@/assets/logo-fabrik.webp";

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

const mainItems = [
  { title: NAV_LABELS.dashboard, url: "/", icon: Home },
  { title: NAV_LABELS.students, url: "/alunos", icon: Users },
  { title: NAV_LABELS.exercises, url: "/exercicios", icon: Library },
  { title: NAV_LABELS.prescriptions, url: "/prescricoes", icon: FileText },
  { title: NAV_LABELS.protocols, url: "/protocolos", icon: Heart },
];

const adminItems = [
  { title: NAV_LABELS.adminUsers, url: "/admin/usuarios", icon: UserCog },
  { title: NAV_LABELS.adminDiagnostics, url: "/admin/diagnostico-oura", icon: Shield },
];

export function AppSidebar() {
  const { open } = useSidebar();
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
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        isActive 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className={({ isActive }) =>
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "hover:bg-muted/50"
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
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
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {open && <span>{NAV_LABELS.signOut}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
