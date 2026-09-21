-- Connect: project chat + meeting approval workflow + Google Meet fields
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 8000),
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'system', 'meeting_share')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_messages_project_id_created
  ON public.project_messages (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_messages_sender_id
  ON public.project_messages (sender_id);

-- Expand meetings for propose → approve flow and calendar linkage
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_approval_from UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendee_client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendee_freelancer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Relax / replace status check to include approval states
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IN (
    'pending_approval',
    'scheduled',
    'approved',
    'rejected',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  ));

UPDATE public.meetings
SET subject = COALESCE(subject, title)
WHERE subject IS NULL;

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_messages_project_access ON public.project_messages;
CREATE POLICY project_messages_project_access ON public.project_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_messages.project_id
        AND (
          p.client_id = auth.uid()
          OR p.assigned_freelancer_id = auth.uid()
          OR public.is_admin()
        )
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_messages.project_id
        AND (
          p.client_id = auth.uid()
          OR p.assigned_freelancer_id = auth.uid()
          OR public.is_admin()
        )
    )
  );
