-- Multiple bank / card payment methods with one autopay selection
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('bank', 'card')),
  label TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  account_holder_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  card_type TEXT CHECK (card_type IS NULL OR card_type IN ('visa', 'mastercard', 'rupay', 'amex', 'other')),
  card_number TEXT,
  card_expiry TEXT,
  is_autopay BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_one_autopay_per_user
  ON public.payment_methods (user_id)
  WHERE is_autopay = true;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_methods_own ON public.payment_methods;
CREATE POLICY payment_methods_own ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
