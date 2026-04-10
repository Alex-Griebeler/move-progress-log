type SpreadsheetCellObject = Record<string, unknown>;

export const normalizeHeader = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");
};

export const resolveCanonicalHeader = (header: string): string => {
  const normalized = normalizeHeader(header);

  if (["aluno", "nome", "nome aluno", "nome do aluno", "student", "atleta", "athlete"].includes(normalized)) {
    return "student";
  }
  if (["data", "date", "dia", "data treino", "data do treino"].includes(normalized)) {
    return "date";
  }
  if (["hora", "horario", "horario treino", "hora treino", "time"].includes(normalized)) {
    return "time";
  }
  if (
    [
      "exercicio",
      "exercise",
      "nome exercicio",
      "nome do exercicio",
      "exercicio nome",
      "movimento",
    ].includes(normalized)
  ) {
    return "exercise";
  }
  if (["series", "serie", "sets", "set"].includes(normalized)) {
    return "sets";
  }
  if (["reps", "repeticoes", "repeticao", "rep"].includes(normalized)) {
    return "reps";
  }
  if (["carga", "carga kg", "peso", "load", "kg"].includes(normalized)) {
    return "load";
  }
  if (["observacoes", "observacao", "obs", "notes", "note"].includes(normalized)) {
    return "notes";
  }

  return normalized;
};

export const extractCellValue = (value: unknown): unknown => {
  if (value instanceof Date) return value;
  if (typeof value !== "object" || value === null) return value;

  const record = value as SpreadsheetCellObject;

  if ("result" in record && record.result !== undefined && record.result !== null) {
    return record.result;
  }

  if ("text" in record && typeof record.text === "string") {
    return record.text;
  }

  if ("richText" in record && Array.isArray(record.richText)) {
    const text = (record.richText as Array<{ text?: string }>)
      .map((item) => item.text || "")
      .join("")
      .trim();
    if (text) return text;
  }

  return value;
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseAmPmTime = (input: string): string | null => {
  const match = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const parseExcelDate = (excelDate: unknown): string | null => {
  if (excelDate instanceof Date) {
    return Number.isNaN(excelDate.getTime()) ? null : formatDate(excelDate);
  }

  if (typeof excelDate === "string") {
    const value = excelDate.trim();
    const parts = value.includes("/") ? value.split("/") : value.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return value.slice(0, 10);
      }
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  if (typeof excelDate === "number") {
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  }

  return null;
};

export const parseTime = (timeValue: unknown): string => {
  if (timeValue instanceof Date) {
    const hours = String(timeValue.getHours()).padStart(2, "0");
    const minutes = String(timeValue.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  if (typeof timeValue === "string") {
    const normalized = timeValue.trim();
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
      return normalized.slice(0, 5);
    }
    const amPmParsed = parseAmPmTime(normalized);
    if (amPmParsed) return amPmParsed;
    return normalized;
  }
  if (typeof timeValue === "number") {
    const totalMinutes = Math.round(timeValue * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }
  return "12:00";
};
