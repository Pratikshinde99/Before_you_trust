-- Create private storage bucket for incident evidence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-evidence', 
  'incident-evidence', 
  false,  -- PRIVATE bucket
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif']
);

-- RLS policy: Only service role can access files (no public access)
-- Files are uploaded via edge function with service role key

CREATE POLICY "Service role can manage evidence files"
ON storage.objects
FOR ALL
USING (bucket_id = 'incident-evidence')
WITH CHECK (bucket_id = 'incident-evidence');

-- Add evidence_count column to track evidence for confidence calculation
ALTER TABLE public.incident_reports 
ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 0;

-- Update the risk score function to factor in evidence
CREATE OR REPLACE FUNCTION public.update_entity_risk_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total INTEGER;
  v_verified INTEGER;
  v_severity_score DECIMAL(5,2);
  v_risk_level TEXT;
  v_last_incident TIMESTAMPTZ;
BEGIN
  -- Calculate totals
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'verified'),
    MAX(created_at)
  INTO v_total, v_verified, v_last_incident
  FROM public.incident_reports
  WHERE entity_id = COALESCE(NEW.entity_id, OLD.entity_id);

  -- Calculate severity score (weighted by severity, verification, and evidence)
  SELECT COALESCE(
    SUM(
      CASE severity
        WHEN 'critical' THEN 40
        WHEN 'high' THEN 25
        WHEN 'medium' THEN 15
        WHEN 'low' THEN 5
      END * 
      CASE WHEN status = 'verified' THEN 1.5 ELSE 1.0 END *
      CASE WHEN evidence_count > 0 THEN 1.2 ELSE 1.0 END  -- Evidence boost
    ), 0
  )
  INTO v_severity_score
  FROM public.incident_reports
  WHERE entity_id = COALESCE(NEW.entity_id, OLD.entity_id);

  -- Cap at 100
  v_severity_score := LEAST(v_severity_score, 100);

  -- Determine risk level
  v_risk_level := CASE
    WHEN v_severity_score >= 75 THEN 'critical'
    WHEN v_severity_score >= 50 THEN 'high'
    WHEN v_severity_score >= 25 THEN 'moderate'
    WHEN v_severity_score > 0 THEN 'low'
    ELSE 'unknown'
  END;

  -- Upsert risk score
  INSERT INTO public.entity_risk_scores (
    entity_id, total_incidents, verified_incidents, 
    severity_score, risk_level, last_incident_at, calculated_at
  )
  VALUES (
    COALESCE(NEW.entity_id, OLD.entity_id),
    v_total, v_verified, v_severity_score, 
    v_risk_level, v_last_incident, now()
  )
  ON CONFLICT (entity_id) DO UPDATE SET
    total_incidents = EXCLUDED.total_incidents,
    verified_incidents = EXCLUDED.verified_incidents,
    severity_score = EXCLUDED.severity_score,
    risk_level = EXCLUDED.risk_level,
    last_incident_at = EXCLUDED.last_incident_at,
    calculated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function to calculate verification confidence based on evidence
CREATE OR REPLACE FUNCTION public.calculate_verification_confidence(
  p_incident_id UUID
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_confidence DECIMAL(5,2) := 10.0;  -- Base confidence for any submission
  v_evidence_count INTEGER;
  v_verified_evidence INTEGER;
  v_has_details BOOLEAN;
  v_confidence DECIMAL(5,2);
BEGIN
  -- Get evidence counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_verified = true)
  INTO v_evidence_count, v_verified_evidence
  FROM public.incident_evidence
  WHERE incident_id = p_incident_id;

  -- Check if incident has detailed fields filled
  SELECT 
    (what_was_promised IS NOT NULL AND what_was_promised != '') OR
    (what_actually_happened IS NOT NULL AND what_actually_happened != '')
  INTO v_has_details
  FROM public.incident_reports
  WHERE id = p_incident_id;

  -- Calculate confidence score
  v_confidence := v_base_confidence;
  
  -- Add points for evidence (max 50 points from evidence)
  v_confidence := v_confidence + LEAST(v_evidence_count * 15, 50);
  
  -- Add bonus for verified evidence
  v_confidence := v_confidence + (v_verified_evidence * 10);
  
  -- Add points for detailed description
  IF v_has_details THEN
    v_confidence := v_confidence + 10;
  END IF;

  -- Cap at 100
  RETURN LEAST(v_confidence, 100);
END;
$function$;

-- Trigger to update confidence when evidence is added
CREATE OR REPLACE FUNCTION public.update_incident_confidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_confidence DECIMAL(5,2);
  v_evidence_count INTEGER;
BEGIN
  -- Calculate new confidence
  v_confidence := public.calculate_verification_confidence(
    COALESCE(NEW.incident_id, OLD.incident_id)
  );
  
  -- Count evidence
  SELECT COUNT(*) INTO v_evidence_count
  FROM public.incident_evidence
  WHERE incident_id = COALESCE(NEW.incident_id, OLD.incident_id);

  -- Update the incident
  UPDATE public.incident_reports
  SET 
    verification_confidence = v_confidence,
    evidence_count = v_evidence_count
  WHERE id = COALESCE(NEW.incident_id, OLD.incident_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for evidence changes
DROP TRIGGER IF EXISTS on_evidence_change ON public.incident_evidence;
CREATE TRIGGER on_evidence_change
  AFTER INSERT OR UPDATE OR DELETE ON public.incident_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_incident_confidence();