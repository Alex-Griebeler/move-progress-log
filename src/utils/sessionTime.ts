export const formatSessionTime = (timeValue: string | null | undefined): string => {
  if (!timeValue) return "--:--";

  const normalized = String(timeValue).trim();
  if (!normalized) return "--:--";

  const hhmmssMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmmssMatch) {
    const hours = Number(hhmmssMatch[1]);
    const minutes = Number(hhmmssMatch[2]);
    if (Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  const maybeDate = new Date(normalized);
  if (!Number.isNaN(maybeDate.getTime())) {
    return `${String(maybeDate.getHours()).padStart(2, "0")}:${String(maybeDate.getMinutes()).padStart(2, "0")}`;
  }

  return normalized.slice(0, 5);
};
