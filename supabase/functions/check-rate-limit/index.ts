import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Extract real IP server-side from proxy headers
    const ip_address =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      'unknown';

    const { action, increment = false, user_id } = await req.json();

    if (!action) {
      throw new Error("Missing required parameter: action");
    }

    const config = RATE_LIMITS[action];
    if (!config) {
      throw new Error(`Invalid action: ${action}`);
    }

    // RL-01: For increment=true with user_id, validate JWT to prevent malicious pre-blocking
    if (increment && user_id) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL") ?? '', anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        });
        const { data: { user } } = await supabaseAuth.auth.getUser();
        // If authenticated, user_id must match the JWT user
        if (user && user.id !== user_id) {
          return new Response(
            JSON.stringify({ error: 'user_id does not match authenticated user' }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
    }

    // Authenticated users are identified by user_id to avoid shared-IP false-positives
    const identifier = user_id ?? ip_address;
    console.log(`[Rate Limit] Checking: ${action} for ${user_id ? `user:${user_id}` : `ip:${ip_address}`}`);

    // Get or create rate limit record
    const { data: existingAttempt, error: fetchError } = await supabase
      .from("rate_limit_attempts")
      .select("*")
      .eq("ip_address", identifier)
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
        console.log(`[Rate Limit] ${identifier} blocked for ${minutesRemaining} more minutes`);
        
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
        console.log(`[Rate Limit] Window expired for ${identifier}, resetting counter`);
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
            ip_address: identifier,
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
      console.log(`[Rate Limit] ${identifier} blocked for ${config.blockDurationMinutes} minutes`);
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

    console.log(`[Rate Limit] Allowed for ${identifier}. Remaining: ${remainingAttempts}/${config.maxAttempts}`);

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
