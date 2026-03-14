import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { StudentReport, TrackedExercise } from '@/hooks/useStudentReports';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cores corporativas da Fabrik
const FABRIK_COLORS = {
  primary: '#1A1A1A',
  secondary: '#C9A961',
  accent: '#8B7355',
  text: '#333333',
  textLight: '#666666',
  background: '#FFFFFF',
  border: '#E5E5E5',
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: FABRIK_COLORS.background,
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: `3px solid ${FABRIK_COLORS.secondary}`,
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: FABRIK_COLORS.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: FABRIK_COLORS.textLight,
    marginBottom: 3,
  },
  badge: {
    backgroundColor: FABRIK_COLORS.secondary,
    color: FABRIK_COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: FABRIK_COLORS.primary,
    marginBottom: 12,
    borderBottom: `2px solid ${FABRIK_COLORS.border}`,
    paddingBottom: 5,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  metricCard: {
    width: '30%',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 6,
    borderLeft: `3px solid ${FABRIK_COLORS.secondary}`,
  },
  metricLabel: {
    fontSize: 10,
    color: FABRIK_COLORS.textLight,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: FABRIK_COLORS.primary,
  },
  metricSubtext: {
    fontSize: 8,
    color: FABRIK_COLORS.textLight,
    marginTop: 2,
  },
  analysisBox: {
    backgroundColor: '#F0F6FF',
    padding: 12,
    borderRadius: 6,
    borderLeft: `3px solid ${FABRIK_COLORS.accent}`,
    marginTop: 10,
  },
  analysisText: {
    fontSize: 11,
    color: FABRIK_COLORS.text,
    lineHeight: 1.5,
  },
  exerciseCard: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeft: `3px solid ${FABRIK_COLORS.secondary}`,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: FABRIK_COLORS.primary,
    marginBottom: 8,
  },
  exerciseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  exerciseMetricItem: {
    width: '23%',
  },
  exerciseMetricLabel: {
    fontSize: 9,
    color: FABRIK_COLORS.textLight,
    marginBottom: 3,
  },
  exerciseMetricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: FABRIK_COLORS.primary,
  },
  positiveChange: {
    color: '#10B981',
  },
  trainerNotes: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 6,
    borderLeft: `3px solid ${FABRIK_COLORS.secondary}`,
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: FABRIK_COLORS.primary,
    marginBottom: 5,
  },
  noteText: {
    fontSize: 10,
    color: FABRIK_COLORS.text,
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: `2px solid ${FABRIK_COLORS.border}`,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 9,
    color: FABRIK_COLORS.textLight,
  },
  footerBrand: {
    fontSize: 10,
    fontWeight: 'bold',
    color: FABRIK_COLORS.secondary,
  },
  ouraMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  ouraCard: {
    width: '23%',
    backgroundColor: '#F8F8F8',
    padding: 10,
    borderRadius: 6,
    borderLeft: `3px solid ${FABRIK_COLORS.accent}`,
  },
  ouraLabel: {
    fontSize: 9,
    color: FABRIK_COLORS.textLight,
    marginBottom: 4,
  },
  ouraValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: FABRIK_COLORS.primary,
  },
});

interface ReportPDFDocumentProps {
  report: StudentReport;
  trackedExercises: TrackedExercise[];
  studentName: string;
  trainerName?: string;
}

