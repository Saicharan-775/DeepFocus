-- DeepFocus: checkbox-only review changes should not reorder revision rows.
-- Solving/upserting through the extension still bumps updated_at in sync_focus_event.

CREATE OR REPLACE FUNCTION public.set_revision_problem_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF to_jsonb(NEW) - 'revision_needed' - 'updated_at'
     = to_jsonb(OLD) - 'revision_needed' - 'updated_at' THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;
