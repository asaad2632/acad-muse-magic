-- =========================================================================
-- Phase 3 + Phase 4 combined migration
--   Phase 3: notification_reads table (tracks per-user "last read" timestamp)
--   Phase 4: allowed_users allow-list + tighten every RLS policy in the DB
-- =========================================================================

-- ---------------------------------------------------------------
-- Phase 3: notification_reads
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_reads (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_notification_reads_updated_at ON public.notification_reads;
CREATE TRIGGER trg_notification_reads_updated_at
  BEFORE UPDATE ON public.notification_reads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------
-- Phase 4: allowed_users allow-list
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.allowed_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text NOT NULL CHECK (role IN ('researcher', 'supervisor')),
  email   text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.allowed_users TO authenticated;
GRANT ALL ON public.allowed_users TO service_role;
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can READ the allow-list (needed so the client can
-- discover its own role). No INSERT / UPDATE / DELETE for authenticated —
-- only service_role can modify. If a random user signs up, they simply
-- won't appear here, and every other policy will deny them access.
DROP POLICY IF EXISTS "read allowed_users" ON public.allowed_users;
CREATE POLICY "read allowed_users" ON public.allowed_users
  FOR SELECT TO authenticated USING (true);

-- Seed the two production accounts (real emails).
INSERT INTO public.allowed_users (user_id, role, email) VALUES
  ('e8fbafaa-5624-4791-8e56-f9d48902185a', 'researcher', 'loisrylee95@gmail.com'),
  ('070bb4d9-9936-4efd-bd3c-83debff5077a', 'supervisor', 'thanoon76@uomosul.edu.iq')
ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role, email = EXCLUDED.email;

-- Fast helper used by every policy below.
CREATE OR REPLACE FUNCTION public.is_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.allowed_users WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.is_allowed() TO authenticated;


-- ---------------------------------------------------------------
-- Tighten RLS on every existing table (drop legacy open policy,
-- add allowed_users-based policy). Idempotent.
-- ---------------------------------------------------------------

-- helper macro-like block (via DO)
DO $$
DECLARE
  tbl text;
  new_policy_name text;
  legacy_policy_name text;
  tables text[] := ARRAY[
    'sources', 'library_sources', 'bibliography', 'chapters', 'cards',
    'translations', 'custom_formats', 'deleted_base_docs',
    'supervisor_questions', 'supervisor_files', 'supervisor_notes',
    'supervisor_meetings', 'supervisor_decisions', 'supervisor_reports',
    'researcher_analysis'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop legacy open policies (names as created by earlier migrations)
    EXECUTE format('DROP POLICY IF EXISTS "auth all %I" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s auth all" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth all %s" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allowed users all %I" ON public.%I', tbl, tbl);
    -- Create the tight policy
    EXECUTE format(
      'CREATE POLICY %L ON public.%I FOR ALL TO authenticated
         USING (public.is_allowed())
         WITH CHECK (public.is_allowed())',
      'allowed_users_' || tbl,
      tbl
    );
  END LOOP;
END$$;


-- ---------------------------------------------------------------
-- notification_reads own policy (only your own row)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "own notification_reads" ON public.notification_reads;
CREATE POLICY "own notification_reads" ON public.notification_reads FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_allowed())
  WITH CHECK (user_id = auth.uid() AND public.is_allowed());


-- ---------------------------------------------------------------
-- Storage: replace bucket-wide open policies with allow-list policies
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "auth read thesis-files" ON storage.objects;
DROP POLICY IF EXISTS "auth insert thesis-files" ON storage.objects;
DROP POLICY IF EXISTS "auth update thesis-files" ON storage.objects;
DROP POLICY IF EXISTS "auth delete thesis-files" ON storage.objects;

CREATE POLICY "allowed read thesis-files"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'thesis-files' AND public.is_allowed());
CREATE POLICY "allowed insert thesis-files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thesis-files' AND public.is_allowed());
CREATE POLICY "allowed update thesis-files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'thesis-files' AND public.is_allowed());
CREATE POLICY "allowed delete thesis-files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'thesis-files' AND public.is_allowed());
