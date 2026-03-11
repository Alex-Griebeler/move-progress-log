/**
 * Parser de atalhos de carga para entrada rápida
 * Traduz atalhos de digitação para o formato canônico suportado por calculateLoadFromBreakdown
 * 
 * NÃO altera a lógica de cálculo — apenas traduz aliases
 */

/**
 * Expande atalhos de carga para formato canônico
 * 
 * Atalhos suportados:
 * - "2x24"         → "2 halteres 24kg"
 * - "KB 32"        → "kettlebell 32kg"
 * - "2xKB24"       → "2 kettlebells 24kg"
 * - "10cl b15"     → "10kg de cada lado + barra 15kg"
 * - "25lb+2cl b15" → "(25lb + 2kg) de cada lado + barra 15kg"
 * - "PC"           → "peso corporal"
 * - "b20"          → "barra 20kg"
 * - "b"            → "barra" (sem peso especificado)
 * 
 * Se o input não corresponder a nenhum atalho, retorna o valor original
 */
export const expandLoadShorthand = (input: string): string => {
  if (!input || !input.trim()) return input;

  const trimmed = input.trim();

  // PC → peso corporal
  if (/^pc$/i.test(trimmed)) {
    return 'peso corporal';
  }

  // Check if it looks like a shorthand (contains shorthand markers)
  const hasShorthand = /cl(?:\s|$|\+)/i.test(trimmed) || /kb\d/i.test(trimmed) || /^\d+\s*x\s*\d/i.test(trimmed) || /\bb\d/i.test(trimmed) || /\d\s*b\s*$/i.test(trimmed);
  if (!hasShorthand) return input;

  // Split by "+" and parse each segment independently
  const segments = trimmed.split(/\s*\+\s*/);
  const expandedParts: string[] = [];

  for (const seg of segments) {
    const s = seg.trim();

    // "35lb cl" or "10cl" or "10 cl" → de cada lado
    const clMatch = s.match(/^(.+?)\s*cl$/i);
    if (clMatch) {
      const weightPart = clMatch[1].trim();
      // Multiple components separated by "+" already handled by outer split
      if (/lb$/i.test(weightPart)) {
        expandedParts.push(`${weightPart} de cada lado`);
      } else if (/kg$/i.test(weightPart)) {
        expandedParts.push(`${weightPart} de cada lado`);
      } else {
        expandedParts.push(`${weightPart}kg de cada lado`);
      }
      continue;
    }

    // "15kg b" or "20 b" → barra Xkg (number before standalone "b")
    const numBeforeBarMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*(?:kg\s+)?b$/i);
    if (numBeforeBarMatch) {
      expandedParts.push(`barra ${numBeforeBarMatch[1].replace(',', '.')}kg`);
      continue;
    }

    // "b20" or "b15" → barra Xkg (standalone b followed by number)
    const barMatch = s.match(/^b(\d+(?:[.,]\d+)?)$/i);
    if (barMatch) {
      expandedParts.push(`barra ${barMatch[1].replace(',', '.')}kg`);
      continue;
    }

    // "2xKB24" → 2 kettlebells 24kg
    const dualKbMatch = s.match(/^2\s*x\s*kb\s*(\d+(?:[.,]\d+)?)/i);
    if (dualKbMatch) {
      expandedParts.push(`2 kettlebells ${dualKbMatch[1].replace(',', '.')}kg`);
      continue;
    }

    // "KB32" → kettlebell 32kg
    const singleKbMatch = s.match(/^kb\s*(\d+(?:[.,]\d+)?)/i);
    if (singleKbMatch) {
      expandedParts.push(`kettlebell ${singleKbMatch[1].replace(',', '.')}kg`);
      continue;
    }

    // "2x24" → 2 halteres 24kg
    const dualDumbbellMatch = s.match(/^2\s*x\s*(\d+(?:[.,]\d+)?)\s*$/i);
    if (dualDumbbellMatch) {
      expandedParts.push(`2 halteres ${dualDumbbellMatch[1].replace(',', '.')}kg`);
      continue;
    }

    // No match — keep original segment
    expandedParts.push(s);
  }

  return expandedParts.join(' + ');
};

/**
 * Comprime formato canônico de volta para atalho abreviado
 * Inversa do expandLoadShorthand — usado para exibição compacta
 * 
 * Se não reconhecer o padrão, retorna o original (passthrough seguro)
 */
export const compressLoadShorthand = (input: string): string => {
  if (!input || !input.trim()) return input;

  const trimmed = input.trim().toLowerCase();

  // peso corporal → PC
  if (trimmed === 'peso corporal') return 'PC';

  // barra Xkg (standalone) → bX
  const standaloneBarMatch = trimmed.match(/^barra\s+(\d+(?:\.\d+)?)kg$/);
  if (standaloneBarMatch) return `b${standaloneBarMatch[1]}`;

  // Split by " + " to handle compound loads
  const segments = input.trim().split(/\s*\+\s*/);
  const compressedParts: string[] = [];
  
  for (const segment of segments) {
    const seg = segment.trim();
    const segLower = seg.toLowerCase();

    // 2 kettlebells Xkg → 2xKBX
    const dualKbMatch = segLower.match(/^2\s+kettlebells?\s+(\d+(?:\.\d+)?)kg$/);
    if (dualKbMatch) { compressedParts.push(`2xKB${dualKbMatch[1]}`); continue; }

    // kettlebell Xkg → KBX
    const singleKbMatch = segLower.match(/^kettlebell\s+(\d+(?:\.\d+)?)kg$/);
    if (singleKbMatch) { compressedParts.push(`KB${singleKbMatch[1]}`); continue; }

    // 2 halteres Xkg → 2xX
    const dualDbMatch = segLower.match(/^2\s+halteres?\s+(\d+(?:\.\d+)?)kg$/);
    if (dualDbMatch) { compressedParts.push(`2x${dualDbMatch[1]}`); continue; }

    // Xkg de cada lado → Xcl
    const eachSideMatch = segLower.match(/^(\d+(?:\.\d+)?)kg\s+de\s+cada\s+lado$/);
    if (eachSideMatch) { compressedParts.push(`${eachSideMatch[1]}cl`); continue; }

    // (Xkg + Ykg) de cada lado → X+Ycl
    const compoundSideMatch = segLower.match(/^\((.+?)\)\s+de\s+cada\s+lado$/);
    if (compoundSideMatch) {
      const inner = compoundSideMatch[1].split(/\s*\+\s*/).map(c => c.trim().replace(/kg$/, '')).join('+');
      compressedParts.push(`${inner}cl`);
      continue;
    }

    // barra Xkg → bX
    const barMatch = segLower.match(/^barra\s+(\d+(?:\.\d+)?)kg$/);
    if (barMatch) { compressedParts.push(`b${barMatch[1]}`); continue; }

    // No match — return original input entirely
    return input;
  }

  return compressedParts.join(' ');
};
