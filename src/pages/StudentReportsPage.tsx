import { useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStudentReports } from "@/hooks/useStudentReports";
import { useStudents } from "@/hooks/useStudents";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Plus, FileText, Calendar, TrendingUp, BarChart3, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const GenerateReportDialog = lazy(() =>
  import("@/components/GenerateReportDialog").then((module) => ({ default: module.GenerateReportDialog }))
);
const StudentReportView = lazy(() =>
  import("@/components/StudentReportView").then((module) => ({ default: module.StudentReportView }))
);

export default function StudentReportsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { data: students } = useStudents();
  const student = students?.find((s) => s.id === studentId);
  const { data: reports, isLoading } = useStudentReports(studentId || "");

  const formatMetric = (value: number | null | undefined, digits = 1): string => {
    if (value === null || value === undefined) return "--";
    return value.toFixed(digits);
  };

  if (!studentId) {
    return <div>Aluno não encontrado</div>;
  }

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (selectedReportId && student) {
    return (
      <PageLayout>
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedReportId(null)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista de relatórios
          </Button>
        </div>
        <Suspense fallback={<LoadingSpinner />}>
          <StudentReportView reportId={selectedReportId} studentName={student.name} />
        </Suspense>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(ROUTES.studentDetail(studentId!))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para perfil do aluno
        </Button>
      </div>
      
      <PageHeader
        title={`Relatórios - ${student?.name || ''}`}
        description="Visualize e gere relatórios periódicos de evolução"
        actions={
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Gerar Novo Relatório
          </Button>
        }
      />

      {!reports || reports.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhum relatório gerado</h3>
          <p className="text-muted-foreground mb-4">
            Comece gerando seu primeiro relatório periódico para acompanhar a evolução do aluno
          </p>
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Gerar Primeiro Relatório
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedReportId(report.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <FileText className="w-8 h-8 text-primary" />
                <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                  {report.status === 'completed' ? 'Concluído' : report.status === 'generating' ? 'Gerando...' : 'Falhou'}
                </Badge>
              </div>

              <h3 className="font-semibold mb-2">
                Relatório {report.report_type === 'mensal' ? 'Mensal' : report.report_type === 'bimestral' ? 'Bimestral' : report.report_type === 'trimestral' ? 'Trimestral' : 'Personalizado'}
              </h3>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(report.period_start), "dd/MM/yy", { locale: ptBR })} até{" "}
                    {format(new Date(report.period_end), "dd/MM/yy", { locale: ptBR })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>{report.total_sessions} treinos</span>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>{formatMetric(report.weekly_average, 1)} treinos/semana</span>
                </div>

                {report.adherence_percentage !== null && report.adherence_percentage !== undefined && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="font-semibold">Adesão: {report.adherence_percentage.toFixed(0)}%</span>
                  </div>
                )}
              </div>

              {report.generated_at && (
                <div className="text-xs text-muted-foreground mt-4">
                  Gerado em {format(new Date(report.generated_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {student && generateDialogOpen && (
        <Suspense fallback={null}>
          <GenerateReportDialog
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
            studentId={studentId}
            studentName={student.name}
          />
        </Suspense>
      )}
    </PageLayout>
  );
}
