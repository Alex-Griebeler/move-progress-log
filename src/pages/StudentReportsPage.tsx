import { useState, lazy, Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatDateSP, formatDecimalBR, formatNumberBR } from "@/utils/displayFormat";
import { useParams } from "react-router-dom";
import { NAV_LABELS, ROUTES } from "@/constants/navigation";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStudentReports } from "@/hooks/useStudentReports";
import { useStudentById } from "@/hooks/useStudents";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Plus, FileText, Calendar, TrendingUp, BarChart3, ArrowLeft, Users } from "lucide-react";
import { formatSessionDate } from "@/utils/sessionDate";

const GenerateReportDialog = lazy(() =>
  import("@/components/GenerateReportDialog").then((module) => ({ default: module.GenerateReportDialog }))
);
const StudentReportView = lazy(() =>
  import("@/components/StudentReportView").then((module) => ({ default: module.StudentReportView }))
);

export default function StudentReportsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { data: student } = useStudentById(studentId || null);
  const { data: reports, isLoading, isError, refetch } = useStudentReports(studentId || "");

  if (!studentId) {
    return (
      <PageLayout>
        <ErrorState title="Cadastro não encontrado" description="O endereço não aponta para um cadastro válido." />
      </PageLayout>
    );
  }

  const breadcrumbs = [
    { label: NAV_LABELS.students, href: ROUTES.students, icon: Users },
    { label: student?.name ?? "Cadastro", href: ROUTES.studentDetail(studentId) },
    { label: "Relatórios" },
  ];

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
        <div>
          <Button
            variant="ghost"
            onClick={() => setSelectedReportId(null)}
            className="-ml-3 px-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Voltar para a lista de relatórios
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
      {/* A trilha leva de volta à ficha; sem botão "Voltar" duplicado. */}
      <PageHeader
        title="Relatórios"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Gerar relatório
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          title="Não foi possível carregar os relatórios"
          description="Verifique a conexão e tente de novo."
          onRetry={() => refetch()}
        />
      ) : !reports || reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Nenhum relatório gerado"
          description="Gere um relatório do período para acompanhar a evolução."
          primaryAction={{ label: "Gerar relatório", onClick: () => setGenerateDialogOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="card-interactive relative p-6">
              <div className="flex items-start justify-between mb-4">
                <FileText className="w-6 h-6 text-primary" aria-hidden="true" />
                <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                  {report.status === 'completed' ? 'Concluído' : report.status === 'generating' ? 'Gerando' : 'Falhou'}
                </Badge>
              </div>

              {/* Card inteiro abre o relatório (botão esticado; teclado e leitor de tela). */}
              <h3 className="text-h3 mb-2">
                <button
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                  className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  Relatório {report.report_type === 'mensal' ? 'mensal' : report.report_type === 'bimestral' ? 'bimestral' : report.report_type === 'trimestral' ? 'trimestral' : 'personalizado'}
                </button>
              </h3>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {formatSessionDate(report.period_start)} até {formatSessionDate(report.period_end)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" aria-hidden="true" />
                  <span>{report.total_sessions} treinos</span>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" aria-hidden="true" />
                  <span>{formatDecimalBR(report.weekly_average, 1)} treinos por semana</span>
                </div>

                {report.adherence_percentage !== null && report.adherence_percentage !== undefined && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="font-semibold">Adesão: {formatNumberBR(report.adherence_percentage, 0)}%</span>
                  </div>
                )}
              </div>

              {report.generated_at && (
                <div className="text-caption text-muted-foreground mt-4">
                  Gerado em {formatDateSP(report.generated_at, true)}
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
