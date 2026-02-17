import { useState } from "react";
import { useStudents } from "@/hooks/useStudents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingSkeleton } from "@/components/PageLoadingSkeleton";
import { OuraApiDiagnosticsCard } from "@/components/OuraApiDiagnosticsCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Upload, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AppHeader } from "@/components/AppHeader";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NAV_LABELS, ROUTES } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import exercisesJSON from "@/data/exercicios_fabrik_categorizado.json";

const AdminDiagnosticsPage = () => {
  usePageTitle(NAV_LABELS.adminDiagnostics);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: `${NAV_LABELS.adminDiagnostics} · Fabrik Performance`,
    description: 'Diagnósticos e monitoramento do sistema Fabrik Performance.',
    type: 'website',
    url: true,
  });
  
  const navigate = useNavigate();
  const { data: students, isLoading } = useStudents();
  const { isAdmin, isLoading: isLoadingRole } = useIsAdmin();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);

  const handleImportExercises = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-exercises", {
        body: exercisesJSON,
      });
      if (error) throw error;
      setImportResult(data);
      toast.success(`Importação concluída: ${data.inserted} inseridos, ${data.updated} atualizados`);
    } catch (err) {
      toast.error(`Erro na importação: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  if (isLoadingRole) {
    return <PageLoadingSkeleton layout="list" />;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas administradores podem ver o diagnóstico da API Oura.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(ROUTES.students)} className="mt-4">
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
          actions={
            <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.students)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />

        {/* Import Exercises Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Exercícios (JSON Categorizado)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importa os 491 exercícios do JSON oficial da Fabrik. Exercícios existentes serão atualizados com metadados padronizados. Novos exercícios serão inseridos.
            </p>
            <Button 
              onClick={handleImportExercises} 
              disabled={importing}
              variant="default"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Executar Importação
                </>
              )}
            </Button>

            {importResult && (
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <p><strong>Inseridos:</strong> {String(importResult.inserted)}</p>
                <p><strong>Atualizados:</strong> {String(importResult.updated)}</p>
                <p><strong>Total processado:</strong> {String(importResult.total_processed)}</p>
                {importResult.errors_total && Number(importResult.errors_total) > 0 && (
                  <div>
                    <p className="text-destructive font-medium">Erros: {String(importResult.errors_total)}</p>
                    <pre className="text-xs mt-1 max-h-40 overflow-auto bg-muted p-2 rounded">
                      {JSON.stringify(importResult.errors, null, 2)}
                    </pre>
                  </div>
                )}
                {importResult.orphans_total && Number(importResult.orphans_total) > 0 && (
                  <details>
                    <summary className="cursor-pointer text-muted-foreground">
                      Exercícios órfãos ({String(importResult.orphans_total)}) — não estão no JSON
                    </summary>
                    <pre className="text-xs mt-1 max-h-40 overflow-auto bg-muted p-2 rounded">
                      {JSON.stringify(importResult.orphans, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
                    onClick={() => navigate(ROUTES.studentDetail(student.id))}
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
