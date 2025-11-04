import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockDurationMinutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMinutes: 15, blockDurationMinutes: 15 },
  signup: { maxAttempts: 3, windowMinutes: 60, blockDurationMinutes: 60 },
  reset_password: { maxAttempts: 5, windowMinutes: 60, blockDurationMinutes: 30 },
  verify_email: { maxAttempts: 10, windowMinutes: 60, blockDurationMinutes: 15 },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { ip_address, action, increment = false } = await req.json();

    if (!ip_address || !action) {
      throw new Error("Missing required parameters: ip_address and action");
    }

    const config = RATE_LIMITS[action];
    if (!config) {
      throw new Error(`Invalid action: ${action}`);
    }

    console.log(`[Rate Limit] Checking: ${action} from IP ${ip_address}`);

    // Get or create rate limit record
    const { data: existingAttempt, error: fetchError } = await supabase
      .from("rate_limit_attempts")
      .select("*")
      .eq("ip_address", ip_address)
      .eq("action", action)
      .maybeSingle();

    if (fetchError) {
      console.error("[Rate Limit] Fetch error:", fetchError);
      throw fetchError;
    }

    const now = new Date();

    // If exists and blocked, check if still blocked
    if (existingAttempt?.blocked_until) {
      const blockedUntil = new Date(existingAttempt.blocked_until);
      if (blockedUntil > now) {
        const minutesRemaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000);
        console.log(`[Rate Limit] IP ${ip_address} blocked for ${minutesRemaining} more minutes`);
        
        return new Response(
          JSON.stringify({
            allowed: false,
            blocked: true,
            blockedUntil: blockedUntil.toISOString(),
            minutesRemaining,
            message: `Muitas tentativas. Tente novamente em ${minutesRemaining} minuto${minutesRemaining > 1 ? 's' : ''}`,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Check if window expired (reset counter)
    let shouldReset = false;
    if (existingAttempt) {
      const firstAttempt = new Date(existingAttempt.first_attempt_at);
      const windowExpired = (now.getTime() - firstAttempt.getTime()) / 60000 > config.windowMinutes;
      
      if (windowExpired) {
        shouldReset = true;
        console.log(`[Rate Limit] Window expired for ${ip_address}, resetting counter`);
      }
    }

    // Calculate new attempt count
    let newAttemptCount = 1;
    if (existingAttempt && !shouldReset && increment) {
      newAttemptCount = existingAttempt.attempt_count + 1;
    } else if (existingAttempt && !shouldReset && !increment) {
      newAttemptCount = existingAttempt.attempt_count;
    }

    // Check if should block
    const shouldBlock = newAttemptCount >= config.maxAttempts;
    const blockedUntil = shouldBlock
      ? new Date(now.getTime() + config.blockDurationMinutes * 60000)
      : null;

    // Update or insert record
    if (increment) {
      const updateData = shouldReset
        ? {
            attempt_count: 1,
            first_attempt_at: now.toISOString(),
            last_attempt_at: now.toISOString(),
            blocked_until: null,
          }
        : {
            attempt_count: newAttemptCount,
            last_attempt_at: now.toISOString(),
            blocked_until: blockedUntil?.toISOString() || null,
          };

      if (existingAttempt) {
        const { error: updateError } = await supabase
          .from("rate_limit_attempts")
          .update(updateData)
          .eq("id", existingAttempt.id);

        if (updateError) {
          console.error("[Rate Limit] Update error:", updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("rate_limit_attempts")
          .insert({
            ip_address,
            action,
            ...updateData,
          });

        if (insertError) {
          console.error("[Rate Limit] Insert error:", insertError);
          throw insertError;
        }
      }
    }

    const remainingAttempts = Math.max(0, config.maxAttempts - newAttemptCount);

    if (shouldBlock && increment) {
      console.log(`[Rate Limit] IP ${ip_address} blocked for ${config.blockDurationMinutes} minutes`);
      return new Response(
        JSON.stringify({
          allowed: false,
          blocked: true,
          blockedUntil: blockedUntil?.toISOString(),
          minutesRemaining: config.blockDurationMinutes,
          message: `Muitas tentativas. Bloqueado por ${config.blockDurationMinutes} minutos`,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`[Rate Limit] Allowed. Remaining attempts: ${remainingAttempts}/${config.maxAttempts}`);

    return new Response(
      JSON.stringify({
        allowed: true,
        blocked: false,
        remainingAttempts,
        maxAttempts: config.maxAttempts,
        message: remainingAttempts <= 2 && remainingAttempts > 0
          ? `Tentativas restantes: ${remainingAttempts}/${config.maxAttempts}`
          : null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[Rate Limit] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
