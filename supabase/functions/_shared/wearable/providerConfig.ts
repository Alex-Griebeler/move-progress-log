// Per-provider constants for the shared wearable plumbing.
// Whoop v2 endpoints verified 2026-07-07 (developer.whoop.com). `offline` is
// REQUIRED in the authorize request to receive a refresh token.

export interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  apiBase: string;
  scopes: string[];
  secretEnv: { clientId: string; clientSecret: string };
}

export const WHOOP: ProviderConfig = {
  authorizeUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
  tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
  apiBase: "https://api.prod.whoop.com/developer",
  scopes: ["read:recovery", "read:sleep", "read:workout", "read:cycles", "read:profile", "offline"],
  secretEnv: { clientId: "WHOOP_CLIENT_ID", clientSecret: "WHOOP_CLIENT_SECRET" },
};
