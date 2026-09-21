-- Health
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  overall_status TEXT NOT NULL DEFAULT 'healthy'
    CHECK (overall_status IN ('healthy', 'at_risk', 'critical', 'blocked')),
  health_score NUMERIC(5, 2) CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  last_assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assessment_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_health_id UUID NOT NULL REFERENCES public.project_health(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(12, 4),
  metric_unit TEXT,
  status TEXT NOT NULL DEFAULT 'normal'
    CHECK (status IN ('normal', 'warning', 'critical')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_metrics_project_health_id ON public.health_metrics (project_health_id);

CREATE TABLE public.satisfaction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  party TEXT NOT NULL CHECK (party IN ('client', 'freelancer')),
  score NUMERIC(3, 1) NOT NULL CHECK (score >= 1 AND score <= 5),
  feedback TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_satisfaction_records_project_id ON public.satisfaction_records (project_id);

CREATE TABLE public.health_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'mitigating', 'resolved', 'accepted')),
  identified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_risks_project_id ON public.health_risks (project_id);
CREATE INDEX idx_health_risks_status ON public.health_risks (status);

-- ---------------------------------------------------------------------------
