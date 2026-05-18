import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

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
      
      // Load user preferences into localStorage
      if (user?.user_metadata) {
        const meta = user.user_metadata;
        if (meta.df_strength) localStorage.setItem('df_strength', JSON.stringify(meta.df_strength));
        if (meta.df_mastered) localStorage.setItem('df_mastered', JSON.stringify(meta.df_mastered));
        if (meta.df_notes) localStorage.setItem('df_notes', JSON.stringify(meta.df_notes));
      }
      
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const user = session?.user ?? null;
      setUser(user);
      
      if (user?.user_metadata) {
        const meta = user.user_metadata;
        if (meta.df_strength) localStorage.setItem('df_strength', JSON.stringify(meta.df_strength));
        if (meta.df_mastered) localStorage.setItem('df_mastered', JSON.stringify(meta.df_mastered));
        if (meta.df_notes) localStorage.setItem('df_notes', JSON.stringify(meta.df_notes));
      }

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
