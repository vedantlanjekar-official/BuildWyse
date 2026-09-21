-- BuildWyse Platform — Row Level Security Policies
-- Run after 001_initial_schema.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Enable RLS on all public tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'user_roles', 'identity_verifications', 'verification_records',
        'freelancer_profiles', 'skills', 'freelancer_skills', 'freelancer_experience',
        'freelancer_certifications', 'portfolios', 'portfolio_projects', 'interview_records',
        'organizations', 'organization_roles', 'organization_members', 'teams', 'team_members',
        'projects', 'project_requirements', 'requirement_versions', 'project_documents',
        'document_versions', 'project_budgets', 'development_preferences',
        'ai_conversations', 'ai_messages', 'ai_runs', 'ai_usage',
        'requirement_dna', 'expertise_dna', 'embeddings',
        'matching_runs', 'match_scores', 'project_candidates', 'candidate_responses',
        'technical_proposals', 'selections', 'meetings',
        'project_phases', 'milestones', 'project_tasks', 'deliverables', 'calendar_events',
        'phase_submissions', 'evidence_items', 'repository_connections', 'deployment_records',
        'verification_reports', 'approval_records', 'rejection_records',
        'project_health', 'health_metrics', 'satisfaction_records', 'health_risks',
        'change_requests', 'change_conversations', 'change_requirements', 'change_impact_analysis',
        'change_documents', 'change_estimates', 'change_approvals',
        'service_requests', 'service_conversations', 'service_requirements', 'service_documents',
        'service_budgets', 'service_assignments', 'service_phases',
        'payment_orders', 'payments', 'milestone_payments', 'platform_commissions',
        'payouts', 'refunds', 'invoices', 'webhook_events', 'reconciliation_records',
        'certificates', 'certificate_verification',
        'notifications', 'notification_preferences', 'audit_logs', 'project_history'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_select_participants ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE (p.client_id = auth.uid() AND p.assigned_freelancer_id = profiles.id)
         OR (p.assigned_freelancer_id = auth.uid() AND p.client_id = profiles.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.organization_members om1
      JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.id
        AND om1.status = 'active' AND om2.status = 'active'
    )
  );

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
CREATE POLICY user_roles_admin_all ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- identity_verifications & verification_records
-- ---------------------------------------------------------------------------
CREATE POLICY identity_verifications_admin_all ON public.identity_verifications
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY identity_verifications_own ON public.identity_verifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY verification_records_admin_all ON public.verification_records
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY verification_records_own ON public.verification_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.identity_verifications iv
      WHERE iv.id = verification_records.identity_verification_id
        AND iv.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.identity_verifications iv
      WHERE iv.id = verification_records.identity_verification_id
        AND iv.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- skills (catalog — readable by all authenticated users)
-- ---------------------------------------------------------------------------
CREATE POLICY skills_admin_all ON public.skills
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY skills_select_all ON public.skills
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin());

-- ---------------------------------------------------------------------------
-- freelancer_profiles & related
-- ---------------------------------------------------------------------------
CREATE POLICY freelancer_profiles_admin_all ON public.freelancer_profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY freelancer_profiles_select_public ON public.freelancer_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY freelancer_profiles_manage_own ON public.freelancer_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY freelancer_skills_admin_all ON public.freelancer_skills
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY freelancer_skills_own ON public.freelancer_skills
  FOR ALL TO authenticated
  USING (public.owns_freelancer_profile(freelancer_id))
  WITH CHECK (public.owns_freelancer_profile(freelancer_id));

CREATE POLICY freelancer_skills_select_all ON public.freelancer_skills
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY freelancer_experience_admin_all ON public.freelancer_experience
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY freelancer_experience_own ON public.freelancer_experience
  FOR ALL TO authenticated
  USING (public.owns_freelancer_profile(freelancer_id))
  WITH CHECK (public.owns_freelancer_profile(freelancer_id));

CREATE POLICY freelancer_experience_select_all ON public.freelancer_experience
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY freelancer_certifications_admin_all ON public.freelancer_certifications
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY freelancer_certifications_own ON public.freelancer_certifications
  FOR ALL TO authenticated
  USING (public.owns_freelancer_profile(freelancer_id))
  WITH CHECK (public.owns_freelancer_profile(freelancer_id));

CREATE POLICY freelancer_certifications_select_all ON public.freelancer_certifications
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY portfolios_admin_all ON public.portfolios
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY portfolios_own ON public.portfolios
  FOR ALL TO authenticated
  USING (public.owns_freelancer_profile(freelancer_id))
  WITH CHECK (public.owns_freelancer_profile(freelancer_id));

