-- BuildWyse Platform â€” Initial Schema Migration
-- PostgreSQL / Supabase compatible
-- Run as a single migration

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
