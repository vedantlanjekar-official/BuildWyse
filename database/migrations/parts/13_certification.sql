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
