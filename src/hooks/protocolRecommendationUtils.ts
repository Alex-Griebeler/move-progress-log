export interface ProtocolRecommendationLike {
  priority: "low" | "medium" | "high";
  recommended_date: string;
  created_at: string;
}

const PRIORITY_ORDER: Record<ProtocolRecommendationLike["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const compareProtocolRecommendations = (
  a: ProtocolRecommendationLike,
  b: ProtocolRecommendationLike
): number => {
  if (a.recommended_date !== b.recommended_date) {
    return a.recommended_date < b.recommended_date ? 1 : -1;
  }

  const orderA = PRIORITY_ORDER[a.priority] ?? PRIORITY_ORDER.low;
  const orderB = PRIORITY_ORDER[b.priority] ?? PRIORITY_ORDER.low;
  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.created_at < b.created_at ? 1 : -1;
};

export const sortProtocolRecommendations = (
  recommendations: ProtocolRecommendationLike[]
): ProtocolRecommendationLike[] => [...recommendations].sort(compareProtocolRecommendations);
