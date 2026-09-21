-- Create profile + role (+ freelancer row) on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct text := lower(coalesce(NEW.raw_user_meta_data->>'account_type', 'client'));
  fname text := coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
  role_name text;
BEGIN
  IF acct NOT IN ('client', 'freelancer', 'enterprise', 'admin') THEN
    acct := 'client';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, account_type, verification_status)
  VALUES (NEW.id, NEW.email, fname, acct, 'unverified')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        account_type = CASE
          WHEN public.profiles.account_type = 'admin' THEN public.profiles.account_type
          WHEN public.profiles.account_type = 'client' AND EXCLUDED.account_type <> 'client' THEN EXCLUDED.account_type
          ELSE public.profiles.account_type
        END,
        updated_at = now();

  role_name := CASE WHEN acct = 'enterprise' THEN 'org_manager' ELSE acct END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, role_name)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF acct = 'freelancer' THEN
    INSERT INTO public.freelancer_profiles (user_id, headline, availability_status, platform_certified, interview_status, metadata)
    VALUES (NEW.id, COALESCE(fname, 'Freelancer'), 'available', false, 'not_started', '{}'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