CREATE POLICY portfolios_select_public ON public.portfolios
  FOR SELECT TO authenticated
  USING (is_public = true OR public.owns_freelancer_profile(freelancer_id));

CREATE POLICY portfolio_projects_admin_all ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY portfolio_projects_own ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios po
      WHERE po.id = portfolio_projects.portfolio_id
        AND public.owns_freelancer_profile(po.freelancer_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios po
      WHERE po.id = portfolio_projects.portfolio_id
        AND public.owns_freelancer_profile(po.freelancer_id)
    )
  );

CREATE POLICY portfolio_projects_select_public ON public.portfolio_projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios po
      WHERE po.id = portfolio_projects.portfolio_id
        AND (po.is_public = true OR public.owns_freelancer_profile(po.freelancer_id))
    )
  );

CREATE POLICY interview_records_admin_all ON public.interview_records
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY interview_records_own ON public.interview_records
  FOR SELECT TO authenticated
  USING (public.owns_freelancer_profile(freelancer_id));

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
CREATE POLICY organizations_admin_all ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY organizations_member_select ON public.organizations
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_member(id));

CREATE POLICY organizations_owner_manage ON public.organizations
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY organization_roles_admin_all ON public.organization_roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY organization_roles_member ON public.organization_roles
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY organization_roles_owner_manage ON public.organization_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_roles.organization_id AND o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_roles.organization_id AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY organization_members_admin_all ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY organization_members_select ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(organization_id));

CREATE POLICY organization_members_owner_manage ON public.organization_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY teams_admin_all ON public.teams
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY teams_org_member ON public.teams
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR leader_id = auth.uid());

CREATE POLICY teams_leader_manage ON public.teams
  FOR ALL TO authenticated
  USING (leader_id = auth.uid())
  WITH CHECK (leader_id = auth.uid());

CREATE POLICY team_members_admin_all ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY team_members_select ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND (t.leader_id = auth.uid() OR public.is_org_member(t.organization_id))
    )
  );

CREATE POLICY team_members_leader_manage ON public.team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.leader_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.leader_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- projects & project-scoped tables (macro pattern)
-- ---------------------------------------------------------------------------
CREATE POLICY projects_admin_all ON public.projects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY projects_client_manage ON public.projects
  FOR ALL TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY projects_participant_select ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_project_participant(id));

-- project child tables helper via project_id
-- project_requirements
CREATE POLICY project_requirements_admin_all ON public.project_requirements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_requirements_participant ON public.project_requirements
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY requirement_versions_admin_all ON public.requirement_versions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY requirement_versions_participant ON public.requirement_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_requirements pr
      WHERE pr.id = requirement_versions.requirement_id
        AND public.is_project_participant(pr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_requirements pr
      WHERE pr.id = requirement_versions.requirement_id
        AND public.is_project_participant(pr.project_id)
    )
  );

CREATE POLICY project_documents_admin_all ON public.project_documents
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_documents_participant ON public.project_documents
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY document_versions_admin_all ON public.document_versions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY document_versions_participant ON public.document_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_documents pd
      WHERE pd.id = document_versions.document_id
        AND public.is_project_participant(pd.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_documents pd
      WHERE pd.id = document_versions.document_id
        AND public.is_project_participant(pd.project_id)
    )
  );

CREATE POLICY project_budgets_admin_all ON public.project_budgets
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_budgets_participant ON public.project_budgets
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY development_preferences_admin_all ON public.development_preferences
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY development_preferences_participant ON public.development_preferences
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

-- ---------------------------------------------------------------------------
-- AI module
-- ---------------------------------------------------------------------------
CREATE POLICY ai_conversations_admin_all ON public.ai_conversations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ai_conversations_own ON public.ai_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (project_id IS NOT NULL AND public.is_project_participant(project_id)))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_messages_admin_all ON public.ai_messages
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ai_messages_participant ON public.ai_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id
        AND (ac.user_id = auth.uid() OR (ac.project_id IS NOT NULL AND public.is_project_participant(ac.project_id)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY ai_runs_admin_all ON public.ai_runs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ai_runs_own ON public.ai_runs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (project_id IS NOT NULL AND public.is_project_participant(project_id)));

CREATE POLICY ai_usage_admin_all ON public.ai_usage
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ai_usage_own ON public.ai_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (project_id IS NOT NULL AND public.is_project_participant(project_id)));

