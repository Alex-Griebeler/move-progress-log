import { useMemo } from "react";
import { OuraMetrics } from "./useOuraMetrics";

export interface TrainingRecommendation {
  trainingType: string;
  intensity: string;
  duration: string;
  recoveryScore: number;
  fatigueLevel: 'low' | 'moderate' | 'high';
  reason: string;
  alerts: Array<{
    level: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
  }>;
  confidence: number;
  emoji: string;
  priorityProtocols?: Array<{
    order: number;
    name: string;
    duration: string;
    timing: string;
    description: string;
  }>;
}

interface UserHistory {
  avgHRV: number;
  avgRHR: number;
  weeklyActivityBurn: number;
}

interface UserGoals {
  minSleepDurationThreshold: number; // em segundos
  minSleepEfficiency: number; // %
  highFatigueThreshold: number; // kcal
  moderateFatigueThreshold: number; // kcal
}

// Valores padrão baseados em pesquisas
const DEFAULT_HISTORY: UserHistory = {
  avgHRV: 65,
  avgRHR: 60,
  weeklyActivityBurn: 3000
};

const DEFAULT_GOALS: UserGoals = {
  minSleepDurationThreshold: 23400, // 6.5h
  minSleepEfficiency: 85,
  highFatigueThreshold: 10000,
  moderateFatigueThreshold: 7000
};


