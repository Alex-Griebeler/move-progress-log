// Shared frontend-origin resolver for edge functions that emit URLs back
// to a third party (invite emails, OAuth redirects, etc).
//
// Hardening rules (mirror PRs #78 and #79):
//   1. PUBLIC_APP_URL (or APP_PUBLIC_URL) wins absolutely when set —
//      never overridden by request headers, body, or SITE_URL.
//   2. localhost / 127.0.0.1 are NEVER trusted in the automatic
//      fallback path. They only pass when the operator has explicitly
//      set PUBLIC_APP_URL/SITE_URL to a localhost host (rare, but
//      legitimate for local webhook testing).
//   3. id-preview--* origins are canonicalized to preview--*.
//   4. lovable.dev editor hosts are always rejected.
//
// Callers are expected to pass `additionalCandidate` (a single origin
// string) when they have one — typically the body's `frontend_origin`
// or a base64-decoded value from an OAuth `state`.
//
// Returns null when no trusted origin can be resolved. Callers MUST
// surface a 400 / explicit failure in that case rather than silently
// falling back to anything.

export const LOVABLE_PREVIEW_SUFFIX = '.lovable.app';
export const LOVABLE_ID_PREVIEW_PREFIX = 'id-preview--';
export const LOVABLE_EDITOR_HOSTS = new Set(['lovable.dev', 'www.lovable.dev']);

export function toOrigin(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).origin;
  } catch (_error) {
    return null;
  }
}

export function isIdPreviewOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return (
      host.startsWith(LOVABLE_ID_PREVIEW_PREFIX) &&
      host.endsWith(LOVABLE_PREVIEW_SUFFIX)
    );
  } catch (_error) {
    return false;
  }
}

export function toPreviewOrigin(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (
      !host.startsWith(LOVABLE_ID_PREVIEW_PREFIX) ||
      !host.endsWith(LOVABLE_PREVIEW_SUFFIX)
    ) {
      return origin;
    }
    const previewHost = host.replace(LOVABLE_ID_PREVIEW_PREFIX, 'preview--');
    return `${parsed.protocol}//${previewHost}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch (_error) {
    return null;
  }
}

export function isTrustedOrigin(
  origin: string,
  canonicalOrigin: string | null,
): boolean {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();

    if (LOVABLE_EDITOR_HOSTS.has(host)) {
      return false;
    }

    // Operator override: a canonical origin (PUBLIC_APP_URL / SITE_URL)
    // is always honored, even if it resolves to a dev host.
    if (canonicalOrigin && origin === canonicalOrigin) return true;

    // Automatic fallback: only Lovable preview hosts are trusted.
    // localhost/127.0.0.1 are unreachable from a third-party device, so
    // they MUST NOT win automatic resolution — even when the trainer is
    // testing from a Vite dev server inside the Lovable preview iframe
    // (where window.location.origin becomes http://localhost:5173).
    return host.endsWith(LOVABLE_PREVIEW_SUFFIX);
  } catch (_error) {
    return false;
  }
}

/**
 * Resolve the public frontend origin for a third-party-facing URL.
 *
 * @param req - The incoming Request (for headers).
 * @param additionalCandidate - Optional origin from body / OAuth state.
 *   Already decoded; pass `null` when not available.
 * @returns A trusted origin (no trailing slash) or `null` when no
 *   trusted candidate exists. Callers MUST treat `null` as a fatal
 *   configuration error, not a soft fallback.
 */
export function resolveFrontendUrl(
  req: Request,
  additionalCandidate: string | null,
): string | null {
  const publicAppOrigin = toOrigin(
    Deno.env.get('PUBLIC_APP_URL') ??
      Deno.env.get('APP_PUBLIC_URL') ??
      null,
  );
  // PUBLIC_APP_URL has absolute priority when configured. Guarantees
  // emitted URLs always point to the canonical public domain even when
  // the request originates from the editor preview or a localhost dev
  // server.
  if (publicAppOrigin) {
    return publicAppOrigin;
  }

  const siteUrlOrigin = toOrigin(Deno.env.get('SITE_URL') ?? null);
  const canonicalOrigin = siteUrlOrigin;

  const candidates = [
    toOrigin(additionalCandidate),
    siteUrlOrigin,
    toOrigin(req.headers.get('origin')),
    toOrigin(req.headers.get('referer')),
  ].filter((origin): origin is string => Boolean(origin));

  const uniqueOrigins = Array.from(new Set(candidates));
  const trustedOrigins = uniqueOrigins.filter((origin) =>
    isTrustedOrigin(origin, canonicalOrigin),
  );
  const normalizedTrustedOrigins = Array.from(
    new Set(
      trustedOrigins
        .map((origin) => toPreviewOrigin(origin))
        .filter((origin): origin is string => Boolean(origin)),
    ),
  );

  if (
    siteUrlOrigin &&
    normalizedTrustedOrigins.includes(siteUrlOrigin) &&
    !isIdPreviewOrigin(siteUrlOrigin)
  ) {
    return siteUrlOrigin;
  }

  const firstNonIdPreview = normalizedTrustedOrigins.find(
    (origin) => !isIdPreviewOrigin(origin),
  );
  if (firstNonIdPreview) {
    return firstNonIdPreview;
  }

  if (siteUrlOrigin && normalizedTrustedOrigins.includes(siteUrlOrigin)) {
    return siteUrlOrigin;
  }

  return normalizedTrustedOrigins[0] ?? null;
}
