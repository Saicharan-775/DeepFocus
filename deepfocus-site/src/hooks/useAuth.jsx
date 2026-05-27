import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

const USER_SCOPED_STORAGE_KEYS = [
  'df_strength',
  'df_mastered',
  'df_notes',
  'df_srs_data',
  'df_ai_summaries'
];

function syncUserScopedLocalStorage(user) {
  if (!user) {
    USER_SCOPED_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('df_active_user_id');
    return;
  }

  const previousUserId = localStorage.getItem('df_active_user_id');
  const isDifferentUser = previousUserId !== user.id;

  if (isDifferentUser) {
    USER_SCOPED_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  localStorage.setItem('df_active_user_id', user.id);

  const meta = user.user_metadata || {};
  const writeMetaOrDefault = (storageKey, metaKey, fallback) => {
    if (Object.prototype.hasOwnProperty.call(meta, metaKey)) {
      localStorage.setItem(storageKey, JSON.stringify(meta[metaKey] || fallback));
    } else if (isDifferentUser) {
      localStorage.setItem(storageKey, JSON.stringify(fallback));
    }
  };

  writeMetaOrDefault('df_strength', 'df_strength', {});
  writeMetaOrDefault('df_mastered', 'df_mastered', []);
  writeMetaOrDefault('df_notes', 'df_notes', {});
  writeMetaOrDefault('df_srs_data', 'df_srs_data', {});
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const setData = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(session);
      const user = session?.user ?? null;
      setUser(user);
      syncUserScopedLocalStorage(user);
      
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const user = session?.user ?? null;
      setUser(user);
      syncUserScopedLocalStorage(user);

      setLoading(false);
    });

    setData();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    signOut: () => supabase.auth.signOut(),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
