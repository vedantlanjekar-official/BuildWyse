-- BuildWyse Platform — Initial Schema Migration
-- PostgreSQL / Supabase compatible
-- Run as a single migration

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  account_type TEXT NOT NULL DEFAULT 'client'
    CHECK (account_type IN ('client', 'freelancer', 'enterprise', 'admin')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'restricted', 'suspended')),
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_email ON public.profiles (email);
CREATE INDEX idx_profiles_account_type ON public.profiles (account_type);
CREATE INDEX idx_profiles_verification_status ON public.profiles (verification_status);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('admin', 'client', 'freelancer', 'org_manager', 'team_leader', 'member')),
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles (role);

CREATE TABLE public.identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL
    CHECK (verification_type IN ('email', 'phone', 'government_id', 'identity', 'github', 'linkedin')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_identity_verifications_user_id ON public.identity_verifications (user_id);
CREATE INDEX idx_identity_verifications_status ON public.identity_verifications (status);

CREATE TABLE public.verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_verification_id UUID NOT NULL REFERENCES public.identity_verifications(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_value TEXT,
  document_url TEXT,
  checksum TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_records_identity_verification_id
  ON public.verification_records (identity_verification_id);

-- ---------------------------------------------------------------------------
-- Freelancer
-- ---------------------------------------------------------------------------
CREATE TABLE public.freelancer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline TEXT,
  bio TEXT,
  hourly_rate NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  availability_status TEXT NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'limited', 'unavailable')),
  experience_years INTEGER CHECK (experience_years >= 0),
  github_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  interview_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (interview_status IN ('not_started', 'scheduled', 'in_progress', 'passed', 'failed')),
  platform_certified BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_freelancer_profiles_user_id ON public.freelancer_profiles (user_id);
CREATE INDEX idx_freelancer_profiles_availability ON public.freelancer_profiles (availability_status);

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_category ON public.skills (category);
CREATE INDEX idx_skills_is_active ON public.skills (is_active);

CREATE TABLE public.freelancer_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency_level TEXT NOT NULL DEFAULT 'intermediate'
    CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience NUMERIC(4, 1) CHECK (years_experience >= 0),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (freelancer_id, skill_id)
);

CREATE INDEX idx_freelancer_skills_freelancer_id ON public.freelancer_skills (freelancer_id);
CREATE INDEX idx_freelancer_skills_skill_id ON public.freelancer_skills (skill_id);

CREATE TABLE public.freelancer_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  technologies TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_freelancer_experience_freelancer_id ON public.freelancer_experience (freelancer_id);

CREATE TABLE public.freelancer_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  credential_id TEXT,
  credential_url TEXT,
  issued_at DATE,
  expires_at DATE,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_freelancer_certifications_freelancer_id
  ON public.freelancer_certifications (freelancer_id);

CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL UNIQUE REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  title TEXT,
  summary TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_url TEXT,
  repository_url TEXT,
  technologies TEXT[],
  role TEXT,
  start_date DATE,
  end_date DATE,
  highlights TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_projects_portfolio_id ON public.portfolio_projects (portfolio_id);

CREATE TABLE public.interview_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  outcome TEXT
    CHECK (outcome IS NULL OR outcome IN ('passed', 'failed', 'deferred')),
  score NUMERIC(5, 2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  notes TEXT,
  recording_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_records_freelancer_id ON public.interview_records (freelancer_id);
CREATE INDEX idx_interview_records_status ON public.interview_records (status);

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  org_type TEXT NOT NULL DEFAULT 'enterprise'
    CHECK (org_type IN ('freelancer_team', 'enterprise', 'agency')),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'suspended')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_owner_id ON public.organizations (owner_id);
CREATE INDEX idx_organizations_org_type ON public.organizations (org_type);

