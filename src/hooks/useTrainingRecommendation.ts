import { useMemo } from "react";
import { OuraMetrics } from "./useOuraMetrics";
import { OuraBaseline } from "./useOuraBaseline";
import { OuraAcuteMetrics } from "./useOuraAcuteMetrics";

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

interface UserGoals {
  minSleepDurationThreshold: number;
  minSleepEfficiency: number;
  highFatigueThreshold: number;
  moderateFatigueThreshold: number;
}

const DEFAULT_GOALS: UserGoals = {
  minSleepDurationThreshold: 23400,
  minSleepEfficiency: 85,
  highFatigueThreshold: 10000,
  moderateFatigueThreshold: 7000,
};

/**
 * MEL-IA-001: Usa baseline dinâmico do aluno (via useOuraBaseline) em vez de defaults hardcoded.
 * O parâmetro `baseline` vem do hook useOuraBaseline e já inclui fallback automático.
 */
export function useTrainingRecommendation(
  metrics: OuraMetrics | null,
  recentMetrics: OuraMetrics[] = [],
  baseline?: OuraBaseline,
  userGoals?: Partial<UserGoals>,
  acuteMetrics?: OuraAcuteMetrics | null
): TrainingRecommendation | null {
  return useMemo(() => {
    if (!metrics) return null;

    // Fallback defaults caso baseline não seja fornecido
    const effectiveBaseline = baseline ?? {
      avgHRV: 65,
      avgRHR: 60,
      avgSleepScore: 75,
      dataPoints: 0,
      hasMinimumData: false,
    };
    const goals = { ...DEFAULT_GOALS, ...userGoals };

    const alerts: TrainingRecommendation['alerts'] = [];

    const hasMinimumHistory = recentMetrics.length >= 7;

    if (!hasMinimumHistory && recentMetrics.length > 0) {
      alerts.push({
        level: 'INFO',
        message: `ℹ️ Histórico em construção: Coletamos ${recentMetrics.length} dias de dados. Para recomendações mais precisas, aguarde pelo menos 7 dias de sincronização.`
      });
    }

    // Indicar se usando baseline real ou defaults
    if (!effectiveBaseline.hasMinimumData && effectiveBaseline.dataPoints > 0) {
      alerts.push({
        level: 'INFO',
        message: `ℹ️ Baseline em construção: ${effectiveBaseline.dataPoints} dias coletados. Usando valores de referência populacionais até atingir 7 dias.`
      });
    }

    // 1. AVALIAÇÃO DE RECUPERAÇÃO
    const recoveryScore = metrics.readiness_score || 50;

    // 2. FADIGA ACUMULADA
    const weeklyBurn = recentMetrics.reduce((sum, m) => sum + (m.active_calories || 0), 0);
    let fatigueLevel: 'low' | 'moderate' | 'high' = 'low';
    if (weeklyBurn > goals.highFatigueThreshold) fatigueLevel = 'high';
    else if (weeklyBurn > goals.moderateFatigueThreshold) fatigueLevel = 'moderate';

    // 3. DECISÃO PRINCIPAL
    let trainingType = '';
    let intensity = '';
    let duration = '';
    let reason = '';
    let emoji = '🟢';

    if (recoveryScore >= 85 && fatigueLevel === 'low') {
      trainingType = 'Máxima Performance / Desafio';
      intensity = 'ALTA (80-95% FCMáx)';
      duration = '45-60 minutos';
      reason = 'Excelente! Você está no auge. Oportunidade perfeita para desafios ou recordes pessoais (PRs).';
      emoji = '💚';
    } else if (recoveryScore >= 65 && fatigueLevel !== 'high') {
      trainingType = 'Treino Normal Completo';
      intensity = 'MODERADA-ALTA (70-85% FCMáx)';
      duration = '45-55 minutos';
      reason = 'Bom dia para treinar! Você está bem preparado para realizar o treino programado com confiança.';
      emoji = '🟢';
    } else if (recoveryScore >= 45) {
      trainingType = 'Treino Reduzido 20%';
      intensity = 'MODERADA (60-75% FCMáx)';
      duration = '35-45 minutos';
      reason = 'Dia moderado. Mantenha o treino programado, mas reduza volume e/ou intensidade em 20%.';
      emoji = '🟡';
    } else if (recoveryScore >= 25) {
      trainingType = 'Recuperação Ativa / Muito Leve';
      intensity = 'BAIXA (30-50% FCMáx)';
      duration = '20-30 minutos';
      reason = 'Dia de recuperação. Foco em atividades leves para restaurar o corpo sem estresse adicional.';
      emoji = '🟠';
    } else {
      trainingType = 'Descanso Completo / Repouso';
      intensity = 'MUITO BAIXA (0-20% FCMáx)';
      duration = 'Repouso total';
      reason = '⚠️ SITUAÇÃO CRÍTICA: Seu corpo precisa de recuperação urgente. Treino NÃO é recomendado hoje. Foque nos protocolos de recuperação.';
      emoji = '🔴';
    }

    // 3.1 PROTOCOLOS PRIORITÁRIOS PARA RS CRÍTICO
    let priorityProtocols: TrainingRecommendation['priorityProtocols'] = undefined;
    if (recoveryScore < 25) {
      priorityProtocols = [
        { order: 1, name: 'Contraste Térmico', duration: '15 minutos', timing: 'Pós-treino ou manhã', description: 'Alternância água quente/fria. Reduz inflamação e acelera recuperação muscular (efeitos mensuráveis em 24-48h).' },
        { order: 2, name: 'Crioterapia', duration: '10 minutos', timing: 'Após atividade física', description: 'Imersão em água fria. Reduz marcadores inflamatórios e acelera recuperação (efeitos em 24-72h).' },
        { order: 3, name: 'Coerência Cardíaca', duration: '10-15 minutos', timing: 'Ao acordar', description: 'Respiração 6 ciclos/min. Ativa sistema parassimpático e reduz cortisol imediatamente.' },
        { order: 4, name: 'Grounding', duration: '10 minutos', timing: 'Manhã', description: 'Contato descalço com superfície natural. Reduz cortisol e inflamação (efeitos mensuráveis em 24-72h).' },
      ];
    }

    // 4. ALERTAS — usando baseline dinâmico do aluno (MEL-IA-001)
    if (hasMinimumHistory && metrics.average_sleep_hrv && metrics.average_sleep_hrv < effectiveBaseline.avgHRV * 0.85) {
      if (metrics.average_sleep_hrv < effectiveBaseline.avgHRV * 0.70) {
        alerts.push({ level: 'CRITICAL', message: '🔴 HRV criticamente baixa: Sinal forte de fadiga extrema ou possível doença. Seu corpo precisa de descanso. Se persistir, procure orientação médica.' });
      } else {
        alerts.push({ level: 'WARNING', message: '🟡 HRV abaixo do normal: Seu corpo pode estar sob estresse ou fadiga acumulada. Monitore sinais de cansaço e considere reduzir o esforço.' });
      }
    }

    if (hasMinimumHistory && metrics.resting_heart_rate && metrics.resting_heart_rate > effectiveBaseline.avgRHR + 5) {
      if (metrics.resting_heart_rate > effectiveBaseline.avgRHR + 10) {
        alerts.push({ level: 'CRITICAL', message: '🔴 Frequência cardíaca em repouso muito elevada: Pode indicar inflamação, doença ou exaustão. Priorize o repouso e observe se há outros sintomas.' });
      } else {
        alerts.push({ level: 'WARNING', message: '🟡 Frequência cardíaca em repouso elevada: Indício de que seu corpo ainda está se recuperando. Reduza o ritmo hoje.' });
      }
    }

    if (metrics.total_sleep_duration && metrics.total_sleep_duration < goals.minSleepDurationThreshold) {
      alerts.push({ level: 'CRITICAL', message: '🔴 Sono insuficiente detectado: Sua capacidade de recuperação está comprometida. Evite treinos de alta intensidade e priorize descanso extra.' });
    }

    if (metrics.sleep_efficiency && metrics.sleep_efficiency < goals.minSleepEfficiency) {
      alerts.push({ level: 'INFO', message: 'ℹ️ Eficiência do sono abaixo do ideal: Seu sono foi interrompido ou superficial. Tente melhorar seu ambiente e rotina de sono.' });
    }

    if (metrics.stress_high_time && metrics.stress_high_time > 7200) {
      alerts.push({ level: 'WARNING', message: '🟡 Alto nível de estresse detectado: Mais de 2 horas em estado de estresse alto. Considere técnicas de relaxamento e recuperação.' });
    }

    // 5. ALERTAS AGUDOS (intra-noite / intra-dia)
    if (hasMinimumHistory && acuteMetrics?.samples_count_hrv > 0) {
      const baselineHrv = effectiveBaseline.avgHRV;
      const hrvLast = acuteMetrics.hrv_night_last;
      const hrvMin = acuteMetrics.hrv_night_min;

      if (typeof hrvLast === "number" && hrvLast < baselineHrv * 0.7) {
        alerts.push({
          level: 'CRITICAL',
          message: `🔴 HRV aguda noturna muito baixa (último bloco: ${hrvLast.toFixed(1)} ms). Forte indicação de baixa recuperação hoje.`,
        });
      } else if (typeof hrvLast === "number" && hrvLast < baselineHrv * 0.85) {
        alerts.push({
          level: 'WARNING',
          message: `🟡 HRV aguda abaixo do basal (último bloco: ${hrvLast.toFixed(1)} ms). Considere reduzir carga e monitorar resposta.`,
        });
      }

      if (typeof hrvMin === "number" && hrvMin < baselineHrv * 0.55) {
        alerts.push({
          level: 'WARNING',
          message: `🟡 Queda acentuada de HRV durante a noite (mínimo: ${hrvMin.toFixed(1)} ms). Evite sessão de alta intensidade hoje.`,
        });
      }
    }

    if (hasMinimumHistory && acuteMetrics?.samples_count_hr_day > 0) {
      const hrDayMax = acuteMetrics.hr_day_max;
      const hrDayAvg = acuteMetrics.hr_day_avg;
      const restingHr = metrics.resting_heart_rate;

      if (typeof hrDayMax === "number" && typeof restingHr === "number" && hrDayMax > restingHr + 55) {
        alerts.push({
          level: 'INFO',
          message: `ℹ️ Pico de FC do dia elevado (${hrDayMax} bpm). Contextualize com estresse/sono e ajuste o aquecimento.`,
        });
      }

      if (typeof hrDayAvg === "number" && typeof restingHr === "number" && hrDayAvg > restingHr + 18) {
        alerts.push({
          level: 'WARNING',
          message: `🟡 FC média diária acima do esperado (${hrDayAvg.toFixed(0)} bpm). Priorize controle de intensidade na sessão.`,
        });
      }
    }

    const confidence = metrics.readiness_score !== null ? metrics.readiness_score : 50;

    return {
      trainingType, intensity, duration, recoveryScore, fatigueLevel,
      reason, alerts, confidence, emoji, priorityProtocols,
    };
  }, [metrics, recentMetrics, baseline, userGoals, acuteMetrics]);
}
