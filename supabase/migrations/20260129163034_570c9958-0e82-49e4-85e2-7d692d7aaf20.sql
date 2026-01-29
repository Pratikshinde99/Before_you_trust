-- Create rate limiting table for tracking submissions
CREATE TABLE IF NOT EXISTS public.submission_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'incident_submission', 'entity_creation', 'ai_call'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient rate limit lookups
CREATE INDEX idx_rate_limits_ip_action ON public.submission_rate_limits(ip_hash, action_type, created_at);

-- Enable RLS
ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role manages rate limits"
ON public.submission_rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Function to clean up old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.submission_rate_limits
  WHERE created_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Drop existing permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can create entities" ON public.entities;
DROP POLICY IF EXISTS "Anyone can attach evidence to their submissions" ON public.incident_evidence;
DROP POLICY IF EXISTS "Anyone can submit incident reports" ON public.incident_reports;

-- Create service role only INSERT policies for entities
CREATE POLICY "Service role can create entities"
ON public.entities
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create service role only INSERT policies for incident_evidence
CREATE POLICY "Service role can attach evidence"
ON public.incident_evidence
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create service role only INSERT policies for incident_reports
CREATE POLICY "Service role can submit incidents"
ON public.incident_reports
FOR INSERT
WITH CHECK (auth.role() = 'service_role');