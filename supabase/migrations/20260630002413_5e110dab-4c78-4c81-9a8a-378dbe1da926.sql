
-- Phase 3c: add client_id + updated_at to enable shared-workspace sync for the remaining tables.
ALTER TABLE public.bibliography     ADD COLUMN IF NOT EXISTS client_id text, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.cards            ADD COLUMN IF NOT EXISTS client_id text, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.translations     ADD COLUMN IF NOT EXISTS client_id text, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.custom_formats   ADD COLUMN IF NOT EXISTS client_id text, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.researcher_analysis ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS bibliography_user_client_uniq   ON public.bibliography   (user_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cards_user_client_uniq          ON public.cards          (user_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS translations_user_client_uniq   ON public.translations   (user_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS custom_formats_user_client_uniq ON public.custom_formats (user_id, client_id) WHERE client_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_bibliography_updated_at   ON public.bibliography;
DROP TRIGGER IF EXISTS trg_cards_updated_at          ON public.cards;
DROP TRIGGER IF EXISTS trg_translations_updated_at   ON public.translations;
DROP TRIGGER IF EXISTS trg_custom_formats_updated_at ON public.custom_formats;
DROP TRIGGER IF EXISTS trg_researcher_analysis_updated_at ON public.researcher_analysis;

CREATE TRIGGER trg_bibliography_updated_at   BEFORE UPDATE ON public.bibliography   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cards_updated_at          BEFORE UPDATE ON public.cards          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_translations_updated_at   BEFORE UPDATE ON public.translations   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_custom_formats_updated_at BEFORE UPDATE ON public.custom_formats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_researcher_analysis_updated_at BEFORE UPDATE ON public.researcher_analysis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
