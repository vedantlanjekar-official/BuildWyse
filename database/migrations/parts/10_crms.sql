-- CRMS â€” Change Request Management System
-- ---------------------------------------------------------------------------
CREATE TABLE public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'scope'
    CHECK (change_type IN ('scope', 'timeline', 'budget', 'technical', 'design', 'other')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'submitted', 'under_analysis', 'estimated', 'pending_approval',
      'approved', 'rejected', 'in_development', 'completed', 'cancelled'
    )),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_requests_project_id ON public.change_requests (project_id);
CREATE INDEX idx_change_requests_status ON public.change_requests (status);

CREATE TABLE public.change_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'comment'
    CHECK (message_type IN ('comment', 'ai_analysis', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_conversations_change_request_id ON public.change_conversations (change_request_id);

CREATE TABLE public.change_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  requirement_type TEXT NOT NULL DEFAULT 'functional'
    CHECK (requirement_type IN ('functional', 'non_functional', 'technical', 'design')),
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'rejected', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_requirements_change_request_id ON public.change_requirements (change_request_id);

CREATE TABLE public.change_impact_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL UNIQUE REFERENCES public.change_requests(id) ON DELETE CASCADE,
  scope_impact TEXT,
  technical_impact TEXT,
  timeline_impact_days INTEGER,
  budget_impact_amount NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  database_impact TEXT,
  architecture_impact TEXT,
  risk_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  analyzed_by TEXT NOT NULL DEFAULT 'ai'
    CHECK (analyzed_by IN ('ai', 'freelancer', 'admin', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.change_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_documents_change_request_id ON public.change_documents (change_request_id);

CREATE TABLE public.change_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  estimated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  estimated_amount NUMERIC(14, 2) NOT NULL CHECK (estimated_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  estimated_days INTEGER CHECK (estimated_days IS NULL OR estimated_days > 0),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'accepted', 'rejected', 'revised')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_estimates_change_request_id ON public.change_estimates (change_request_id);

CREATE TABLE public.change_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approval_type TEXT NOT NULL DEFAULT 'client'
    CHECK (approval_type IN ('client', 'freelancer', 'admin', 'both')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_approvals_change_request_id ON public.change_approvals (change_request_id);

-- ---------------------------------------------------------------------------
