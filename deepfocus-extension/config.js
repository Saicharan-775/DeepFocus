// =============================================================
// DeepFocus Extension — Centralized Configuration
// =============================================================
// This file is the single source of truth for extension config.
// The anon key is safe to include here: Chrome extensions do not
// have server-side build processes, and the anon key is a
// publishable credential (enforced by Supabase RLS on the backend).
// The focus-event Edge Function NEVER uses this key for data writes;
// it validates requests via the user's hashed connection token.
// =============================================================

self.DEEPFOCUS_CONFIG = {
  SUPABASE_URL: 'https://vcfwjpywxbjnnpswjivu.supabase.co',
  // Publishable (anon) key only — RLS protects all tables.
  // The service_role key is NEVER included here.
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZndqcHl3eGJqbm5wc3dqaXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTkzNzgsImV4cCI6MjA4OTIzNTM3OH0.7OKVcYvmTIIXYAVficTMJ0nd9GYIDc8NCAKs8yCUUX4',
  FOCUS_EVENT_ENDPOINT: 'functions/v1/focus-event',
};