CREATE TABLE public.organization_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_organization_roles_organization_id ON public.organization_roles (organization_id);

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.organization_roles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'inactive', 'removed')),
  joined_at TIMESTAMPTZ,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_organization_members_organization_id ON public.organization_members (organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members (user_id);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_organization_id ON public.teams (organization_id);
CREATE INDEX idx_teams_leader_id ON public.teams (leader_id);

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('leader', 'member', 'specialist')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'inactive', 'removed')),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON public.team_members (team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members (user_id);

-- ---------------------------------------------------------------------------
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
      'hardware_spec', 'architecture', 'development_phases', 'other'
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
-- AI
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL DEFAULT 'requirement_discovery'
    CHECK (conversation_type IN (
      'requirement_discovery', 'document_generation', 'matching',
      'verification', 'change_analysis', 'after_sales', 'general'
    )),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_project_id ON public.ai_conversations (project_id);
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations (user_id);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  token_count INTEGER CHECK (token_count IS NULL OR token_count >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages (conversation_id);
CREATE INDEX idx_ai_messages_created_at ON public.ai_messages (created_at);

CREATE TABLE public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  run_type TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_runs_project_id ON public.ai_runs (project_id);
CREATE INDEX idx_ai_runs_user_id ON public.ai_runs (user_id);
CREATE INDEX idx_ai_runs_status ON public.ai_runs (status);

CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  run_id UUID REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  usage_type TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_amount NUMERIC(12, 6) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_user_id ON public.ai_usage (user_id);
CREATE INDEX idx_ai_usage_project_id ON public.ai_usage (project_id);
CREATE INDEX idx_ai_usage_recorded_at ON public.ai_usage (recorded_at);

CREATE TABLE public.requirement_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  technology_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  functional_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  industry_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  complexity_score NUMERIC(5, 2),
  hardware_required BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.expertise_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL UNIQUE REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  technology_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  experience_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  portfolio_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_score NUMERIC(5, 2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('project', 'requirement', 'freelancer', 'portfolio', 'document')),
  entity_id UUID NOT NULL,
  embedding vector(1536) NOT NULL,
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
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
-- CRMS — Change Request Management System
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
-- ASSM — After-Sales Service Module
-- ---------------------------------------------------------------------------
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  service_type TEXT NOT NULL
    CHECK (service_type IN (
      'bug_fix', 'maintenance', 'new_feature', 'integration',
      'upgrade', 'performance', 'hardware', 'support', 'other'
    )),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'submitted', 'under_review', 'scoped', 'approved', 'assigned',
      'in_progress', 'completed', 'cancelled', 'escalated_to_project'
    )),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_requests_project_id ON public.service_requests (project_id);
CREATE INDEX idx_service_requests_status ON public.service_requests (status);

CREATE TABLE public.service_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_conversations_service_request_id ON public.service_conversations (service_request_id);

CREATE TABLE public.service_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_requirements_service_request_id ON public.service_requirements (service_request_id);

CREATE TABLE public.service_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT,
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_documents_service_request_id ON public.service_documents (service_request_id);

CREATE TABLE public.service_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  estimated_amount NUMERIC(14, 2) NOT NULL CHECK (estimated_amount >= 0),
  approved_amount NUMERIC(14, 2) CHECK (approved_amount IS NULL OR approved_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_budgets_service_request_id ON public.service_budgets (service_request_id);

CREATE TABLE public.service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL UNIQUE REFERENCES public.service_requests(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'reassigned', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.service_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL CHECK (phase_number > 0),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_request_id, phase_number)
);

CREATE INDEX idx_service_phases_service_request_id ON public.service_phases (service_request_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
CREATE TABLE public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_type TEXT NOT NULL
    CHECK (order_type IN ('documentation', 'milestone', 'change_request', 'after_sales', 'platform_fee')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  provider TEXT,
  provider_order_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_orders_project_id ON public.payment_orders (project_id);
CREATE INDEX idx_payment_orders_client_id ON public.payment_orders (client_id);
CREATE INDEX idx_payment_orders_status ON public.payment_orders (status);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  payment_method TEXT,
  provider TEXT,
  provider_payment_id TEXT,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_payment_order_id ON public.payments (payment_order_id);
CREATE INDEX idx_payments_project_id ON public.payments (project_id);
CREATE INDEX idx_payments_payer_id ON public.payments (payer_id);

CREATE TABLE public.milestone_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'held', 'released', 'refunded')),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (milestone_id, payment_id)
);

CREATE INDEX idx_milestone_payments_milestone_id ON public.milestone_payments (milestone_id);
CREATE INDEX idx_milestone_payments_project_id ON public.milestone_payments (project_id);

CREATE TABLE public.platform_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  commission_rate NUMERIC(5, 4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
  commission_amount NUMERIC(14, 2) NOT NULL CHECK (commission_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'collected', 'waived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_commissions_payment_id ON public.platform_commissions (payment_id);

CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider TEXT,
  provider_payout_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_recipient_id ON public.payouts (recipient_id);
CREATE INDEX idx_payouts_project_id ON public.payouts (project_id);

CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'processing', 'completed', 'rejected')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refunds_payment_id ON public.refunds (payment_id);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  billed_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  tax_amount NUMERIC(14, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'paid', 'void', 'overdue')),
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  pdf_url TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_project_id ON public.invoices (project_id);
CREATE INDEX idx_invoices_billed_to ON public.invoices (billed_to);

CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_events_provider ON public.webhook_events (provider);
CREATE INDEX idx_webhook_events_status ON public.webhook_events (status);
CREATE INDEX idx_webhook_events_external_id ON public.webhook_events (external_id);

CREATE TABLE public.reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  payout_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL,
  record_type TEXT NOT NULL
    CHECK (record_type IN ('payment', 'payout', 'commission', 'refund')),
  expected_amount NUMERIC(14, 2) NOT NULL,
  actual_amount NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'matched', 'discrepancy', 'resolved')),
  notes TEXT,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reconciliation_records_payment_id ON public.reconciliation_records (payment_id);

-- ---------------------------------------------------------------------------
-- Certification
-- ---------------------------------------------------------------------------
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE RESTRICT,
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_type TEXT NOT NULL DEFAULT 'project_completion'
    CHECK (certificate_type IN ('project_completion', 'freelancer_completion', 'client_completion')),
  issued_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  issued_by TEXT NOT NULL DEFAULT 'buildwyse',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'expired')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificates_project_id ON public.certificates (project_id);
CREATE INDEX idx_certificates_issued_to ON public.certificates (issued_to);

CREATE TABLE public.certificate_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by_ip INET,
  verification_method TEXT NOT NULL DEFAULT 'public_lookup'
    CHECK (verification_method IN ('public_lookup', 'api', 'admin')),
  result TEXT NOT NULL DEFAULT 'valid'
    CHECK (result IN ('valid', 'invalid', 'revoked', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificate_verification_certificate_id ON public.certificate_verification (certificate_id);

-- ---------------------------------------------------------------------------
-- Platform
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications (user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications (created_at DESC);

CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_project_id ON public.audit_logs (project_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

CREATE TABLE public.project_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  description TEXT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_history_project_id ON public.project_history (project_id);
CREATE INDEX idx_project_history_occurred_at ON public.project_history (occurred_at DESC);

-- ---------------------------------------------------------------------------
-- Helper functions (used by RLS policies; created after tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'client' THEN 2
      WHEN 'freelancer' THEN 3
      WHEN 'org_manager' THEN 4
      WHEN 'team_leader' THEN 5
      ELSE 99
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_client(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND p.client_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_participant(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND (
        p.client_id = auth.uid()
        OR p.assigned_freelancer_id = auth.uid()
        OR p.assigned_org_id IN (
          SELECT om.organization_id
          FROM public.organization_members om
          WHERE om.user_id = auth.uid()
            AND om.status = 'active'
        )
        OR EXISTS (
          SELECT 1
          FROM public.project_candidates pc
          JOIN public.freelancer_profiles fp ON fp.id = pc.freelancer_id
          WHERE pc.project_id = p_project_id
            AND fp.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.selections s
          WHERE s.project_id = p_project_id
            AND s.selected_freelancer_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.owns_freelancer_profile(p_freelancer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.freelancer_profiles fp
    WHERE fp.id = p_freelancer_id
      AND fp.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers for tables with updated_at column
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'user_roles', 'identity_verifications', 'verification_records',
      'freelancer_profiles', 'skills', 'freelancer_skills', 'freelancer_experience',
      'freelancer_certifications', 'portfolios', 'portfolio_projects', 'interview_records',
      'organizations', 'organization_roles', 'organization_members', 'teams', 'team_members',
      'projects', 'project_requirements', 'project_documents', 'project_budgets',
      'development_preferences', 'ai_conversations', 'ai_runs', 'requirement_dna',
      'expertise_dna', 'embeddings', 'matching_runs', 'project_candidates',
      'candidate_responses', 'technical_proposals', 'selections', 'meetings',
      'project_phases', 'milestones', 'project_tasks', 'deliverables', 'calendar_events',
      'phase_submissions', 'evidence_items', 'repository_connections', 'deployment_records',
      'verification_reports', 'project_health', 'health_risks', 'change_requests',
      'change_requirements', 'change_impact_analysis', 'change_documents', 'change_estimates',
      'change_approvals', 'service_requests', 'service_requirements', 'service_documents',
      'service_budgets', 'service_assignments', 'service_phases', 'payment_orders', 'payments',
      'milestone_payments', 'platform_commissions', 'payouts', 'refunds', 'invoices',
      'reconciliation_records', 'certificates', 'notification_preferences'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

COMMIT;
