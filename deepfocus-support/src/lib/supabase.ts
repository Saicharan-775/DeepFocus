import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('Supabase URL environment variable is missing.');
}

// Client for public browser operations (e.g. Realtime subscriptions, read-only stats)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for secure backend operations with full bypass permissions (e.g. verifying signatures, updating status)
export const getSupabaseAdmin = () => {
  if (!supabaseServiceKey) {
    throw new Error('Supabase service role key is missing. This operation requires administrative access.');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
