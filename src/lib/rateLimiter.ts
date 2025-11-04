import { supabase } from "@/integrations/supabase/client";

export type RateLimitAction = 'login' | 'signup' | 'reset_password' | 'verify_email';

export interface RateLimitResult {
  allowed: boolean;
  blocked: boolean;
  blockedUntil?: string;
  minutesRemaining?: number;
  remainingAttempts?: number;
  maxAttempts?: number;
  message?: string;
}

/**
 * Get client IP address from various headers
 */
export async function getClientIP(): Promise<string> {
  // Try to get real IP from various sources
  // Note: In production, you'd use server-side detection
  // For now, we'll use a fingerprint-like approach
  
  try {
    // Try to get public IP from external service
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.warn('[Rate Limit] Failed to get IP, using fallback');
    // Fallback to a browser fingerprint
    return generateBrowserFingerprint();
  }
}

/**
 * Generate a simple browser fingerprint as fallback
 */
function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `fp_${Math.abs(hash).toString(36)}`;
}

/**
 * Check if action is rate limited
 */
export async function checkRateLimit(
  action: RateLimitAction,
  increment = false
): Promise<RateLimitResult> {
  try {
    const ipAddress = await getClientIP();
    
    console.log(`[Rate Limit] Checking ${action} for IP: ${ipAddress}`);

    const { data, error } = await supabase.functions.invoke('check-rate-limit', {
      body: {
        ip_address: ipAddress,
        action,
        increment,
      },
    });

    if (error) {
      console.error('[Rate Limit] Error:', error);
      // On error, allow the action (fail-open for better UX)
      return {
        allowed: true,
        blocked: false,
      };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error('[Rate Limit] Exception:', error);
    // On exception, allow the action (fail-open)
    return {
      allowed: true,
      blocked: false,
    };
  }
}

/**
 * Record a failed attempt
 */
export async function recordFailedAttempt(action: RateLimitAction): Promise<void> {
  try {
    await checkRateLimit(action, true);
  } catch (error) {
    console.error('[Rate Limit] Failed to record attempt:', error);
  }
}
