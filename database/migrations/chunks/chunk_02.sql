  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embeddings_entity ON public.embeddings (entity_type, entity_id);
CREATE INDEX idx_embeddings_vector ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- Matching
-- ---------------------------------------------------------------------------
CREATE TABLE public.matching_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  algorithm_version TEXT,
  candidate_count INTEGER DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matching_runs_project_id ON public.matching_runs (project_id);

CREATE TABLE public.match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_run_id UUID NOT NULL REFERENCES public.matching_runs(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  overall_score NUMERIC(5, 2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  technology_score NUMERIC(5, 2),
  experience_score NUMERIC(5, 2),
  portfolio_score NUMERIC(5, 2),
  verification_score NUMERIC(5, 2),
  rank_position INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (matching_run_id, freelancer_id)
);

CREATE INDEX idx_match_scores_matching_run_id ON public.match_scores (matching_run_id);
CREATE INDEX idx_match_scores_freelancer_id ON public.match_scores (freelancer_id);

CREATE TABLE public.project_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  matching_run_id UUID REFERENCES public.matching_runs(id) ON DELETE SET NULL,
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'shortlisted'
    CHECK (status IN ('shortlisted', 'invited', 'responded', 'declined', 'selected', 'rejected')),
  rank_position INTEGER,
  presented_to_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, freelancer_id)
);

CREATE INDEX idx_project_candidates_project_id ON public.project_candidates (project_id);
CREATE INDEX idx_project_candidates_freelancer_id ON public.project_candidates (freelancer_id);

CREATE TABLE public.candidate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.project_candidates(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL
    CHECK (response_type IN ('interest', 'decline', 'question', 'proposal_submitted')),
  message TEXT,
  availability_date DATE,
  proposed_rate NUMERIC(12, 2),
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_responses_candidate_id ON public.candidate_responses (candidate_id);

CREATE TABLE public.technical_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.project_candidates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  approach_summary TEXT,
  timeline_estimate_days INTEGER CHECK (timeline_estimate_days IS NULL OR timeline_estimate_days > 0),
  proposed_amount NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected')),
  document_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_technical_proposals_project_id ON public.technical_proposals (project_id);
CREATE INDEX idx_technical_proposals_candidate_id ON public.technical_proposals (candidate_id);

CREATE TABLE public.selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  selected_freelancer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  selected_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  selected_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  selected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  selection_reason TEXT,
  agreed_amount NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  meeting_type TEXT NOT NULL
    CHECK (meeting_type IN ('discovery', 'technical_review', 'client_freelancer', 'kickoff', 'milestone', 'change', 'other')),
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  meeting_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_project_id ON public.meetings (project_id);
CREATE INDEX idx_meetings_scheduled_at ON public.meetings (scheduled_at);

-- ---------------------------------------------------------------------------
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
-- ASSM â€” After-Sales Service Module
-- ---------------------------------------------------------------------------
