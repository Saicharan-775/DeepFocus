// scripts/verify_rbac.js
/**
 * RBAC verification script.
 * Checks that admin users can perform privileged actions and non‑admin users cannot.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', 'deepfocus-site', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // admin access
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // regular user access

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

// Admin client (service role) – should be able to call admin RPCs
const adminSupabase = createClient(supabaseUrl, serviceKey);
// Regular client – non‑admin
const userSupabase = createClient(supabaseUrl, anonKey);

async function checkAdminAccess() {
  const { data, error } = await adminSupabase.rpc('log_admin_action', {
    p_action: 'RBAC Test',
    p_notification_id: null,
    p_metadata: {}
  });
  return { success: !error, error };
}

async function checkUserAccess() {
  const { data, error } = await userSupabase.rpc('log_admin_action', {
    p_action: 'RBAC Test',
    p_notification_id: null,
    p_metadata: {}
  });
  // Should be denied
  return { success: !!error, error };
}

async function run() {
  const adminResult = await checkAdminAccess();
  const userResult = await checkUserAccess();

  const lines = [];
  lines.push('# RBAC Verification Report');
  lines.push('');
  lines.push('## Admin Access');
  lines.push(adminResult.success ? '- ✅ Admin RPC succeeded' : `- ❌ Admin RPC failed: ${adminResult.error?.message}`);
  lines.push('');
  lines.push('## Non‑Admin Access');
  lines.push(userResult.success ? '- ❌ Non‑admin RPC succeeded (should fail)' : '- ✅ Non‑admin RPC correctly rejected');
  if (!userResult.success) {
    lines.push(`  - Error: ${userResult.error?.message}`);
  }

  const fs = require('fs');
  const reportPath = require('path').join(__dirname, '..', 'rbac_report.md');
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log('RBAC report written to', reportPath);
}

run().catch(console.error);
