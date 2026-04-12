export interface ParsedErrorInfo {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

const getObjectString = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const pickString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
};

export const parseErrorInfo = (error: unknown): ParsedErrorInfo => {
  if (error instanceof Error) {
    const maybeRecord = error as Error & Record<string, unknown>;
    return {
      message: error.message || "Erro desconhecido",
      details: pickString(maybeRecord, "details"),
      hint: pickString(maybeRecord, "hint"),
      code: pickString(maybeRecord, "code"),
    };
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;

    const message =
      pickString(record, "message") ||
      pickString(record, "error_description") ||
      pickString(record, "error") ||
      "Erro desconhecido";

    return {
      message,
      details: pickString(record, "details"),
      hint: pickString(record, "hint"),
      code: pickString(record, "code"),
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: getObjectString(error),
  };
};

export const buildErrorDescription = (error: unknown, fallback?: string): string => {
  const info = parseErrorInfo(error);
  const description = [info.message, info.details, info.hint]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" | ");
  return description || fallback || "Erro desconhecido";
};
