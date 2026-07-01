
-- Phase 3a additions: persist user-added sources by client id, and deletion blacklist for base docs

ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS client_id text;
CREATE UNIQUE INDEX IF NOT EXISTS sources_user_client_id_uniq ON public.sources(user_id, client_id) WHERE client_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.deleted_base_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  base_doc_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, base_doc_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deleted_base_docs TO authenticated;
GRANT ALL ON public.deleted_base_docs TO service_role;

ALTER TABLE public.deleted_base_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deleted_base_docs auth all" ON public.deleted_base_docs
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
