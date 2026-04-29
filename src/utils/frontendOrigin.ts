const LOVABLE_SUFFIX = ".lovable.app";
const ID_PREVIEW_PREFIX = "id-preview--";
const PREVIEW_PREFIX = "preview--";
const EDITOR_HOSTS = new Set(["lovable.dev", "www.lovable.dev"]);

const toOrigin = (rawUrl: string | null | undefined): string | null => {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
};

const isTrustedOrigin = (origin: string): boolean => {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (EDITOR_HOSTS.has(host)) return false;
    return (
      host.endsWith(LOVABLE_SUFFIX) ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
};

const isIdPreviewOrigin = (origin: string): boolean => {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host.startsWith(ID_PREVIEW_PREFIX) && host.endsWith(LOVABLE_SUFFIX);
  } catch {
    return false;
  }
};

const toCanonicalPreviewOrigin = (origin: string): string => {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (!host.startsWith(ID_PREVIEW_PREFIX) || !host.endsWith(LOVABLE_SUFFIX)) {
      return origin;
    }

    const canonicalHost = `${PREVIEW_PREFIX}${host.slice(ID_PREVIEW_PREFIX.length)}`;
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${canonicalHost}${port}`;
  } catch {
    return origin;
  }
};

export interface FrontendOriginContext {
  currentOrigin?: string | null;
  referrer?: string | null;
  ancestorOrigins?: string[];
}

export const resolvePreferredFrontendOrigin = ({
  currentOrigin,
  referrer,
  ancestorOrigins = [],
}: FrontendOriginContext): string => {
  const candidates: string[] = [];
  const directOrigin = toOrigin(currentOrigin);
  if (directOrigin) candidates.push(directOrigin);

  const referrerOrigin = toOrigin(referrer);
  if (referrerOrigin) candidates.push(referrerOrigin);

  for (const rawOrigin of ancestorOrigins) {
    const origin = toOrigin(rawOrigin);
    if (origin) candidates.push(origin);
  }

  const trusted = Array.from(new Set(candidates)).filter(isTrustedOrigin);
  const nonIdPreview = trusted.find((origin) => !isIdPreviewOrigin(origin));
  if (nonIdPreview) return nonIdPreview;

  const idPreview = trusted.find((origin) => isIdPreviewOrigin(origin));
  if (idPreview) return toCanonicalPreviewOrigin(idPreview);

  return directOrigin ?? "";
};

export const getPreferredFrontendOrigin = (): string => {
  if (typeof window === "undefined") return "";

  const ancestorOrigins = window.location.ancestorOrigins
    ? Array.from(window.location.ancestorOrigins)
    : [];

  return resolvePreferredFrontendOrigin({
    currentOrigin: window.location.origin,
    referrer: document.referrer,
    ancestorOrigins,
  });
};
