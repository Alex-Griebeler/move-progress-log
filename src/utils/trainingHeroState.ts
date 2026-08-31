/**
 * Máquina de estados VISUAL do hero de treino (spec v5.1-3 + v7.1/v7.2 com
 * GO): torna a precedência de composição testável em Node — o dashboard
 * decide o que renderizar por AQUI, nunca por inferência de zona espalhada.
 *
 * Zero semântica clínica: os inputs já vêm decididos (motor/funil/hooks);
 * isto só ordena a APRESENTAÇÃO. Cutover do consumo acontece na PR-B2.
 *
 * Precedência (fixa, testada caso a caso):
 *   loading → erro total → sem snapshot → snapshot sem recomendação →
 *   erro parcial → check-in pendente (fluxo em dois tempos) →
 *   zona 0 com protocolos → zona 0 sem protocolos → multi-vigente → normal.
 *
 * Check-in "skipped" compõe como "done" (a conduta objetiva é revelada); a
 * diferença é só a linha colapsada ("Check-in: não realizado · Fazer"), que é
 * conteúdo do chamador. Sinais críticos são do card/bloco de alertas e
 * aparecem DESDE a chegada (decisão 5, "ok") — não passam por esta máquina.
 */

export type CheckInState = "pending" | "done" | "skipped";

/**
 * Transição REAL da máquina do check-in (review PR-B1, achado 4): o estado
 * lembrado só vale enquanto o fingerprint da recomendação E o dia SP não
 * mudarem — qualquer divergência DESTRÓI (volta a "pending"; nada de
 * ressurreição A→B→A, coerente com v6.1-M8). Whoop fresh→stale muda o
 * fingerprint → skip/done morrem sozinhos. É este resolver que a PR-B2
 * consome; o seletor visual abaixo só compõe o resultado.
 */
export interface StoredCheckIn {
  state: Exclude<CheckInState, "pending">;
  conductFingerprint: string;
  spDay: string;
}

export const resolveCheckInState = (
  stored: StoredCheckIn | null,
  currentFingerprint: string | null,
  todaySpDay: string,
): CheckInState => {
  if (!stored) return "pending";
  if (currentFingerprint === null) return "pending";
  if (stored.conductFingerprint !== currentFingerprint) return "pending";
  if (stored.spDay !== todaySpDay) return "pending";
  return stored.state;
};

export interface HeroStateInput {
  /** Consultas de wearable ainda resolvendo (gate de loading total). */
  loading: boolean;
  /** Erro total: nenhuma fonte utilizável E erro nas consultas. */
  totalError: boolean;
  /** Existe snapshot utilizável ({source, date, score}). */
  hasSnapshot: boolean;
  /** Snapshot presente E recomendação acionável construída. */
  hasRecommendation: boolean;
  /** conduct.suspended === "error" (fonte pode estar errada — nada acionável). */
  partialError: boolean;
  checkIn: CheckInState;
  /** Zona EFETIVA da conduta (pós-funil); null quando não há conduta. */
  effectiveZone: 0 | 1 | 2 | 3 | 4 | null;
  /** Recomendação-base trouxe priorityProtocols (base zona 0). */
  hasPriorityProtocols: boolean;
  /** selection_required sem escolha feita (multi-vigente). */
  multiVigentePending: boolean;
  /** Modo sem dispositivo (v7.2-B2: conexões resolvidas ok, sem Oura, sem
   *  Whoop, sem snapshot). A conduta vem das bandas do PSR. */
  psrOnlyMode: boolean;
}

export type HeroComposition =
  | "loading"
  | "error_total"
  | "empty"
  | "score_no_recommendation"
  | "partial_error"
  | "arrival"
  | "recovery_block"
  | "rest_day"
  | "selection_required"
  | "normal"
  /** Skip SEM dispositivo (v7.2-M6): sem conduta e sem cargas; Iniciar
   *  disponível com onStartTraining(null) — sessão livre, fail-honest. */
  | "free_session";

export type HeroPrimaryAction =
  | "none"
  | "register_checkin"
  | "register_rest"
  | "start_disabled"
  | "start";

export interface HeroState {
  composition: HeroComposition;
  primaryAction: HeroPrimaryAction;
  /** Conduta (frase) visível — só pós check-in/skip e sem suspensão. */
  showConduct: boolean;
  /** Seção de cargas visível (depende da conduta — nunca antes dela). */
  showLoads: boolean;
  /** Formulário do check-in (PSR) aberto. */
  showCheckInForm: boolean;
}

export const deriveTrainingHeroState = (input: HeroStateInput): HeroState => {
  const closed = (composition: HeroComposition): HeroState => ({
    composition,
    primaryAction: "none",
    showConduct: false,
    showLoads: false,
    showCheckInForm: false,
  });

  if (input.loading) return closed("loading");
  if (input.totalError) return closed("error_total");
  // Modo PSR-only (v7.2): sem snapshot NÃO é beco — o check-in é o dado.
  if (!input.hasSnapshot && !input.psrOnlyMode) return closed("empty");
  if (input.psrOnlyMode && input.checkIn === "skipped") {
    // v7.2-M6: sem aparelho E sem check-in = sem dado nenhum → sessão livre.
    return {
      composition: "free_session",
      primaryAction: "start",
      showConduct: false,
      showLoads: false,
      showCheckInForm: false,
    };
  }
  if (!input.psrOnlyMode && !input.hasRecommendation) {
    return closed("score_no_recommendation");
  }
  if (input.partialError) return closed("partial_error");

  if (input.checkIn === "pending") {
    return {
      composition: "arrival",
      primaryAction: "register_checkin",
      showConduct: false,
      showLoads: false,
      showCheckInForm: true,
    };
  }

  // done | skipped: conduta revelada.
  if (input.effectiveZone === 0) {
    return {
      composition: input.hasPriorityProtocols ? "recovery_block" : "rest_day",
      primaryAction: "register_rest",
      showConduct: true,
      showLoads: false,
      showCheckInForm: false,
    };
  }

  if (input.multiVigentePending) {
    return {
      composition: "selection_required",
      primaryAction: "start_disabled",
      showConduct: true,
      showLoads: true,
      showCheckInForm: false,
    };
  }

  return {
    composition: "normal",
    primaryAction: "start",
    showConduct: true,
    showLoads: true,
    showCheckInForm: false,
  };
};
