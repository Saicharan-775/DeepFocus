-- ==============================================================
-- DeepFocus: Rollback Script
-- Migration: 20260615000200_rollback_premium_notifications.sql
-- ==============================================================

-- 1. Drop Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS audit_notifications_trigger ON public.notifications;

-- 2. Drop Functions
DROP FUNCTION IF EXISTS public.unsubscribe_user_email(TEXT);
DROP FUNCTION IF EXISTS public.get_segment_recipient_count(TEXT);
DROP FUNCTION IF EXISTS public.check_admin_rate_limit(UUID);
DROP FUNCTION IF EXISTS public.get_users_matching_segment(TEXT);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_user_notifications();
DROP FUNCTION IF EXISTS public.mark_notification_as_read(UUID);
DROP FUNCTION IF EXISTS public.mark_all_notifications_as_read();
DROP FUNCTION IF EXISTS public.record_notification_interaction(UUID, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.get_notification_analytics(UUID);
DROP FUNCTION IF EXISTS public.log_admin_action(TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.trigger_log_notification_changes();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Remove from Realtime Publication
-- Note: Table will be automatically removed from publication when dropped

-- 4. Drop Tables (Cascade handles indexes and foreign key references)
DROP TABLE IF EXISTS public.unsubscribed_emails CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.broadcast_deliveries CASCADE;
DROP TABLE IF EXISTS public.notification_interactions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
