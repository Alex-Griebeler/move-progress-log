/**
 * Dicionário canônico de siglas dos nomes de exercícios (ratificado pelo dono
 * em 2026-07-14; fonte: Manual V14 §16 + migration + siglas novas Fabrik).
 * Fonte única para tooltip de expansão e legenda do modo TV. Para criar uma
 * sigla nova: adicionar UMA linha aqui (e espelhar no glossário do manual).
 */
export const EXERCISE_SIGLAS: Record<string, string> = {
  // equipamento
  BB: "barra",
  DB: "halter",
  KB: "kettlebell",
  "KB/DB": "kettlebell/halter",
  "DB/KB": "halter/kettlebell",
  SB: "super band",
  MB: "miniband",
  MEB: "medicine ball",
  PL: "polia",
  G7: "polia (alias legado)",
  FR: "foam roll",
  TRX: "fita de suspensão",
  ARG: "argolas",
  PC: "peso corporal",
  BCO: "banco",
  // posição
  AJ: "ajoelhado",
  SAJ: "semi-ajoelhado",
  DD: "decúbito dorsal",
  DV: "decúbito ventral",
  DL: "decúbito lateral",
  PE: "pés elevados",
  PFE: "pé da frente elevado",
  PTE: "pé de trás elevado",
  PTP: "pé de trás na parede",
  // execução
  ISO: "isométrico",
  EXC: "excêntrico",
  CC: "concêntrico",
  DNC: "dinâmico",
  ROT: "rotação",
  // lateralidade
  UNL: "unilateral",
  BI: "bilateral",
  ALT: "alternado",
  CNTL: "contralateral",
  IPSL: "ipsilateral",
  // anatomia
  ABD: "abdominal",
  "RI/RE": "rotação interna/externa",
  VMO: "vasto medial oblíquo",
  // componente
  LMF: "Liberação Miofascial",
  // acrônimos de exercício
  RDL: "romanian deadlift (terra romeno)",
  SLDL: "single-leg deadlift (terra unilateral)",
  TGU: "Turkish get-up",
  HSPU: "handstand push-up",
  CARs: "controlled articular rotations",
  "PAIL/RAIL": "progressive/regressive angular isometric loading",
  RKC: "Russian Kettlebell Challenge",
  // conectores (calibragem ratificada: com→c/, sem→s/)
  "c/": "com",
  "s/": "sem",
};

/**
 * Expande as siglas de um nome de exercício para o texto por extenso.
 * Casa token a token (separado por espaço), tolerando pontuação nas bordas
 * ("(DB)", "KB,", "2 KB/DB"). Retorna o próprio nome se nada expandir.
 */
export const expandExerciseName = (name: string): string =>
  name
    .split(" ")
    .map((token) => {
      const match = token.match(/^([([]*)(.+?)([)\],.:;]*)$/);
      if (!match) return token;
      const [, prefix, core, suffix] = match;
      const expansion = EXERCISE_SIGLAS[core];
      return expansion ? `${prefix}${expansion}${suffix}` : token;
    })
    .join(" ");

/** Siglas presentes num conjunto de nomes (para a legenda do modo TV). */
export const siglasInNames = (names: string[]): Array<[string, string]> => {
  const found = new Set<string>();
  for (const name of names) {
    for (const token of name.split(" ")) {
      const core = token.replace(/^[([]+/, "").replace(/[)\],.:;]+$/, "");
      // conectores (c/, s/) não entram na legenda — são óbvios no contexto
      if (core !== "c/" && core !== "s/" && EXERCISE_SIGLAS[core]) found.add(core);
    }
  }
  return [...found].sort().map((s) => [s, EXERCISE_SIGLAS[s]]);
};