CREATE POLICY requirement_dna_admin_all ON public.requirement_dna
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY requirement_dna_participant ON public.requirement_dna
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY expertise_dna_admin_all ON public.expertise_dna
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY expertise_dna_own ON public.expertise_dna
  FOR ALL TO authenticated
  USING (public.owns_freelancer_profile(freelancer_id))
  WITH CHECK (public.owns_freelancer_profile(freelancer_id));
CREATE POLICY expertise_dna_select_matching ON public.expertise_dna
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY embeddings_admin_all ON public.embeddings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY embeddings_select_authenticated ON public.embeddings
  FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Matching
-- ---------------------------------------------------------------------------
CREATE POLICY matching_runs_admin_all ON public.matching_runs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY matching_runs_participant ON public.matching_runs
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY match_scores_admin_all ON public.match_scores
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY match_scores_participant ON public.match_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matching_runs mr
      WHERE mr.id = match_scores.matching_run_id
        AND public.is_project_participant(mr.project_id)
    )
    OR public.owns_freelancer_profile(freelancer_id)
  );

CREATE POLICY project_candidates_admin_all ON public.project_candidates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_candidates_participant ON public.project_candidates
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));
CREATE POLICY project_candidates_freelancer_select ON public.project_candidates
  FOR SELECT TO authenticated
  USING (public.owns_freelancer_profile(freelancer_id));

CREATE POLICY candidate_responses_admin_all ON public.candidate_responses
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY candidate_responses_participant ON public.candidate_responses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_candidates pc
      WHERE pc.id = candidate_responses.candidate_id
        AND public.is_project_participant(pc.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_candidates pc
      WHERE pc.id = candidate_responses.candidate_id
        AND (public.is_project_participant(pc.project_id) OR public.owns_freelancer_profile(pc.freelancer_id))
    )
  );

CREATE POLICY technical_proposals_admin_all ON public.technical_proposals
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY technical_proposals_participant ON public.technical_proposals
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY selections_admin_all ON public.selections
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY selections_participant ON public.selections
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_client(project_id));

CREATE POLICY meetings_admin_all ON public.meetings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY meetings_participant ON public.meetings
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

-- ---------------------------------------------------------------------------
-- Execution
-- ---------------------------------------------------------------------------
CREATE POLICY project_phases_admin_all ON public.project_phases
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_phases_participant ON public.project_phases
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY milestones_admin_all ON public.milestones
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY milestones_participant ON public.milestones
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY project_tasks_admin_all ON public.project_tasks
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_tasks_participant ON public.project_tasks
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY deliverables_admin_all ON public.deliverables
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY deliverables_participant ON public.deliverables
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY calendar_events_admin_all ON public.calendar_events
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY calendar_events_participant ON public.calendar_events
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY phase_submissions_admin_all ON public.phase_submissions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY phase_submissions_participant ON public.phase_submissions
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY evidence_items_admin_all ON public.evidence_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY evidence_items_participant ON public.evidence_items
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY repository_connections_admin_all ON public.repository_connections
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY repository_connections_participant ON public.repository_connections
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY deployment_records_admin_all ON public.deployment_records
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY deployment_records_participant ON public.deployment_records
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY verification_reports_admin_all ON public.verification_reports
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY verification_reports_participant ON public.verification_reports
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY approval_records_admin_all ON public.approval_records
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY approval_records_participant ON public.approval_records
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY rejection_records_admin_all ON public.rejection_records
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY rejection_records_participant ON public.rejection_records
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

-- ---------------------------------------------------------------------------
-- Health
-- ---------------------------------------------------------------------------
CREATE POLICY project_health_admin_all ON public.project_health
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_health_participant ON public.project_health
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY health_metrics_admin_all ON public.health_metrics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY health_metrics_participant ON public.health_metrics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_health ph
      WHERE ph.id = health_metrics.project_health_id
        AND public.is_project_participant(ph.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_health ph
      WHERE ph.id = health_metrics.project_health_id
        AND public.is_project_participant(ph.project_id)
    )
  );

CREATE POLICY satisfaction_records_admin_all ON public.satisfaction_records
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY satisfaction_records_participant ON public.satisfaction_records
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY health_risks_admin_all ON public.health_risks
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY health_risks_participant ON public.health_risks
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

-- ---------------------------------------------------------------------------
-- CRMS
-- ---------------------------------------------------------------------------
CREATE POLICY change_requests_admin_all ON public.change_requests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY change_requests_participant ON public.change_requests
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY change_conversations_admin_all ON public.change_conversations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY change_conversations_participant ON public.change_conversations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_conversations.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_conversations.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  );

CREATE POLICY change_requirements_admin_all ON public.change_requirements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY change_requirements_participant ON public.change_requirements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_requirements.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_requirements.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  );