export const ReportPDFDocument = ({
  report,
  trackedExercises,
  studentName,
  trainerName,
}: ReportPDFDocumentProps) => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };
  const hasVo2Data = report.oura_data?.avgVo2Max !== null && report.oura_data?.avgVo2Max !== undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Relatório de Evolução</Text>
          <Text style={styles.subtitle}>{studentName}</Text>
          <Text style={styles.subtitle}>
            Período: {formatDate(report.period_start)} até {formatDate(report.period_end)}
          </Text>
          {trainerName && (
            <Text style={styles.subtitle}>Treinador: {trainerName}</Text>
          )}
          {report.generated_at && (
            <Text style={styles.subtitle}>
              Gerado em: {format(new Date(report.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
          )}
          <View style={styles.badge}>
            <Text>FABRIK STUDIO</Text>
          </View>
        </View>

        {/* Section 1: Frequência e Adesão */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequência e Adesão</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total de Treinos</Text>
              <Text style={styles.metricValue}>{report.total_sessions}</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Média Semanal</Text>
              <Text style={styles.metricValue}>{report.weekly_average.toFixed(1)}</Text>
            </View>
            
            {report.adherence_percentage !== null && report.adherence_percentage !== undefined && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Adesão</Text>
                <Text style={styles.metricValue}>{report.adherence_percentage.toFixed(0)}%</Text>
                <Text style={styles.metricSubtext}>
                  {report.total_sessions} de {report.sessions_proposed} sessões
                </Text>
              </View>
            )}
          </View>

          {report.consistency_analysis && (
            <View style={styles.analysisBox}>
              <Text style={styles.analysisText}>{report.consistency_analysis}</Text>
            </View>
          )}
        </View>

        {/* Section 2: Evolução de Carga */}
        {trackedExercises && trackedExercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evolução de Carga / Força</Text>
            
            {trackedExercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                
                <View style={styles.exerciseMetrics}>
                  <View style={styles.exerciseMetricItem}>
                    <Text style={styles.exerciseMetricLabel}>Carga Inicial</Text>
                    <Text style={styles.exerciseMetricValue}>
                      {exercise.initial_load?.toFixed(1)} kg
                    </Text>
                  </View>
                  
                  <View style={styles.exerciseMetricItem}>
                    <Text style={styles.exerciseMetricLabel}>Carga Final</Text>
                    <Text style={styles.exerciseMetricValue}>
                      {exercise.final_load?.toFixed(1)} kg
                    </Text>
                  </View>
                  
                  <View style={styles.exerciseMetricItem}>
                    <Text style={styles.exerciseMetricLabel}>Variação de Carga</Text>
                    <Text style={[
                      styles.exerciseMetricValue,
                      (exercise.load_variation_percentage || 0) > 0 && styles.positiveChange
                    ]}>
                      {exercise.load_variation_percentage 
                        ? `${exercise.load_variation_percentage > 0 ? '+' : ''}${exercise.load_variation_percentage.toFixed(1)}%` 
                        : 'N/A'}
                    </Text>
                  </View>
                  
                  <View style={styles.exerciseMetricItem}>
                    <Text style={styles.exerciseMetricLabel}>Variação de Volume</Text>
                    <Text style={[
                      styles.exerciseMetricValue,
                      (exercise.work_variation_percentage || 0) > 0 && styles.positiveChange
                    ]}>
                      {exercise.work_variation_percentage 
                        ? `${exercise.work_variation_percentage > 0 ? '+' : ''}${exercise.work_variation_percentage.toFixed(1)}%` 
                        : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {report.strength_analysis && (
              <View style={styles.analysisBox}>
                <Text style={styles.analysisText}>{report.strength_analysis}</Text>
              </View>
            )}
          </View>
        )}

        {/* Section 3: Dados Oura */}
        {report.oura_data && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados de Wearable</Text>
            
            <View style={styles.ouraMetrics}>
              <View style={[styles.ouraCard, { width: hasVo2Data ? "18%" : "23%" }]}>
                <Text style={styles.ouraLabel}>Readiness Médio</Text>
                <Text style={styles.ouraValue}>
                  {report.oura_data.avgReadiness?.toFixed(0)}
                </Text>
              </View>
              
              <View style={[styles.ouraCard, { width: hasVo2Data ? "18%" : "23%" }]}>
                <Text style={styles.ouraLabel}>Sleep Score Médio</Text>
                <Text style={styles.ouraValue}>
                  {report.oura_data.avgSleep?.toFixed(0)}
                </Text>
              </View>
              
              <View style={[styles.ouraCard, { width: hasVo2Data ? "18%" : "23%" }]}>
                <Text style={styles.ouraLabel}>HRV Médio</Text>
                <Text style={styles.ouraValue}>
                  {report.oura_data.avgHrv?.toFixed(0)} ms
                </Text>
              </View>
              
              <View style={[styles.ouraCard, { width: hasVo2Data ? "18%" : "23%" }]}>
                <Text style={styles.ouraLabel}>RHR Médio</Text>
                <Text style={styles.ouraValue}>
                  {report.oura_data.avgRhr?.toFixed(0)} bpm
                </Text>
              </View>

              {hasVo2Data && (
                <View style={[styles.ouraCard, { width: "18%" }]}>
                  <Text style={styles.ouraLabel}>VO2 Max Médio</Text>
                  <Text style={styles.ouraValue}>
                    {report.oura_data.avgVo2Max?.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={[styles.subtitle, { marginTop: 8 }]}>
              Baseado em {report.oura_data.dataPoints} dias de dados
            </Text>
          </View>
        )}

        {/* Section 4: Notas do Treinador */}
        {(report.trainer_highlights || report.attention_points || report.next_cycle_plan) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo do Treinador</Text>
            
            {report.trainer_highlights && (
              <View style={styles.trainerNotes}>
                <Text style={styles.noteTitle}>✓ Destaques Positivos</Text>
                <Text style={styles.noteText}>{report.trainer_highlights}</Text>
              </View>
            )}
            
            {report.attention_points && (
              <View style={styles.trainerNotes}>
                <Text style={styles.noteTitle}>⚠ Pontos de Atenção</Text>
                <Text style={styles.noteText}>{report.attention_points}</Text>
              </View>
            )}
            
            {report.next_cycle_plan && (
              <View style={styles.trainerNotes}>
                <Text style={styles.noteTitle}>→ Plano para o Próximo Ciclo</Text>
                <Text style={styles.noteText}>{report.next_cycle_plan}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerBrand}>FABRIK STUDIO</Text>
            <Text style={styles.footerText}>Body & Mind Fitness | Lago Sul, Brasília</Text>
          </View>
          <Text style={styles.footerText}>
            Relatório confidencial - {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
