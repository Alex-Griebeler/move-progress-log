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

    if (recoveryScore >= 80 && fatigueLevel === 'low') {
      trainingType = 'Treino Intenso (HIIT ou Força)';
      intensity = 'ALTA (80-90% FCMáx)';
      duration = '35-45 minutos';
      reason = 'Sua recuperação está excelente e a fadiga é baixa. Momento perfeito para um treino intenso!';
      emoji = '🟢';
    } else if (recoveryScore >= 65 && fatigueLevel !== 'high') {
      trainingType = 'Treino Moderado (Força ou Cardio)';
      intensity = 'MODERADA (70-80% FCMáx)';
      duration = '40-50 minutos';
      reason = 'Sua recuperação é boa. Um treino de intensidade moderada será eficaz e seguro.';
      emoji = '🟡';
    } else if (recoveryScore >= 50) {
      trainingType = 'Treino Leve (Cardio Leve ou Yoga)';
      intensity = 'BAIXA (60-70% FCMáx)';
      duration = '20-30 minutos';
      reason = 'Sua recuperação está em nível aceitável. Opte por um treino leve para auxiliar na recuperação.';
      emoji = '🟠';
    } else {
      trainingType = 'Descanso Ativo (Alongamento ou Yoga)';
      intensity = 'MUITO BAIXA (50-60% FCMáx)';
      duration = '15-20 minutos';
      reason = 'Sua recuperação está comprometida. Priorize o descanso ativo para evitar sobrecarga.';
      emoji = '🔴';
    }

    // 4. GERAR ALERTAS ESPECÍFICOS
    if (metrics.average_sleep_hrv && metrics.average_sleep_hrv < history.avgHRV * 0.85) {
      alerts.push({
        level: 'WARNING',
        message: 'HRV abaixo do normal. Possível overtraining ou estresse elevado. Considere reduzir a intensidade.'
      });
    }

    if (metrics.resting_heart_rate && metrics.resting_heart_rate > history.avgRHR + 5) {
      alerts.push({
        level: 'WARNING',
        message: 'Frequência cardíaca em repouso elevada. Indício de fadiga ou recuperação inadequada.'
      });
    }

    if (metrics.total_sleep_duration && metrics.total_sleep_duration < goals.minSleepDurationThreshold) {
      alerts.push({
        level: 'CRITICAL',
        message: 'Sono insuficiente. Evite treinos de alta intensidade hoje e priorize o descanso.'
      });
    }

    if (metrics.sleep_efficiency && metrics.sleep_efficiency < goals.minSleepEfficiency) {
      alerts.push({
        level: 'INFO',
        message: 'Eficiência do sono abaixo do ideal. Tente melhorar a qualidade do seu sono.'
      });
    }

    if (metrics.stress_high_time && metrics.stress_high_time > 7200) { // > 2h
      alerts.push({
        level: 'WARNING',
        message: 'Alto nível de estresse detectado. Considere técnicas de relaxamento e recuperação.'
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
      emoji
    };
  }, [metrics, recentMetrics, history, goals]);
}