CREATE POLICY change_impact_analysis_admin_all ON public.change_impact_analysis
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY change_impact_analysis_participant ON public.change_impact_analysis
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_impact_analysis.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_impact_analysis.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  );

CREATE POLICY change_documents_admin_all ON public.change_documents
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY change_documents_participant ON public.change_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_documents.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_documents.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  );

CREATE POLICY change_estimates_admin_all ON public.change_estimates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY change_estimates_participant ON public.change_estimates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_estimates.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_estimates.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  );

CREATE POLICY change_approvals_admin_all ON public.change_approvals
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY change_approvals_participant ON public.change_approvals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_approvals.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_requests cr
      WHERE cr.id = change_approvals.change_request_id
        AND public.is_project_participant(cr.project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- ASSM
-- ---------------------------------------------------------------------------
CREATE POLICY service_requests_admin_all ON public.service_requests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY service_requests_participant ON public.service_requests
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY service_conversations_admin_all ON public.service_conversations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY service_conversations_participant ON public.service_conversations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_conversations.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_conversations.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  );

CREATE POLICY service_requirements_admin_all ON public.service_requirements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY service_requirements_participant ON public.service_requirements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_requirements.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_requirements.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  );

CREATE POLICY service_documents_admin_all ON public.service_documents
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY service_documents_participant ON public.service_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_documents.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_documents.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  );

CREATE POLICY service_budgets_admin_all ON public.service_budgets
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY service_budgets_participant ON public.service_budgets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_budgets.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_budgets.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  );

CREATE POLICY service_assignments_admin_all ON public.service_assignments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY service_assignments_participant ON public.service_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_assignments.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
    OR assignee_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_assignments.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  );

CREATE POLICY service_phases_admin_all ON public.service_phases
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY service_phases_participant ON public.service_phases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_phases.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_phases.service_request_id
        AND public.is_project_participant(sr.project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
CREATE POLICY payment_orders_admin_all ON public.payment_orders
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY payment_orders_participant ON public.payment_orders
  FOR ALL TO authenticated
  USING (client_id = auth.uid() OR public.is_project_participant(project_id))
  WITH CHECK (client_id = auth.uid() OR public.is_project_client(project_id));

CREATE POLICY payments_admin_all ON public.payments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY payments_participant ON public.payments
  FOR ALL TO authenticated
  USING (payer_id = auth.uid() OR public.is_project_participant(project_id))
  WITH CHECK (payer_id = auth.uid() OR public.is_project_client(project_id));

CREATE POLICY milestone_payments_admin_all ON public.milestone_payments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY milestone_payments_participant ON public.milestone_payments
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY platform_commissions_admin_all ON public.platform_commissions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY platform_commissions_participant ON public.platform_commissions
  FOR SELECT TO authenticated
  USING (public.is_project_participant(project_id));

CREATE POLICY payouts_admin_all ON public.payouts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY payouts_recipient ON public.payouts
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.is_project_participant(project_id));

CREATE POLICY refunds_admin_all ON public.refunds
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY refunds_participant ON public.refunds
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id) OR requested_by = auth.uid())
  WITH CHECK (public.is_project_participant(project_id));

CREATE POLICY invoices_admin_all ON public.invoices
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY invoices_participant ON public.invoices
  FOR ALL TO authenticated
  USING (billed_to = auth.uid() OR public.is_project_participant(project_id))
  WITH CHECK (billed_to = auth.uid() OR public.is_project_client(project_id));

CREATE POLICY webhook_events_admin_all ON public.webhook_events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY reconciliation_records_admin_all ON public.reconciliation_records
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Certification
-- ---------------------------------------------------------------------------
CREATE POLICY certificates_admin_all ON public.certificates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY certificates_participant ON public.certificates
  FOR SELECT TO authenticated
  USING (issued_to = auth.uid() OR public.is_project_participant(project_id));

CREATE POLICY certificate_verification_admin_all ON public.certificate_verification
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY certificate_verification_public_read ON public.certificate_verification
  FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Platform
-- ---------------------------------------------------------------------------
CREATE POLICY notifications_admin_all ON public.notifications
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY notifications_own ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_admin_all ON public.notification_preferences
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY notification_preferences_own ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY audit_logs_admin_all ON public.audit_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY audit_logs_actor_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.is_admin());

CREATE POLICY project_history_admin_all ON public.project_history
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_history_participant ON public.project_history
  FOR ALL TO authenticated
  USING (public.is_project_participant(project_id))
  WITH CHECK (public.is_project_participant(project_id));

COMMIT;
