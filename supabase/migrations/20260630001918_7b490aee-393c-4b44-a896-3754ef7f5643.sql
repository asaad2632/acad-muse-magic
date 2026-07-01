
ALTER TABLE public.library_sources
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS key_points JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS library_sources_user_client_uk
  ON public.library_sources(user_id, client_id) WHERE client_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_library_sources_updated_at ON public.library_sources;
CREATE TRIGGER update_library_sources_updated_at
  BEFORE UPDATE ON public.library_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
