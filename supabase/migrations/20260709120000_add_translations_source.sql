-- Distinguish translation-log entries saved from the Groq translator vs. the Gemini
-- historical-analysis path. Default keeps existing rows classified as 'groq'.
ALTER TABLE public.translations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'groq';
