
-- Phase 3d: Add client_id, updated_at, storage_path to supervisor_* tables + triggers + unique indexes

ALTER TABLE public.supervisor_questions
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.supervisor_files
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.supervisor_notes
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.supervisor_meetings
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.supervisor_decisions
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.supervisor_reports
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique indexes for upsert (scoped to creator)
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_questions_creator_client_uidx ON public.supervisor_questions (created_by, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_files_uploader_client_uidx ON public.supervisor_files (uploaded_by, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_notes_creator_client_uidx ON public.supervisor_notes (created_by, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_meetings_creator_client_uidx ON public.supervisor_meetings (created_by, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_decisions_creator_client_uidx ON public.supervisor_decisions (created_by, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_reports_creator_client_uidx ON public.supervisor_reports (created_by, client_id) WHERE client_id IS NOT NULL;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_supervisor_questions_updated_at ON public.supervisor_questions;
CREATE TRIGGER trg_supervisor_questions_updated_at BEFORE UPDATE ON public.supervisor_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_supervisor_files_updated_at ON public.supervisor_files;
CREATE TRIGGER trg_supervisor_files_updated_at BEFORE UPDATE ON public.supervisor_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_supervisor_notes_updated_at ON public.supervisor_notes;
CREATE TRIGGER trg_supervisor_notes_updated_at BEFORE UPDATE ON public.supervisor_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_supervisor_meetings_updated_at ON public.supervisor_meetings;
CREATE TRIGGER trg_supervisor_meetings_updated_at BEFORE UPDATE ON public.supervisor_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_supervisor_decisions_updated_at ON public.supervisor_decisions;
CREATE TRIGGER trg_supervisor_decisions_updated_at BEFORE UPDATE ON public.supervisor_decisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_supervisor_reports_updated_at ON public.supervisor_reports;
CREATE TRIGGER trg_supervisor_reports_updated_at BEFORE UPDATE ON public.supervisor_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
