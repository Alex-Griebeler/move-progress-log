import { describe, expect, it } from "vitest";
import {
  compareProtocolRecommendations,
  sortProtocolRecommendations,
  type ProtocolRecommendationLike,
} from "../protocolRecommendationUtils";

const rec = (
  priority: ProtocolRecommendationLike["priority"],
  recommendedDate: string,
  createdAt: string
): ProtocolRecommendationLike => ({
  priority,
  recommended_date: recommendedDate,
  created_at: createdAt,
});

describe("protocolRecommendationUtils", () => {
  it("orders by date desc first", () => {
    const sorted = sortProtocolRecommendations([
      rec("high", "2026-04-10", "2026-04-10T08:00:00.000Z"),
      rec("low", "2026-04-11", "2026-04-11T08:00:00.000Z"),
    ]);

    expect(sorted[0].recommended_date).toBe("2026-04-11");
  });

  it("orders priority high > medium > low for same date", () => {
    const sorted = sortProtocolRecommendations([
      rec("low", "2026-04-11", "2026-04-11T08:00:00.000Z"),
      rec("medium", "2026-04-11", "2026-04-11T08:01:00.000Z"),
      rec("high", "2026-04-11", "2026-04-11T08:02:00.000Z"),
    ]);

    expect(sorted.map((item) => item.priority)).toEqual(["high", "medium", "low"]);
  });

  it("falls back to created_at desc when date and priority match", () => {
    const a = rec("medium", "2026-04-11", "2026-04-11T07:00:00.000Z");
    const b = rec("medium", "2026-04-11", "2026-04-11T09:00:00.000Z");

    expect(compareProtocolRecommendations(a, b)).toBeGreaterThan(0);
    expect(compareProtocolRecommendations(b, a)).toBeLessThan(0);
  });
});
