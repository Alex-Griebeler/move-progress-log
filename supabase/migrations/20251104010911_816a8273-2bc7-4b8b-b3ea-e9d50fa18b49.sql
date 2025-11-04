-- Create rate_limit_attempts table for anti-brute force protection
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login', 'signup', 'reset_password', 'verify_email')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ip_address, action)
);

-- Enable RLS
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage rate limits
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limit_attempts
  FOR ALL
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_rate_limit_ip_action ON public.rate_limit_attempts(ip_address, action);
CREATE INDEX idx_rate_limit_blocked_until ON public.rate_limit_attempts(blocked_until) WHERE blocked_until IS NOT NULL;

-- Create function to clean up old rate limit attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete attempts older than 24 hours
  DELETE FROM public.rate_limit_attempts
  WHERE created_at < now() - interval '24 hours';
  
  -- Delete expired blocks
  DELETE FROM public.rate_limit_attempts
  WHERE blocked_until IS NOT NULL 
    AND blocked_until < now()
    AND last_attempt_at < now() - interval '1 hour';
    
  RAISE NOTICE 'Rate limit cleanup completed';
END;
$$;