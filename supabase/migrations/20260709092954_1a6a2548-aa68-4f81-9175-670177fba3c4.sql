ALTER TABLE public.library_sources
  ADD COLUMN IF NOT EXISTS archive_ref text;