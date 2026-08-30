/**
 * Estrutura e consolidação dos alertas fisiológicos (refinamento R1).
 *
 * O motor de recomendação produz alertas como texto pronto; a tela antiga
 * empilhava um card por alerta, competindo com a própria seção de fisiologia
 * que mostra as MESMAS métricas. Aqui cada alerta declara a que métrica
 * pertence, e a tela decide:
 *
 *  • alteração simples de uma métrica COM tile na tela → estado de atenção
 *    no próprio tile, nenhum card;
 *  • qualquer CRITICAL, 2+ sinais, ou sinal sem tile pra morar → UM card
 *    consolidado "Atenção hoje".
 *
 * Alertas OPERACIONAIS de onboarding (histórico/baseline em construção) não
 * são "atenção" — viram nota discreta e nunca disparam o card. O override
 * agudo é operacional mas MUDOU a recomendação do dia, então conta.
 */

export type AlertLevel = "INFO" | "WARNING" | "CRITICAL";

/** Métricas fisiológicas que podem ter tile na seção Fisiologia de hoje. */
export type AlertMetric =
  | "hrv_noturna"
  | "fc_repouso"
  | "sono"
  | "eficiencia_sono"
  | "estresse"
  | "hrv_aguda"
  | "fc_pico"
  | "fc_media_dia"
  | "strain";

/** "contextual" (R8d): sinal de CONTEXTO da decisão (strain do dia,
 *  freshness) — ancora no tile e só dispara o card "Atenção hoje" quando
 *  WARNING+; nunca reclassifica banda/score. */
export type AlertKind = "fisiologico" | "onboarding" | "override" | "contextual";

export interface StructuredAlert {
  level: AlertLevel;
  message: string;
  kind: AlertKind;
  /** null = alerta sem métrica correspondente (operacional). */
  metric: AlertMetric | null;
  /** Rótulo curto e ESPECÍFICO pro tile (ex.: "Duração insuficiente"). */
  shortLabel: string | null;
}

const SEVERITY_ORDER: Record<AlertLevel, number> = {
  CRITICAL: 2,
  WARNING: 1,
  INFO: 0,
};

/**
 * Remove o prefixo de emoji das mensagens do motor (🔴/🟡/ℹ️/⚠️…) —
 * apresentação sem emoji é contrato da ficha desde o PR-2; o ícone visual
 * vem do design system, com o nível semântico no lugar da cor do emoji.
 */
export const stripAlertEmoji = (message: string): string =>
  // Extended_Pictographic cobre ℹ/⚠/🔴/🟡/💚 etc.; o segundo grupo pega o
  // variation selector (️) e o ZWJ que acompanham alguns emojis.
  message.replace(/^(?:[\p{Extended_Pictographic}\uFE0F\u200D]+\s*)+/u, "");

export interface TileAlertSummary {
  /** Rótulo exibido no tile (do sinal mais severo). */
  label: string;
  level: AlertLevel;
  /** Quantos sinais além do exibido ("+N sinais"). */
  extraCount: number;
  /** Mensagens completas (sem emoji), pro nome acessível. */
  messages: string[];
}

export interface PartitionedAlerts {
  /** Sinais agregados por métrica, só pra tiles presentes na tela. */
  byTile: Map<AlertMetric, TileAlertSummary>;
  /** Sinais de atenção (fisiológicos + override), pro card consolidado. */
  attention: StructuredAlert[];
  /** true = renderizar o card "Atenção hoje". */
  showAttentionCard: boolean;
  /** Notas de onboarding (histórico/baseline) — linha discreta, nunca card. */
  onboardingNotes: string[];
}

/**
 * @param alerts Alertas estruturados do motor, na ordem em que foram gerados.
 * @param renderedTileMetrics Métricas que TÊM tile renderizado hoje — os
 *   tiles são condicionais à presença do dado, então a partição só pode ser
 *   calculada depois de montar a lista de tiles do dia.
 */
export const partitionAlerts = (
  alerts: StructuredAlert[],
  renderedTileMetrics: ReadonlySet<AlertMetric>,
): PartitionedAlerts => {
  const attention = alerts.filter((a) => a.kind !== "onboarding");
  const onboardingNotes = alerts
    .filter((a) => a.kind === "onboarding")
    .map((a) => stripAlertEmoji(a.message));

  const byTile = new Map<AlertMetric, TileAlertSummary>();
  for (const alert of attention) {
    if (alert.metric === null || !renderedTileMetrics.has(alert.metric)) continue;
    const existing = byTile.get(alert.metric);
    if (!existing) {
      byTile.set(alert.metric, {
        label: alert.shortLabel ?? stripAlertEmoji(alert.message),
        level: alert.level,
        extraCount: 0,
        messages: [stripAlertEmoji(alert.message)],
      });
    } else {
      // Mais de um sinal na mesma métrica: exibe o mais severo, conta o resto.
      existing.messages.push(stripAlertEmoji(alert.message));
      existing.extraCount += 1;
      if (SEVERITY_ORDER[alert.level] > SEVERITY_ORDER[existing.level]) {
        existing.level = alert.level;
        existing.label = alert.shortLabel ?? stripAlertEmoji(alert.message);
      }
    }
  }

  // Card consolidado: crítico sempre; 2+ sinais; ou sinal órfão de tile.
  // Contextual INFO fica só no tile — contexto informativo não é "atenção".
  const cardRelevant = attention.filter(
    (a) => !(a.kind === "contextual" && a.level === "INFO"),
  );
  const hasCritical = cardRelevant.some((a) => a.level === "CRITICAL");
  const hasOrphan = cardRelevant.some(
    (a) => a.metric === null || !renderedTileMetrics.has(a.metric),
  );
  const showAttentionCard =
    cardRelevant.length > 0 && (hasCritical || cardRelevant.length >= 2 || hasOrphan);

  return { byTile, attention, showAttentionCard, onboardingNotes };
};
