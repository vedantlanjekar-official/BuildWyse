-- Projects
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'PROJECT_DISCOVERY'
    CHECK (state IN (
      'PROJECT_DISCOVERY',
      'REQUIREMENT_DISCUSSION',
      'DOCUMENTATION_PREPARATION',
      'DOCUMENTATION_REVIEW',
      'BUDGET_PLANNING',
      'DEVELOPMENT_PREFERENCE',
      'FREELANCER_MATCHING',
      'FREELANCER_SELECTION',
      'TECHNICAL_REVIEW',
      'CLIENT_FREELANCER_DISCUSSION',
      'AGREEMENT',
      'EXECUTION',
      'PHASE_VERIFICATION',
      'COMPLETED',
      'CHANGE_REQUEST',
      'AFTER_SALES',
      'CERTIFIED'
    )),
  category TEXT,
  industry TEXT,
  complexity TEXT
    CHECK (complexity IS NULL OR complexity IN ('low', 'medium', 'high', 'enterprise')),
  assigned_freelancer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  development_model TEXT
    CHECK (development_model IS NULL OR development_model IN ('individual', 'team', 'enterprise')),
  estimated_budget NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_client_id ON public.projects (client_id);
CREATE INDEX idx_projects_state ON public.projects (state);
CREATE INDEX idx_projects_assigned_freelancer_id ON public.projects (assigned_freelancer_id);
CREATE INDEX idx_projects_assigned_org_id ON public.projects (assigned_org_id);

CREATE TABLE public.project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  requirement_type TEXT NOT NULL DEFAULT 'functional'
    CHECK (requirement_type IN ('functional', 'non_functional', 'business', 'technical', 'design', 'hardware')),
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'assumption', 'pending', 'clarification_needed', 'approved')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  source TEXT NOT NULL DEFAULT 'ai'
    CHECK (source IN ('client', 'ai', 'system')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_requirements_project_id ON public.project_requirements (project_id);
CREATE INDEX idx_project_requirements_status ON public.project_requirements (status);

CREATE TABLE public.requirement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requirement_id, version_number)
);

CREATE INDEX idx_requirement_versions_requirement_id ON public.requirement_versions (requirement_id);

CREATE TABLE public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN (
      'concept_logic', 'prd', 'technology_stack', 'frontend_design',
      'hardware_spec', 'architecture', 'development_phases', 'budget', 'other'
    )),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'locked', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'partial'
    CHECK (visibility IN ('hidden', 'partial', 'full')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_documents_project_id ON public.project_documents (project_id);
CREATE INDEX idx_project_documents_document_type ON public.project_documents (document_type);

CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT,
  content_json JSONB,
  file_url TEXT,
  generated_by TEXT NOT NULL DEFAULT 'ai'
    CHECK (generated_by IN ('ai', 'client', 'freelancer', 'admin', 'system')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE INDEX idx_document_versions_document_id ON public.document_versions (document_id);

CREATE TABLE public.project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_type TEXT NOT NULL
    CHECK (budget_type IN ('client_estimate', 'individual', 'team', 'enterprise', 'approved')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  min_amount NUMERIC(14, 2) CHECK (min_amount IS NULL OR min_amount >= 0),
  max_amount NUMERIC(14, 2) CHECK (max_amount IS NULL OR max_amount >= 0),
  rationale TEXT,
  ai_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'accepted', 'rejected', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_budgets_project_id ON public.project_budgets (project_id);

CREATE TABLE public.development_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  preferred_model TEXT NOT NULL
    CHECK (preferred_model IN ('individual', 'team', 'enterprise')),
  budget_range_min NUMERIC(14, 2),
  budget_range_max NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  timeline_preference TEXT,
  communication_preference TEXT,
  notes TEXT,
  selected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
