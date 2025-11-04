import { useStudents } from "@/hooks/useStudents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OuraApiDiagnosticsCard } from "@/components/OuraApiDiagnosticsCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AppHeader } from "@/components/AppHeader";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";

const AdminDiagnosticsPage = () => {
  usePageTitle(NAV_LABELS.adminDiagnostics);
  
  const navigate = useNavigate();
  const { data: students, isLoading } = useStudents();
  const { isAdmin, isLoading: isLoadingRole } = useIsAdmin();

  if (isLoadingRole) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas administradores podem ver o diagnóstico da API Oura.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/alunos")} className="mt-4">
          Voltar para Alunos
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumbs 
          items={[
            { label: NAV_LABELS.students, href: "/alunos" },
            { label: NAV_LABELS.adminDiagnostics, icon: Shield }
          ]}
        />
        
        <AppHeader
          title={NAV_LABELS.adminDiagnostics}
          subtitle={NAV_LABELS.subtitleDiagnostics}
          actions={
            <Button variant="ghost" size="icon" onClick={() => navigate("/alunos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : students && students.length > 0 ? (
          <div className="space-y-8">
            {students.map((student) => (
              <div key={student.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{student.name}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/alunos/${student.id}`)}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <OuraApiDiagnosticsCard studentId={student.id} />
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-xl font-semibold text-muted-foreground">
                Nenhum aluno cadastrado
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDiagnosticsPage;
