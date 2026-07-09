-- library_sources never had an archival-reference column, so any value a user
-- typed into the "رقم الوثيقة" field was silently dropped on the next reload
-- (cloud is treated as the single source of truth on hydration).
ALTER TABLE public.library_sources
  ADD COLUMN IF NOT EXISTS archive_ref text;
