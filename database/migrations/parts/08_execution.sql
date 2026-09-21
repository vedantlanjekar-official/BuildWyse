-- Execution
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL CHECK (phase_number > 0),
  name TEXT NOT NULL,
  description TEXT,
  objectives TEXT[],
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'completed')),
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, phase_number)
);

CREATE INDEX idx_project_phases_project_id ON public.project_phases (project_id);
CREATE INDEX idx_project_phases_status ON public.project_phases (status);

CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'paid')),
  payment_amount NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  sequence_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_milestones_phase_id ON public.milestones (phase_id);
CREATE INDEX idx_milestones_project_id ON public.milestones (project_id);
CREATE INDEX idx_milestones_status ON public.milestones (status);

CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_tasks_project_id ON public.project_tasks (project_id);
CREATE INDEX idx_project_tasks_assigned_to ON public.project_tasks (assigned_to);
CREATE INDEX idx_project_tasks_status ON public.project_tasks (status);

CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deliverable_type TEXT NOT NULL
    CHECK (deliverable_type IN ('code', 'document', 'design', 'deployment', 'hardware', 'other')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverables_milestone_id ON public.deliverables (milestone_id);
CREATE INDEX idx_deliverables_project_id ON public.deliverables (project_id);

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'deadline'
    CHECK (event_type IN ('deadline', 'meeting', 'review', 'submission', 'payment', 'other')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_project_id ON public.calendar_events (project_id);
CREATE INDEX idx_calendar_events_starts_at ON public.calendar_events (starts_at);

CREATE TABLE public.phase_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  submission_notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'revision_requested')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_phase_submissions_phase_id ON public.phase_submissions (phase_id);
CREATE INDEX idx_phase_submissions_project_id ON public.phase_submissions (project_id);

CREATE TABLE public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.phase_submissions(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL
    CHECK (evidence_type IN ('git', 'deployment', 'screenshot', 'document', 'photo', 'video', 'log', 'other')),
  title TEXT NOT NULL,
  url TEXT,
  file_path TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_items_project_id ON public.evidence_items (project_id);
CREATE INDEX idx_evidence_items_submission_id ON public.evidence_items (submission_id);

CREATE TABLE public.repository_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab', 'bitbucket', 'other')),
  repository_url TEXT NOT NULL,
  repository_name TEXT,
  branch TEXT DEFAULT 'main',
  access_token_ref TEXT,
  connected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disconnected', 'error')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repository_connections_project_id ON public.repository_connections (project_id);

CREATE TABLE public.deployment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  environment TEXT NOT NULL DEFAULT 'staging'
    CHECK (environment IN ('development', 'staging', 'production', 'preview')),
  deployment_url TEXT,
  provider TEXT,
  version_tag TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'deploying', 'success', 'failed', 'rolled_back')),
  deployed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deployed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deployment_records_project_id ON public.deployment_records (project_id);

CREATE TABLE public.verification_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES public.phase_submissions(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL DEFAULT 'ai_assisted'
    CHECK (report_type IN ('ai_assisted', 'manual', 'hybrid')),
  overall_result TEXT NOT NULL DEFAULT 'pending'
    CHECK (overall_result IN ('pending', 'pass', 'partial', 'fail')),
  compliance_score NUMERIC(5, 2) CHECK (compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 100)),
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_reports_project_id ON public.verification_reports (project_id);

CREATE TABLE public.approval_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('phase', 'milestone', 'deliverable', 'change', 'document', 'payment')),
  entity_id UUID NOT NULL,
  approved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approval_notes TEXT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_records_project_id ON public.approval_records (project_id);
CREATE INDEX idx_approval_records_entity ON public.approval_records (entity_type, entity_id);

CREATE TABLE public.rejection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('phase', 'milestone', 'deliverable', 'change', 'document', 'submission')),
  entity_id UUID NOT NULL,
  rejected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  rejection_reason TEXT NOT NULL,
  revision_required BOOLEAN NOT NULL DEFAULT true,
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rejection_records_project_id ON public.rejection_records (project_id);
CREATE INDEX idx_rejection_records_entity ON public.rejection_records (entity_type, entity_id);

-- ---------------------------------------------------------------------------
