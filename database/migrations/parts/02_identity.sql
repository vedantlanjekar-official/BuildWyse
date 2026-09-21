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
