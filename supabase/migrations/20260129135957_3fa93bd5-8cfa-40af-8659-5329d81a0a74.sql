-- Create ENUM types for categorization
CREATE TYPE public.entity_type AS ENUM ('person', 'business', 'phone', 'website', 'service');
CREATE TYPE public.incident_category AS ENUM (
  'fraud', 'scam', 'harassment', 'misrepresentation', 
  'non_delivery', 'quality_issue', 'safety_concern', 
  'data_breach', 'unauthorized_charges', 'other'
);
CREATE TYPE public.severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'disputed', 'rejected');

-- Entities table: stores people, businesses, phones, websites, services
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type entity_type NOT NULL,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL, -- phone number, URL, registration number, etc.
  normalized_identifier TEXT NOT NULL, -- lowercase, stripped for search
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, normalized_identifier)
);

-- Create index for fast searches
CREATE INDEX idx_entities_name_search ON public.entities USING gin(to_tsvector('english', name));
CREATE INDEX idx_entities_identifier_search ON public.entities USING gin(to_tsvector('english', identifier));
CREATE INDEX idx_entities_normalized ON public.entities (normalized_identifier);
CREATE INDEX idx_entities_type ON public.entities (type);

-- Entity risk scores: aggregated statistics per entity
CREATE TABLE public.entity_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_incidents INTEGER NOT NULL DEFAULT 0,
  verified_incidents INTEGER NOT NULL DEFAULT 0,
  severity_score DECIMAL(5,2) NOT NULL DEFAULT 0, -- 0-100 weighted score
  risk_level TEXT NOT NULL DEFAULT 'unknown', -- calculated: low, moderate, high, critical
  last_incident_at TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_scores_entity ON public.entity_risk_scores (entity_id);
CREATE INDEX idx_risk_scores_level ON public.entity_risk_scores (risk_level);

-- Incident reports: the core incident data
CREATE TABLE public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  
  -- What happened
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  what_was_promised TEXT, -- optional: expectation
  what_actually_happened TEXT, -- optional: reality
  
  -- Classification
  category incident_category NOT NULL,
  severity severity_level NOT NULL DEFAULT 'medium',
  
  -- Context
  date_occurred DATE NOT NULL,
  location TEXT,
  
  -- Verification
  status verification_status NOT NULL DEFAULT 'pending',
  verification_confidence DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  verified_at TIMESTAMPTZ,
  
  -- Metadata
  submitter_ip_hash TEXT, -- hashed for abuse prevention, not identification
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_entity ON public.incident_reports (entity_id);
CREATE INDEX idx_incidents_category ON public.incident_reports (category);
CREATE INDEX idx_incidents_severity ON public.incident_reports (severity);
CREATE INDEX idx_incidents_status ON public.incident_reports (status);
CREATE INDEX idx_incidents_date ON public.incident_reports (date_occurred DESC);
CREATE INDEX idx_incidents_created ON public.incident_reports (created_at DESC);

-- Evidence metadata: references to evidence files (stored in blob storage)
CREATE TABLE public.incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE NOT NULL,
  
  -- Evidence metadata
  file_url TEXT NOT NULL, -- URL to blob storage
  file_type TEXT NOT NULL, -- image, document, screenshot, etc.
  file_name TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  
  -- Verification
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_incident ON public.incident_evidence (incident_id);

-- Function to update entity risk scores
CREATE OR REPLACE FUNCTION public.update_entity_risk_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Calculate severity score (weighted by severity and verification)
  SELECT COALESCE(
    SUM(
      CASE severity
        WHEN 'critical' THEN 40
        WHEN 'high' THEN 25
        WHEN 'medium' THEN 15
        WHEN 'low' THEN 5
      END * 
      CASE WHEN status = 'verified' THEN 1.5 ELSE 1.0 END
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
$$;

-- Trigger to auto-update risk scores
CREATE TRIGGER trigger_update_risk_score
AFTER INSERT OR UPDATE OR DELETE ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.update_entity_risk_score();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Timestamp triggers
CREATE TRIGGER update_entities_updated_at
BEFORE UPDATE ON public.entities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
BEFORE UPDATE ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_evidence ENABLE ROW LEVEL SECURITY;

-- Public read policies (anyone can search and view)
CREATE POLICY "Anyone can view entities"
ON public.entities FOR SELECT
USING (true);

CREATE POLICY "Anyone can view risk scores"
ON public.entity_risk_scores FOR SELECT
USING (true);

CREATE POLICY "Anyone can view verified or pending incidents"
ON public.incident_reports FOR SELECT
USING (status IN ('verified', 'pending'));

CREATE POLICY "Anyone can view evidence for visible incidents"
ON public.incident_evidence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.incident_reports 
    WHERE id = incident_id AND status IN ('verified', 'pending')
  )
);

-- Anonymous submission policies
CREATE POLICY "Anyone can create entities"
ON public.entities FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can submit incident reports"
ON public.incident_reports FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can attach evidence to their submissions"
ON public.incident_evidence FOR INSERT
WITH CHECK (true);