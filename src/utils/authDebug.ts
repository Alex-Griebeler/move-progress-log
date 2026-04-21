const isBrowser = typeof window !== "undefined";

export const isAuthDebugEnabled = (): boolean => {
  const rawEnvFlag = String(import.meta.env.VITE_ENABLE_AUTH_DEBUG ?? "").toLowerCase();
  const authDebugEnabledByEnv = rawEnvFlag === "1" || rawEnvFlag === "true";
  const authDebugEnabledByQuery =
    isBrowser && new URLSearchParams(window.location.search).get("authDebug") === "1";
  const isLocalhost = isBrowser && window.location.hostname === "localhost";

  return authDebugEnabledByEnv && import.meta.env.DEV && isLocalhost && authDebugEnabledByQuery;
};
