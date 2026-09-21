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
