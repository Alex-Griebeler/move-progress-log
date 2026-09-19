import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { cn, CUSTOM_FONT_SIZES } from "../utils";

describe("cn — escala tipográfica própria (revisão da #367)", () => {
  it.each(CUSTOM_FONT_SIZES)("text-%s convive com cor (não é descartado)", (size) => {
    const out = cn(`text-${size}`, "text-muted-foreground").split(" ");
    expect(out).toContain(`text-${size}`);
    expect(out).toContain("text-muted-foreground");
  });

  it("tamanho próprio substitui o tamanho padrão da base (e vice-versa)", () => {
    expect(cn("text-xl font-semibold", "text-h1")).toBe("font-semibold text-h1");
    expect(cn("text-caption", "text-sm")).toBe("text-sm");
  });

  it("lista em sincronia com theme.extend.fontSize do tailwind.config.ts", () => {
    const cfg = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../../tailwind.config.ts"), "utf-8");
    const block = cfg.slice(cfg.indexOf("fontSize: {"));
    const defaults = new Set(["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"]);
    const keys = Array.from(block.slice(0, block.indexOf("\n      },")).matchAll(/'([a-z0-9-]+)':/g)).map((m) => m[1]);
    expect(keys.filter((k) => !defaults.has(k)).sort()).toEqual([...CUSTOM_FONT_SIZES].sort());
  });
});
