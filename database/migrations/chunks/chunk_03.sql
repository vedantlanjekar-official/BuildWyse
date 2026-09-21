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


