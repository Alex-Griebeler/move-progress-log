export const normalizeComparableText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

export const isEligibleStrengthCategory = (
  category: string | null | undefined
): boolean => {
  if (!category) return false;
  const normalized = normalizeComparableText(category);
  return normalized.includes("forca") || normalized.includes("hipertrofia");
};
