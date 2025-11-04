import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useUserRole";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { 
  Users, 
  Shield, 
  UserCog, 
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
  last_sign_in_at: string | null;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  moderator: 'Treinador',
  user: 'Aluno'
};

const roleVariants: Record<string, "default" | "secondary" | "destructive"> = {
  admin: 'destructive',
  moderator: 'default',
  user: 'secondary'
};

export default function AdminUsersPage() {
  usePageTitle(NAV_LABELS.adminUsers);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: `${NAV_LABELS.adminUsers} · Fabrik Performance`,
    description: 'Administração de usuários e permissões do sistema Fabrik Performance.',
    type: 'website',
    url: true,
  });
  
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Buscar papéis de todos os usuários
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Buscar todos os perfis de treinadores
      const { data: profiles, error: profilesError } = await supabase
        .from("trainer_profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Buscar todos os alunos
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name, created_at, updated_at");

      if (studentsError) throw studentsError;

      // Combinar dados de trainers/admins
      const trainersData: UserWithRole[] = (profiles || []).map((profile: any) => {
        const roleData = roles?.find((r: any) => r.user_id === profile.id);

        return {
          id: profile.id,
          email: 'admin@fabrikbrasil.com', // Placeholder até ter auth.admin
          full_name: profile.full_name || 'Sem nome',
          role: (roleData?.role || 'moderator') as 'admin' | 'moderator' | 'user',
          created_at: profile.created_at,
          last_sign_in_at: profile.updated_at
        };
      });

      // Adicionar alunos como usuários com role 'user'
      const studentsData: UserWithRole[] = (students || []).map((student: any) => ({
        id: student.id,
        email: 'aluno@fabrikbrasil.com', // Placeholder - alunos não têm email no sistema
        full_name: student.name,
        role: 'user' as const,
        created_at: student.created_at,
        last_sign_in_at: student.updated_at
      }));

      setUsers([...trainersData, ...studentsData]);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    users: users.filter(u => u.role === 'user').length,
  };

  if (roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{NAV_LABELS.adminUsers}</h1>
          <p className="text-muted-foreground">
            {NAV_LABELS.subtitleAdminUsers}
          </p>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{NAV_LABELS.statTotalUsers}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{NAV_LABELS.statAdmins}</CardTitle>
                <Shield className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.admins}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{NAV_LABELS.statModerators}</CardTitle>
                <UserCog className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.moderators}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{NAV_LABELS.statStudents}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>{NAV_LABELS.sectionUserList}</CardTitle>
                <CardDescription>
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={fetchUsers} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-full md:w-48">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os perfis</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="moderator">Treinadores</SelectItem>
                    <SelectItem value="user">Alunos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {/* Skeleton para filtros */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-full md:w-48" />
                </div>
                
                {/* Skeleton para tabela */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <div className="divide-y">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="p-4 flex gap-4 items-center">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-4 font-medium">Nome</th>
                        <th className="text-left p-4 font-medium">Email</th>
                        <th className="text-left p-4 font-medium">Perfil</th>
                        <th className="text-left p-4 font-medium">Último Acesso</th>
                        <th className="text-left p-4 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-t hover:bg-muted/50">
                          <td className="p-4">{user.full_name}</td>
                          <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                          <td className="p-4">
                            <Badge variant={roleVariants[user.role]}>
                              {roleLabels[user.role]}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {user.last_sign_in_at 
                              ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')
                              : 'Nunca'}
                          </td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm">
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sistema de Gestão de Contas - Fase 1</CardTitle>
            <CardDescription>
              Fundação implementada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Sistema de permissões granulares (35 permissões)</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Auditoria completa (histórico de mudanças)</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Rate limiting anti-brute force</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Sistema de reset de senha</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-yellow-500">⊙</span>
                <span>Painel de gestão (em desenvolvimento)</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
