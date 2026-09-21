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


