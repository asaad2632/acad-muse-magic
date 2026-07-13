-- AcadArchiv — plain PostgreSQL schema for Neon Postgres.
-- Ported 1:1 from supabase/migrations/*.sql, with two simplifications:
--   1. auth.users + allowed_users (Supabase-specific) are merged into a single
--      local `users` table (id, email, password_hash, role, token_version).
--   2. RLS policies / GRANTs / realtime publication are dropped — this schema
--      has no PostgREST in front of it, so access control lives entirely in
--      the application server (src/dataAccess.server.ts + src/routes/api/data/*.ts).
-- Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ================================================================
-- users (replaces Supabase auth.users + allowed_users)
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('researcher', 'supervisor')),
  token_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- sources
-- ================================================================
CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text,
  author text,
  year text,
  source_type text,
  category text,
  chapter_id integer,
  section_id text,
  archive_ref text,
  priority text DEFAULT '★★',
  notes text,
  status text DEFAULT 'لم يُراجع',
  is_new boolean DEFAULT false,
  publisher text,
  place text,
  university text,
  college text,
  journal text,
  volume text,
  issue text,
  pages text,
  url text,
  access_date text,
  edition text,
  degree text,
  newspaper text,
  institution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text
);
CREATE UNIQUE INDEX IF NOT EXISTS sources_user_client_id_uniq
  ON sources(user_id, client_id) WHERE client_id IS NOT NULL;

-- ================================================================
-- library_sources
-- ================================================================
CREATE TABLE IF NOT EXISTS library_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  file_name text,
  file_type text,
  file_size bigint,
  upload_date text,
  status text DEFAULT 'جاري التحليل',
  analyzed boolean DEFAULT false,
  title text,
  author text,
  year text,
  language text,
  source_type text,
  chapter_id integer,
  section_id text,
  sub_section_id text,
  priority text DEFAULT '★★',
  important_pages text,
  summary text,
  keywords text[],
  why_important text,
  how_to_use text,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  key_points jsonb DEFAULT '[]'::jsonb,
  storage_path text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  archive_ref text
);
CREATE UNIQUE INDEX IF NOT EXISTS library_sources_user_client_uk
  ON library_sources(user_id, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS update_library_sources_updated_at ON library_sources;
CREATE TRIGGER update_library_sources_updated_at
  BEFORE UPDATE ON library_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- bibliography
-- ================================================================
CREATE TABLE IF NOT EXISTS bibliography (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  doc_id text,
  section text,
  author text,
  title text,
  year text,
  category text,
  bib_entry text,
  sort_key text,
  added_at text,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bibliography_user_client_uniq
  ON bibliography(user_id, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_bibliography_updated_at ON bibliography;
CREATE TRIGGER trg_bibliography_updated_at
  BEFORE UPDATE ON bibliography
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- chapters
-- ================================================================
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  chapter_id integer NOT NULL,
  title_ar text,
  color text,
  sections jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);

-- ================================================================
-- cards
-- ================================================================
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text,
  topic text,
  date text,
  chapter_id integer,
  section_id text,
  tags text[],
  notes text,
  ai_content text,
  related_doc_ids text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cards_user_client_uniq
  ON cards(user_id, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_cards_updated_at ON cards;
CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- translations
-- ================================================================
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  file_name text,
  original_text text,
  translation text,
  key_points jsonb,
  doc_meta jsonb,
  saved_at text,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'groq'
);
CREATE UNIQUE INDEX IF NOT EXISTS translations_user_client_uniq
  ON translations(user_id, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_translations_updated_at ON translations;
CREATE TRIGGER trg_translations_updated_at
  BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- custom_formats
-- ================================================================
CREATE TABLE IF NOT EXISTS custom_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text,
  templates jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS custom_formats_user_client_uniq
  ON custom_formats(user_id, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_custom_formats_updated_at ON custom_formats;
CREATE TRIGGER trg_custom_formats_updated_at
  BEFORE UPDATE ON custom_formats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- deleted_base_docs
-- ================================================================
CREATE TABLE IF NOT EXISTS deleted_base_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_doc_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, base_doc_id)
);

-- ================================================================
-- researcher_analysis
-- ================================================================
CREATE TABLE IF NOT EXISTS researcher_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  chapter_id integer,
  section_id text,
  content text,
  version integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_researcher_analysis_updated_at ON researcher_analysis;
CREATE TRIGGER trg_researcher_analysis_updated_at
  BEFORE UPDATE ON researcher_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- Supervisor Room tables (owner column is created_by / uploaded_by)
-- ================================================================

CREATE TABLE IF NOT EXISTS supervisor_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  chapter text,
  note_type text,
  content text,
  date text,
  priority text,
  student_reply text,
  status text DEFAULT 'قيد المعالجة',
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_questions_creator_client_uidx
  ON supervisor_questions(created_by, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_supervisor_questions_updated_at ON supervisor_questions;
CREATE TRIGGER trg_supervisor_questions_updated_at
  BEFORE UPDATE ON supervisor_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS supervisor_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES users(id) ON DELETE CASCADE,
  chapter text,
  version text,
  upload_date text,
  note text,
  file_name text,
  file_type text,
  file_url text,
  status text DEFAULT 'بانتظار المراجعة',
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  storage_path text,
  file_size bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_files_uploader_client_uidx
  ON supervisor_files(uploaded_by, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_supervisor_files_updated_at ON supervisor_files;
CREATE TRIGGER trg_supervisor_files_updated_at
  BEFORE UPDATE ON supervisor_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS supervisor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  chapter text,
  section text,
  note_type text,
  content text,
  date text,
  done boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_notes_creator_client_uidx
  ON supervisor_notes(created_by, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_supervisor_notes_updated_at ON supervisor_notes;
CREATE TRIGGER trg_supervisor_notes_updated_at
  BEFORE UPDATE ON supervisor_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS supervisor_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  meeting_date text,
  location text,
  summary text,
  decisions text,
  next_requirements text,
  next_meeting_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_meetings_creator_client_uidx
  ON supervisor_meetings(created_by, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_supervisor_meetings_updated_at ON supervisor_meetings;
CREATE TRIGGER trg_supervisor_meetings_updated_at
  BEFORE UPDATE ON supervisor_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS supervisor_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  subject text,
  decision_type text,
  content text,
  date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_decisions_creator_client_uidx
  ON supervisor_decisions(created_by, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_supervisor_decisions_updated_at ON supervisor_decisions;
CREATE TRIGGER trg_supervisor_decisions_updated_at
  BEFORE UPDATE ON supervisor_decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS supervisor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  content text,
  saved_at text,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_reports_creator_client_uidx
  ON supervisor_reports(created_by, client_id) WHERE client_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_supervisor_reports_updated_at ON supervisor_reports;
CREATE TRIGGER trg_supervisor_reports_updated_at
  BEFORE UPDATE ON supervisor_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- notification_reads
-- ================================================================
CREATE TABLE IF NOT EXISTS notification_reads (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_notification_reads_updated_at ON notification_reads;
CREATE TRIGGER trg_notification_reads_updated_at
  BEFORE UPDATE ON notification_reads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
