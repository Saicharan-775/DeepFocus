CREATE OR REPLACE FUNCTION get_all_problems_debug()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
BEGIN
    SELECT json_agg(t) INTO v_result
    FROM (
        SELECT id, user_id, title, link, notes, focus_status, focus_score, created_at
        FROM public.revision_problems
        ORDER BY created_at DESC
    ) t;
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_problems_debug() TO anon;
GRANT EXECUTE ON FUNCTION get_all_problems_debug() TO authenticated;
