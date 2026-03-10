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
  const hasShorthand = /\b(cl|b\d|kb|^\d+x\d)/i.test(trimmed);
  if (!hasShorthand) return input;

  const parts: string[] = [];

  // Extract bar component: "b20" or "b15" (standalone or at end)
  let remaining = trimmed;
  const barMatch = remaining.match(/\bb(\d+(?:[.,]\d+)?)\b/i);
  let barPart = '';
  if (barMatch) {
    barPart = `barra ${barMatch[1].replace(',', '.')}kg`;
    remaining = remaining.replace(barMatch[0], '').trim();
  }

  // Extract "each side" components: "25lb+2cl" or "10cl"
  const eachSideMatch = remaining.match(/^(.+?)cl$/i);
  if (eachSideMatch) {
    const eachSideContent = eachSideMatch[1].trim();
    
    // Multiple components: "25lb+2" → "(25lb + 2kg) de cada lado"
    const components = eachSideContent.split(/[+]/).map(c => c.trim()).filter(Boolean);
    
    if (components.length > 1) {
      const expanded = components.map(c => {
        if (/lb$/i.test(c)) return c;
        if (/kg$/i.test(c)) return c;
        return `${c}kg`;
      }).join(' + ');
      parts.push(`(${expanded}) de cada lado`);
    } else {
      const comp = components[0];
      if (/lb$/i.test(comp)) {
        parts.push(`${comp} de cada lado`);
      } else {
        const val = comp.replace(/kg$/i, '');
        parts.push(`${val}kg de cada lado`);
      }
    }
    remaining = '';
  }

  // Extract kettlebell patterns: "2xKB24" or "KB 32"
  if (remaining) {
    const dualKbMatch = remaining.match(/^2\s*x\s*kb\s*(\d+(?:[.,]\d+)?)/i);
    const singleKbMatch = remaining.match(/^kb\s*(\d+(?:[.,]\d+)?)/i);
    const dualDumbbellMatch = remaining.match(/^2\s*x\s*(\d+(?:[.,]\d+)?)\s*$/i);

    if (dualKbMatch) {
      parts.push(`2 kettlebells ${dualKbMatch[1].replace(',', '.')}kg`);
      remaining = '';
    } else if (singleKbMatch) {
      parts.push(`kettlebell ${singleKbMatch[1].replace(',', '.')}kg`);
      remaining = '';
    } else if (dualDumbbellMatch) {
      parts.push(`2 halteres ${dualDumbbellMatch[1].replace(',', '.')}kg`);
      remaining = '';
    }
  }

  // If we parsed something, assemble the result
  if (parts.length > 0 || barPart) {
    const allParts = [...parts];
    if (barPart) allParts.push(barPart);
    return allParts.join(' + ');
  }

  // Fallback: return original input
  return input;
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
