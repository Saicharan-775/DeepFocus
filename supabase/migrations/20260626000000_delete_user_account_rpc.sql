-- Migration: 20260626000000_delete_user_account_rpc.sql
-- Description: Create a secure transaction-safe RPC for permanent account deletion.

CREATE OR REPLACE FUNCTION public.delete_user_account_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Security verification: Only allow execution if the caller is the user themselves
    -- or if the caller is using service_role bypass (where auth.uid() is null).
    IF auth.uid() IS NOT NULL AND auth.uid() <> target_user_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only delete your own account.';
    END IF;

    -- 1. Delete unsubscribed emails (by checking their primary key match)
    DELETE FROM public.unsubscribed_emails 
    WHERE email = (SELECT email FROM auth.users WHERE id = target_user_id);

    -- 2. Clean up community contributions
    DELETE FROM public.community_comments WHERE user_id = target_user_id;
    DELETE FROM public.community_post_votes WHERE user_id = target_user_id;
    DELETE FROM public.community_post_loves WHERE user_id = target_user_id;
    DELETE FROM public.community_posts WHERE user_id = target_user_id;

    -- 3. Clean up focus sessions and violations
    DELETE FROM public.focus_violations 
    WHERE session_id IN (SELECT id FROM public.focus_sessions WHERE user_id = target_user_id);
    DELETE FROM public.focus_sessions WHERE user_id = target_user_id;

    -- 4. Clean up revision sheets
    DELETE FROM public.revision_problems WHERE user_id = target_user_id;

    -- 5. Clean up browser extension tokens
    DELETE FROM public.extension_connections WHERE user_id = target_user_id;

    -- 6. Clean up AI demo usage log
    DELETE FROM public.ai_demo_usage WHERE user_id = target_user_id;

    -- 7. Clean up notifications/subscriptions/read history
    DELETE FROM public.notification_interactions WHERE user_id = target_user_id;
    DELETE FROM public.broadcast_deliveries WHERE user_id = target_user_id;
    DELETE FROM public.notifications WHERE user_id = target_user_id;

    -- 8. Clean up user profiles
    DELETE FROM public.profiles WHERE id = target_user_id;

    -- 9. Delete the Auth user record permanently
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
