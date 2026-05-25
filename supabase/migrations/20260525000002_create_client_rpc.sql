-- ============================================================
-- Migration 20260525000002 : RPC create_client
-- Crée un compte client (auth + profil) depuis l'app mobile
-- sans accès admin SDK.
-- ============================================================

-- Met à jour le trigger handle_new_user pour copier l'email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- RPC : crée un compte auth + profil client pour la company du caller
CREATE OR REPLACE FUNCTION public.create_client(
  p_email    text,
  p_full_name text,
  p_phone    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := gen_random_uuid();
  v_company_id uuid;
BEGIN
  -- Seuls admin/manager/super_admin peuvent créer des clients
  IF NOT (public.auth_role() IN ('super_admin', 'admin', 'manager')) THEN
    RAISE EXCEPTION 'Permission refusée : rôle insuffisant';
  END IF;

  v_company_id := public.auth_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Aucune company associée à ce compte';
  END IF;

  -- Créer le compte Supabase Auth (email confirmé, mot de passe aléatoire)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(),
    now()
  );

  -- Le trigger handle_new_user a créé la ligne public.users
  -- On la met à jour avec les données du client
  UPDATE public.users
  SET
    company_id = v_company_id,
    role       = 'client',
    full_name  = p_full_name,
    phone      = p_phone,
    email      = p_email
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;

-- Accorder l'exécution aux users authentifiés (la vérification de rôle est dans la fonction)
GRANT EXECUTE ON FUNCTION public.create_client(text, text, text) TO authenticated;
