import { supabase } from '../lib/supabaseClient';

export async function getSafeUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data?.user ?? null;
}

export async function getSafeSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data?.session ?? null;
}
