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
