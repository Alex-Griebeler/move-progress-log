import { describe, expect, it } from "vitest";
import { buildErrorDescription, parseErrorInfo } from "../errorParsing";

describe("errorParsing", () => {
  it("parses Error instances with additional fields", () => {
    const error = Object.assign(new Error("Base message"), {
      details: "Detail info",
      hint: "Hint info",
      code: "23505",
    });

    const parsed = parseErrorInfo(error);
    expect(parsed).toEqual({
      message: "Base message",
      details: "Detail info",
      hint: "Hint info",
      code: "23505",
    });
  });

  it("parses plain object errors", () => {
    const parsed = parseErrorInfo({
      message: "RPC failed",
      details: "duplicate key",
      code: "23505",
    });

    expect(parsed.message).toBe("RPC failed");
    expect(parsed.details).toBe("duplicate key");
    expect(parsed.code).toBe("23505");
  });

  it("builds a readable description", () => {
    const description = buildErrorDescription({
      message: "Falha",
      details: "Constraint X",
      hint: "Verifique Y",
    });

    expect(description).toBe("Falha | Constraint X | Verifique Y");
  });
});
