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
