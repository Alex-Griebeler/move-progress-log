import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  TrendingUp, 
  Activity, 
  Target,
  BarChart3,
  FileText,
  Heart,
  Moon,
  Zap,
  Download,
  Loader2
} from "lucide-react";
import { useReportById, useReportTrackedExercises } from "@/hooks/useStudentReports";
import { logger } from "@/utils/logger";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StudentReportViewProps {
  reportId: string;
  studentName: string;
}

const ReportLoadChart = lazy(() =>
  import("@/components/ReportLoadChart").then((module) => ({ default: module.ReportLoadChart }))
);

export function StudentReportView({ reportId, studentName }: StudentReportViewProps) {
  const { data: report, isLoading: reportLoading } = useReportById(reportId);
  const { data: trackedExercises, isLoading: exercisesLoading } = useReportTrackedExercises(reportId);
  const [isExporting, setIsExporting] = useState(false);
  const formatMetric = (value: number | null | undefined, digits = 0, suffix = "") => {
    if (value === null || value === undefined) {
      return "--";
    }
    return `${value.toFixed(digits)}${suffix}`;
  };
  const formatKg = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "--";
    return `${value.toFixed(1)} kg`;
  };
  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "N/A";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const handleExportPDF = async () => {
    if (!report) return;
    
    setIsExporting(true);
    try {
      // Get trainer name
      const { data: { user } } = await supabase.auth.getUser();
      let trainerName = undefined;
      
      if (user) {
        const { data: profile } = await supabase
          .from('trainer_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        trainerName = profile?.full_name || undefined;
      }

      // Generate PDF lazily to avoid loading @react-pdf on initial page render
      const [{ pdf }, { ReportPDFDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/ReportPDFDocument"),
      ]);

      const pdfDoc = (
        <ReportPDFDocument
          report={report}
          trackedExercises={trackedExercises || []}
          studentName={studentName}
          trainerName={trainerName}
        />
      );

      const blob = await pdf(pdfDoc).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatorio_${studentName.replace(/\s+/g, '_')}_${format(new Date(report.period_start), 'yyyyMMdd')}-${format(new Date(report.period_end), 'yyyyMMdd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      logger.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (reportLoading || exercisesLoading) {
    return <LoadingSpinner />;
  }

  if (!report) {
    return <div className="text-center py-8">Relatório não encontrado</div>;
  }

  const hasVo2Data = report.oura_data?.avgVo2Max !== null && report.oura_data?.avgVo2Max !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{studentName}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(report.period_start), "dd/MM/yyyy", { locale: ptBR })} até{" "}
                  {format(new Date(report.period_end), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              {report.generated_at && (
                <div className="text-xs">
                  Gerado em {format(new Date(report.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting || report.status !== 'completed'}
              variant="outline"
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </>
              )}
            </Button>
            <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
              {report.status === 'completed' ? 'Concluído' : report.status === 'generating' ? 'Gerando...' : 'Falhou'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Section 1: Frequency and Adherence */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Frequência e Adesão
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-muted/50">
            <div className="text-sm text-muted-foreground mb-1">Total de Treinos</div>
            <div className="text-3xl font-bold">{report.total_sessions}</div>
          </Card>
          <Card className="p-4 bg-muted/50">
            <div className="text-sm text-muted-foreground mb-1">Média Semanal</div>
            <div className="text-3xl font-bold">{formatMetric(report.weekly_average, 1)}</div>
          </Card>
          {report.adherence_percentage !== null && report.adherence_percentage !== undefined && (
            <Card className="p-4 bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Adesão</div>
              <div className="text-3xl font-bold">{report.adherence_percentage.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {report.total_sessions} de {report.sessions_proposed} sessões
              </div>
            </Card>
          )}
        </div>

        {report.consistency_analysis && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm leading-relaxed">{report.consistency_analysis}</p>
          </div>
        )}
      </Card>

      {/* Section 2: Load Evolution */}
      {trackedExercises && trackedExercises.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução de Carga / Força
          </h2>

          <div className="space-y-6">
            {trackedExercises.map((exercise) => (
              <div key={exercise.id} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4">{exercise.exercise_name}</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Carga Inicial</div>
                    <div className="text-xl font-bold">{formatKg(exercise.initial_load)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Carga Final</div>
                    <div className="text-xl font-bold">{formatKg(exercise.final_load)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Variação de Carga</div>
                    <div className={`text-xl font-bold ${(exercise.load_variation_percentage || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {formatPercentage(exercise.load_variation_percentage)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Variação de Volume</div>
                    <div className={`text-xl font-bold ${(exercise.work_variation_percentage || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {formatPercentage(exercise.work_variation_percentage)}
                    </div>
                  </div>
                </div>

                {exercise.weekly_progression && Array.isArray(exercise.weekly_progression) && exercise.weekly_progression.length > 0 && (
                  <Suspense fallback={<div className="h-[200px] mt-4 animate-pulse rounded-md bg-muted" />}>
                    <ReportLoadChart data={exercise.weekly_progression} />
                  </Suspense>
                )}
              </div>
            ))}
          </div>

          {report.strength_analysis && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6">
              <p className="text-sm leading-relaxed">{report.strength_analysis}</p>
            </div>
          )}
        </Card>
      )}

      {/* Section 3: Oura Data (if available) */}
      {report.oura_data && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Dados de Wearable
          </h2>

          <div className={`grid grid-cols-1 ${hasVo2Data ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4`}>
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <div className="text-sm text-muted-foreground">Readiness Médio</div>
              </div>
              <div className="text-2xl font-bold">{formatMetric(report.oura_data.avgReadiness)}</div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="w-4 h-4 text-primary" />
                <div className="text-sm text-muted-foreground">Sleep Score Médio</div>
              </div>
              <div className="text-2xl font-bold">{formatMetric(report.oura_data.avgSleep)}</div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-primary" />
                <div className="text-sm text-muted-foreground">HRV Médio</div>
              </div>
              <div className="text-2xl font-bold">{formatMetric(report.oura_data.avgHrv, 0, " ms")}</div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <div className="text-sm text-muted-foreground">RHR Médio</div>
              </div>
              <div className="text-2xl font-bold">{formatMetric(report.oura_data.avgRhr, 0, " bpm")}</div>
            </Card>

            {hasVo2Data && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <div className="text-sm text-muted-foreground">VO2 Max Médio</div>
                </div>
                <div className="text-2xl font-bold">{formatMetric(report.oura_data.avgVo2Max, 1)}</div>
                {report.oura_data.vo2VariationPercentage !== null && report.oura_data.vo2VariationPercentage !== undefined && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {report.oura_data.vo2VariationPercentage > 0 ? "+" : ""}
                    {report.oura_data.vo2VariationPercentage.toFixed(1)}% no período
                  </div>
                )}
              </Card>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Baseado em {report.oura_data.dataPoints ?? "--"} dias de dados
          </p>
        </Card>
      )}

      {/* Section 4: Trainer Summary */}
      {(report.trainer_highlights || report.attention_points || report.next_cycle_plan) && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resumo do Treinador
          </h2>

          <div className="space-y-4">
            {report.trainer_highlights && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Destaques Positivos
                </h3>
                <p className="text-sm text-muted-foreground">{report.trainer_highlights}</p>
              </div>
            )}

            {report.attention_points && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    Pontos de Atenção
                  </h3>
                  <p className="text-sm text-muted-foreground">{report.attention_points}</p>
                </div>
              </>
            )}

            {report.next_cycle_plan && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Plano para o Próximo Ciclo
                  </h3>
                  <p className="text-sm text-muted-foreground">{report.next_cycle_plan}</p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
