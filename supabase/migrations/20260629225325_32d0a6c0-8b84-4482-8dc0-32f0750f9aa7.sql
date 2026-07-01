
-- =========================================================
-- Helper: shared open policy macro (auth.uid() IS NOT NULL)
-- =========================================================

-- ---------- sources ----------
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all sources" ON public.sources FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- library_sources ----------
CREATE TABLE public.library_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_sources TO authenticated;
GRANT ALL ON public.library_sources TO service_role;
ALTER TABLE public.library_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all library_sources" ON public.library_sources FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- bibliography ----------
CREATE TABLE public.bibliography (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_id text,
  section text,
  author text,
  title text,
  year text,
  category text,
  bib_entry text,
  sort_key text,
  added_at text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bibliography TO authenticated;
GRANT ALL ON public.bibliography TO service_role;
ALTER TABLE public.bibliography ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all bibliography" ON public.bibliography FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- chapters ----------
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id integer NOT NULL,
  title_ar text,
  color text,
  sections jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all chapters" ON public.chapters FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- cards ----------
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  topic text,
  date text,
  chapter_id integer,
  section_id text,
  tags text[],
  notes text,
  ai_content text,
  related_doc_ids text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cards" ON public.cards FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- translations ----------
CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text,
  original_text text,
  translation text,
  key_points jsonb,
  doc_meta jsonb,
  saved_at text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.translations TO authenticated;
GRANT ALL ON public.translations TO service_role;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all translations" ON public.translations FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- custom_formats ----------
CREATE TABLE public.custom_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  templates jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_formats TO authenticated;
GRANT ALL ON public.custom_formats TO service_role;
ALTER TABLE public.custom_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all custom_formats" ON public.custom_formats FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- supervisor_questions ----------
CREATE TABLE public.supervisor_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter text,
  note_type text,
  content text,
  date text,
  priority text,
  student_reply text,
  status text DEFAULT 'قيد المعالجة',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_questions TO authenticated;
GRANT ALL ON public.supervisor_questions TO service_role;
ALTER TABLE public.supervisor_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all supervisor_questions" ON public.supervisor_questions FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
ALTER TABLE public.supervisor_questions REPLICA IDENTITY FULL;

-- ---------- supervisor_files ----------
CREATE TABLE public.supervisor_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter text,
  version text,
  upload_date text,
  note text,
  file_name text,
  file_type text,
  file_url text,
  status text DEFAULT 'بانتظار المراجعة',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_files TO authenticated;
GRANT ALL ON public.supervisor_files TO service_role;
ALTER TABLE public.supervisor_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all supervisor_files" ON public.supervisor_files FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
ALTER TABLE public.supervisor_files REPLICA IDENTITY FULL;

-- ---------- supervisor_notes ----------
CREATE TABLE public.supervisor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter text,
  section text,
  note_type text,
  content text,
  date text,
  done boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_notes TO authenticated;
GRANT ALL ON public.supervisor_notes TO service_role;
ALTER TABLE public.supervisor_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all supervisor_notes" ON public.supervisor_notes FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
ALTER TABLE public.supervisor_notes REPLICA IDENTITY FULL;

-- ---------- supervisor_meetings ----------
CREATE TABLE public.supervisor_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_date text,
  location text,
  summary text,
  decisions text,
  next_requirements text,
  next_meeting_date text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_meetings TO authenticated;
GRANT ALL ON public.supervisor_meetings TO service_role;
ALTER TABLE public.supervisor_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all supervisor_meetings" ON public.supervisor_meetings FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- supervisor_decisions ----------
CREATE TABLE public.supervisor_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  decision_type text,
  content text,
  date text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_decisions TO authenticated;
GRANT ALL ON public.supervisor_decisions TO service_role;
ALTER TABLE public.supervisor_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all supervisor_decisions" ON public.supervisor_decisions FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
ALTER TABLE public.supervisor_decisions REPLICA IDENTITY FULL;

-- ---------- supervisor_reports ----------
CREATE TABLE public.supervisor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  saved_at text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_reports TO authenticated;
GRANT ALL ON public.supervisor_reports TO service_role;
ALTER TABLE public.supervisor_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all supervisor_reports" ON public.supervisor_reports FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- researcher_analysis ----------
CREATE TABLE public.researcher_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id integer,
  section_id text,
  content text,
  version integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.researcher_analysis TO authenticated;
GRANT ALL ON public.researcher_analysis TO service_role;
ALTER TABLE public.researcher_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all researcher_analysis" ON public.researcher_analysis FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
ALTER TABLE public.researcher_analysis REPLICA IDENTITY FULL;

-- ---------- Realtime publication ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.researcher_analysis;

-- ---------- Storage RLS for thesis-files bucket (bucket created via tool after migration) ----------
CREATE POLICY "auth read thesis-files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'thesis-files');
CREATE POLICY "auth insert thesis-files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'thesis-files');
CREATE POLICY "auth update thesis-files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'thesis-files');
CREATE POLICY "auth delete thesis-files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'thesis-files');