export function useTrainingRecommendation(
  metrics: OuraMetrics | null,
  recentMetrics: OuraMetrics[] = [],
  userHistory?: Partial<UserHistory>,
  userGoals?: Partial<UserGoals>
): TrainingRecommendation | null {
  const history = { ...DEFAULT_HISTORY, ...userHistory };
  const goals = { ...DEFAULT_GOALS, ...userGoals };

  return useMemo(() => {
    if (!metrics) return null;

    const alerts: TrainingRecommendation['alerts'] = [];

    // 1. AVALIAÇÃO DE RECUPERAÇÃO GERAL
    // Usa diretamente o Readiness Score da Oura (já é uma métrica composta sofisticada)
    const recoveryScore = metrics.readiness_score || 50;

    // 2. ANÁLISE DE FADIGA ACUMULADA
    const weeklyBurn = recentMetrics.reduce((sum, m) => sum + (m.active_calories || 0), 0);
    let fatigueLevel: 'low' | 'moderate' | 'high' = 'low';
    
    if (weeklyBurn > goals.highFatigueThreshold) {
      fatigueLevel = 'high';
    } else if (weeklyBurn > goals.moderateFatigueThreshold) {
      fatigueLevel = 'moderate';
    }

    // 3. LÓGICA DE DECISÃO PRINCIPAL
    let trainingType = '';
    let intensity = '';
    let duration = '';
    let reason = '';
    let emoji = '🟢';

    // RS 85-100: EXCELENTE 💚
    if (recoveryScore >= 85 && fatigueLevel === 'low') {
      trainingType = 'Máxima Performance / Desafio';
      intensity = 'ALTA (80-95% FCMáx)';
      duration = '45-60 minutos';
      reason = 'Excelente! Você está no auge. Oportunidade perfeita para desafios ou recordes pessoais (PRs).';
      emoji = '💚';
    } 
    // RS 65-84: BOM 🟢
    else if (recoveryScore >= 65 && fatigueLevel !== 'high') {
      trainingType = 'Treino Normal Completo';
      intensity = 'MODERADA-ALTA (70-85% FCMáx)';
      duration = '45-55 minutos';
      reason = 'Bom dia para treinar! Você está bem preparado para realizar o treino programado com confiança.';
      emoji = '🟢';
    } 
    // RS 45-64: MODERADO 🟡
    else if (recoveryScore >= 45) {
      trainingType = 'Treino Reduzido 20%';
      intensity = 'MODERADA (60-75% FCMáx)';
      duration = '35-45 minutos';
      reason = 'Dia moderado. Mantenha o treino programado, mas reduza volume e/ou intensidade em 20%.';
      emoji = '🟡';
    } 
    // RS 25-44: BAIXO 🟠
    else if (recoveryScore >= 25) {
      trainingType = 'Recuperação Ativa / Muito Leve';
      intensity = 'BAIXA (30-50% FCMáx)';
      duration = '20-30 minutos';
      reason = 'Dia de recuperação. Foco em atividades leves para restaurar o corpo sem estresse adicional.';
      emoji = '🟠';
    } 
    // RS 0-24: CRÍTICO 🔴
    else {
      trainingType = 'Descanso Completo / Repouso';
      intensity = 'MUITO BAIXA (0-20% FCMáx)';
      duration = 'Repouso total';
      reason = '⚠️ SITUAÇÃO CRÍTICA: Seu corpo precisa de recuperação urgente. Treino NÃO é recomendado hoje. Foque nos protocolos de recuperação.';
      emoji = '🔴';
    }

    // 3.1 DEFINIR PROTOCOLOS PRIORITÁRIOS PARA RS CRÍTICO
    let priorityProtocols: TrainingRecommendation['priorityProtocols'] = undefined;

    if (recoveryScore < 25) {
      priorityProtocols = [
        {
          order: 1,
          name: 'Coerência Cardíaca',
          duration: '10-15 minutos',
          timing: 'Manhã (primeiro ao acordar)',
          description: 'Sincroniza respiração com batidas do coração. Acalma sistema nervoso rapidamente e reduz ansiedade.'
        },
        {
          order: 2,
          name: 'Grounding',
          duration: '15-20 minutos',
          timing: 'Manhã (após Coerência)',
          description: 'Contato direto com terra/grama ao ar livre. Reduz inflamação sistêmica e estresse.'
        },
        {
          order: 3,
          name: 'Técnicas de Respiração',
          duration: '5-10 minutos',
          timing: 'Tarde (se necessário, 3x ao dia)',
          description: 'Box Breathing ou 4-7-8. Reforça ativação parasimpática e reduz estresse agudo.'
        },
        {
          order: 4,
          name: 'Mindfulness',
          duration: '15-20 minutos',
          timing: 'Noite (antes de dormir)',
          description: 'Meditação para acalmar a mente. Prepara o corpo para sono restaurador.'
        }
      ];
    }

    // 4. GERAR ALERTAS ESPECÍFICOS
    
    // HRV Baixa
    if (metrics.average_sleep_hrv && metrics.average_sleep_hrv < history.avgHRV * 0.85) {
      if (metrics.average_sleep_hrv < history.avgHRV * 0.70) {
        alerts.push({
          level: 'CRITICAL',
          message: '🔴 HRV criticamente baixa: Sinal forte de fadiga extrema ou possível doença. Seu corpo precisa de descanso. Se persistir, procure orientação médica.'
        });
      } else {
        alerts.push({
          level: 'WARNING',
          message: '🟡 HRV abaixo do normal: Seu corpo pode estar sob estresse ou fadiga acumulada. Monitore sinais de cansaço e considere reduzir o esforço.'
        });
      }
    }

    // RHR Elevada
    if (metrics.resting_heart_rate && metrics.resting_heart_rate > history.avgRHR + 5) {
      if (metrics.resting_heart_rate > history.avgRHR + 10) {
        alerts.push({
          level: 'CRITICAL',
          message: '🔴 Frequência cardíaca em repouso muito elevada: Pode indicar inflamação, doença ou exaustão. Priorize o repouso e observe se há outros sintomas.'
        });
      } else {
        alerts.push({
          level: 'WARNING',
          message: '🟡 Frequência cardíaca em repouso elevada: Indício de que seu corpo ainda está se recuperando. Reduza o ritmo hoje.'
        });
      }
    }

    // Sono Insuficiente
    if (metrics.total_sleep_duration && metrics.total_sleep_duration < goals.minSleepDurationThreshold) {
      alerts.push({
        level: 'CRITICAL',
        message: '🔴 Sono insuficiente detectado: Sua capacidade de recuperação está comprometida. Evite treinos de alta intensidade e priorize descanso extra.'
      });
    }

    // Eficiência do Sono
    if (metrics.sleep_efficiency && metrics.sleep_efficiency < goals.minSleepEfficiency) {
      alerts.push({
        level: 'INFO',
        message: 'ℹ️ Eficiência do sono abaixo do ideal: Seu sono foi interrompido ou superficial. Tente melhorar seu ambiente e rotina de sono.'
      });
    }

    // Estresse Alto
    if (metrics.stress_high_time && metrics.stress_high_time > 7200) {
      alerts.push({
        level: 'WARNING',
        message: '🟡 Alto nível de estresse detectado: Mais de 2 horas em estado de estresse alto. Considere técnicas de relaxamento e recuperação.'
      });
    }

    // Calcula confiança baseada no Readiness Score (que já engloba todas as métricas)
    const confidence = metrics.readiness_score !== null ? metrics.readiness_score : 50;

    return {
      trainingType,
      intensity,
      duration,
      recoveryScore,
      fatigueLevel,
      reason,
      alerts,
      confidence,
      emoji,
      priorityProtocols
    };
  }, [metrics, recentMetrics, history, goals]);
}
