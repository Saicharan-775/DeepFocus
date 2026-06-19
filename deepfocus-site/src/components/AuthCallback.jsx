import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeepFocusLoader from './DeepFocusLoader';
import { supabase } from '../lib/supabaseClient';
import { getSafeSession } from '../utils/authHelpers';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const finishAuth = async () => {
      try {
        const url = new URL(window.location.href);

        if (url.searchParams.has('error')) {
          if (isMounted) navigate('/auth', { replace: true });
          return;
        }

        const code = url.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const session = await getSafeSession();

        if (!isMounted) return;

        navigate(session?.user ? '/revision' : '/auth', { replace: true });
      } catch (err) {
        console.error("Callback authentication failed:", err);
        if (isMounted) navigate('/auth', { replace: true });
      }
    };

    finishAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return <DeepFocusLoader message="" />;
}
