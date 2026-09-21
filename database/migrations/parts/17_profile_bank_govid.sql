-- Government ID types + bank / card profile fields
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS government_id_type TEXT,
  ADD COLUMN IF NOT EXISTS government_id_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
  ADD COLUMN IF NOT EXISTS card_type TEXT,
  ADD COLUMN IF NOT EXISTS card_number TEXT,
  ADD COLUMN IF NOT EXISTS card_expiry TEXT;

UPDATE public.profiles
SET government_id_type = COALESCE(government_id_type, 'aadhaar'),
    government_id_number = COALESCE(government_id_number, aadhaar_number)
WHERE aadhaar_number IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_government_id_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_government_id_type_check
      CHECK (
        government_id_type IS NULL OR government_id_type IN (
          'aadhaar', 'pan', 'passport', 'driving_license', 'voter_id'
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_card_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_card_type_check
      CHECK (
        card_type IS NULL OR card_type IN ('visa', 'mastercard', 'rupay', 'amex', 'other')
      );
  END IF;
END $$;
