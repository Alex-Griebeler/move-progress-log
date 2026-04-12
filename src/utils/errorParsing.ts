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

export const buildErrorDescription = (error: unknown): string => {
  const info = parseErrorInfo(error);
  return [info.message, info.details, info.hint].filter(Boolean).join(" | ");
};
