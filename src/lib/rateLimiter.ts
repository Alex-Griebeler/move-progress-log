import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

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
 * Check if action is rate limited
 * IP is now extracted server-side — no client-side IP needed
 */
export async function checkRateLimit(
  action: RateLimitAction,
  increment = false
): Promise<RateLimitResult> {
  try {
    logger.log(`[Rate Limit] Checking ${action}`);

    const { data, error } = await supabase.functions.invoke('check-rate-limit', {
      body: {
        action,
        increment,
      },
    });

    if (error) {
      logger.error('[Rate Limit] Error:', error);
      // On error, allow the action (fail-open for better UX)
      return {
        allowed: true,
        blocked: false,
      };
    }

    return data as RateLimitResult;
  } catch (error) {
    logger.error('[Rate Limit] Exception:', error);
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
    logger.error('[Rate Limit] Failed to record attempt:', error);
  }
}
