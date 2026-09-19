import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge precisa conhecer a escala tipográfica própria do
 * tailwind.config.ts; sem isso ele trata `text-h1`, `text-caption` etc. como
 * COR e descarta um dos dois quando vêm junto de `text-muted-foreground`
 * (revisão da #367: números dos indicadores da home saíam em 16px).
 * Manter em sincronia com theme.extend.fontSize.
 */
export const CUSTOM_FONT_SIZES = [
  "2xs",
  "display",
  "h1",
  "h2",
  "h3",
  "body-lg",
  "body",
  "body-sm",
  "caption",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...CUSTOM_FONT_SIZES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
