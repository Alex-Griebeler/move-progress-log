import { describe, expect, it } from "vitest";
import { resolvePreferredFrontendOrigin } from "../frontendOrigin";

describe("resolvePreferredFrontendOrigin", () => {
  it("converts id-preview origin to preview origin when only id-preview is available", () => {
    const value = resolvePreferredFrontendOrigin({
      currentOrigin: "https://id-preview--abc123.lovable.app",
      referrer: "",
      ancestorOrigins: [],
    });

    expect(value).toBe("https://preview--abc123.lovable.app");
  });

  it("prefers trusted non-id-preview origin over id-preview", () => {
    const value = resolvePreferredFrontendOrigin({
      currentOrigin: "https://id-preview--abc123.lovable.app",
      referrer: "https://preview--abc123.lovable.app/projects/xyz",
      ancestorOrigins: [],
    });

    expect(value).toBe("https://preview--abc123.lovable.app");
  });

  it("ignores lovable.dev editor origin and keeps trusted app origin", () => {
    const value = resolvePreferredFrontendOrigin({
      currentOrigin: "https://preview--abc123.lovable.app",
      referrer: "https://lovable.dev/projects/abc",
      ancestorOrigins: [],
    });

    expect(value).toBe("https://preview--abc123.lovable.app");
  });
});

