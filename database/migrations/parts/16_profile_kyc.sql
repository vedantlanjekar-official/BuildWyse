-- Profile KYC enrichment + OTP challenges
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS government_id_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aadhaar_number TEXT,
  ADD COLUMN IF NOT EXISTS government_id_url TEXT;

CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'phone')),
  destination TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_user_channel
  ON public.otp_challenges (user_id, channel, created_at DESC);

ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS otp_challenges_own ON public.otp_challenges;
CREATE POLICY otp_challenges_own ON public.otp_challenges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
