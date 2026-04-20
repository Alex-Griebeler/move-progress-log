import { describe, expect, it } from "vitest";
import { formatSessionTime } from "@/utils/sessionTime";

describe("formatSessionTime", () => {
  it("formats HH:mm:ss to HH:mm", () => {
    expect(formatSessionTime("04:53:00")).toBe("04:53");
  });

  it("pads one-digit hour", () => {
    expect(formatSessionTime("4:05")).toBe("04:05");
  });

  it("supports HH:mm:ss with timezone suffix", () => {
    expect(formatSessionTime("04:53:00Z")).toBe("04:53");
  });

  it("returns fallback when value is empty", () => {
    expect(formatSessionTime("")).toBe("--:--");
  });

  it("returns fallback when value is null", () => {
    expect(formatSessionTime(null)).toBe("--:--");
  });

  it("returns fallback for invalid time string", () => {
    expect(formatSessionTime("invalid-time")).toBe("--:--");
  });
});
