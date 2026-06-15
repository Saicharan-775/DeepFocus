import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export default function useNotifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [flags, setFlags] = useState({
    notifications: true,
    realtime_notifications: true,
    email_broadcasts: true,
    broadcast_center: true,
  });

  const notificationsRef = useRef([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Load feature flags
  const fetchFeatureFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('feature_flags').select('*');
      if (error) throw error;
      if (data) {
        const flagMap = {};
        data.forEach((f) => {
          flagMap[f.key] = f.value;
        });
        setFlags((prev) => ({ ...prev, ...flagMap }));
        return flagMap;
      }
    } catch (err) {
      console.error('[Notifications Hook] Feature flags fetch failed:', err);
    }
    return null;
  }, []);

  // Fetch active user notifications
  const fetchNotifications = useCallback(async (showToastOnNew = false) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_user_notifications');
      if (error) throw error;
      
      const currentList = notificationsRef.current;

      if (showToastOnNew && currentList.length > 0) {
        const existingIds = new Set(currentList.map((n) => n.id));
        const newAnnouncements = data.filter((n) => !existingIds.has(n.id) && !n.is_read);
        
        newAnnouncements.forEach((item) => {
          showToast(item.title, item.message, item.type);
        });
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('[Notifications Hook] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    if (!user) return;
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      const { error } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: id,
      });
      if (error) throw error;
    } catch (err) {
      console.error('[Notifications Hook] Mark as read failed:', err);
      // Revert on failure
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Mark all active notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user || unreadCount === 0) return;
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      const { error } = await supabase.rpc('mark_all_notifications_as_read');
      if (error) throw error;
    } catch (err) {
      console.error('[Notifications Hook] Mark all as read failed:', err);
      fetchNotifications();
    }
  }, [user, unreadCount, fetchNotifications]);

  // Record notification views and clicks for analytics tracking
  const logInteraction = useCallback(async (id, viewed, clicked) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('record_notification_interaction', {
        p_notification_id: id,
        p_is_viewed: viewed,
        p_is_clicked: clicked,
      });
      if (error) throw error;
    } catch (err) {
      console.error('[Notifications Hook] Interaction logging failed:', err);
    }
  }, [user]);

  // Set up real-time listener and seed data fetching
  useEffect(() => {
    if (!user) return;

    const channels = [];

    const initialize = async () => {
      const activeFlags = await fetchFeatureFlags();
      
      // Load initial lists
      const isNotifEnabled = activeFlags ? activeFlags.notifications : flags.notifications;
      if (isNotifEnabled) {
        await fetchNotifications(false);
      }

      // Initialize real-time push subscription if enabled
      const isRealtimeEnabled = activeFlags ? activeFlags.realtime_notifications : flags.realtime_notifications;
      if (isRealtimeEnabled) {
        
        // 1. Direct user-targeted notification push alerts (Postgres Changes with row filter!)
        const directChannel = supabase
          .channel(`user_direct_push_${user.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            async () => {
              await fetchNotifications(true);
            }
          )
          .subscribe();
        
        channels.push(directChannel);

        // 2. Global broadcast push alerts (In-memory Realtime Broadcast channels!)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium, is_beta, created_at')
            .eq('id', user.id)
            .single();

          if (profile) {
            const activeSegments = ['all'];
            const createdDate = new Date(profile.created_at);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            if (createdDate >= sevenDaysAgo) {
              activeSegments.push('new');
            }
            if (profile.is_premium) {
              activeSegments.push('premium');
            }
            if (profile.is_beta) {
              activeSegments.push('beta');
            }

            activeSegments.forEach((segment) => {
              const broadcastChannel = supabase
                .channel(`announcements:${segment}`)
                .on('broadcast', { event: 'new_announcement' }, ({ payload }) => {
                  // Instant in-memory toast notifications
                  showToast(payload.title, payload.message, payload.type);
                  // Refresh list state without full browser reloads
                  fetchNotifications(false);
                })
                .subscribe();

              channels.push(broadcastChannel);
            });
          }
        } catch (err) {
          console.error('[Notifications Hook] Broadcast channels initialization failed:', err);
        }
      }
    };

    initialize();

    return () => {
      channels.forEach((c) => {
        if (c) supabase.removeChannel(c);
      });
    };
  }, [user, fetchFeatureFlags, fetchNotifications, flags.notifications, flags.realtime_notifications, showToast]);

  return {
    notifications,
    unreadCount,
    loading,
    flags,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    logInteraction,
    fetchFeatureFlags,
  };
}
