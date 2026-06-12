import { createClient } from '@supabase/supabase-js';

function normalizeEnvValue(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Guard: fail loudly at startup if env vars are missing rather than silently at runtime
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[DeepFocus] Missing Supabase environment variables.\n' +
    'Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    'See .env.example for the required format.'
  );
}

// Only the publishable anon key is used here, never the service_role key.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 8,
    },
  },
  global: {
    headers: {
      'x-client-info': 'deepfocus-site',
    },
  },
});
