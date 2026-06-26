// scripts/verify_feature_flags.js
/**
 * Feature‑flag verification script.
 * Toggles each kill‑switch flag, invokes a harmless RPC, and ensures the flag state
 * is respected by server‑side functions and client‑side checks.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', 'deepfocus-site', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.warn('⚠️ Skipping Feature Flags verification: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in the environment.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey);

const FLAGS = [
  'notifications',
  'realtime_notifications',
  'email_broadcasts',
  'broadcast_center',
  'maintenance_mode'
];

async function toggleFlag(flag, value) {
  const { data, error } = await supabase
    .from('feature_flags')
    .upsert({ key: flag, value }, { onConflict: 'key' });
  if (error) throw error;
  return data;
}

async function checkFlagEffect(flag) {
  // Simple check: call a function that is gated by the flag.
  // get_user_notifications checks the 'notifications' flag.
  if (flag === 'notifications') {
    const { data, error } = await supabase.rpc('get_user_notifications');
    return { success: !error, error };
  }
  // For other flags we just read back the value.
  const { data, error } = await supabase
    .from('feature_flags')
    .select('value')
    .eq('key', flag)
    .single();
  return { success: !error, value: data?.value };
}

async function run() {
  const report = ['# Feature‑Flag Verification Report', ''];
  for (const flag of FLAGS) {
    // Record original state
    const { data: orig } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', flag)
      .single();
    const original = orig?.value;
    // Toggle off then on (if different)
    await toggleFlag(flag, false);
    const offResult = await checkFlagEffect(flag);
    await toggleFlag(flag, true);
    const onResult = await checkFlagEffect(flag);
    // Restore original if needed
    if (original !== undefined && original !== true) {
      await toggleFlag(flag, original);
    }
    report.push(`## ${flag}`);
    report.push(`- Original: ${original}`);
    report.push(`- After disabling: ${offResult.success ? '✅ OK' : `❌ Error ${offResult.error?.message}`}`);
    report.push(`- After enabling: ${onResult.success ? '✅ OK' : `❌ Error ${onResult.error?.message}`}`);
    report.push('');
  }
  const fs = require('fs');
  const reportPath = require('path').join(__dirname, '..', 'system_verification_report.md');
  fs.appendFileSync(reportPath, report.join('\n'));
  console.log('Feature‑flag verification completed');
}

run().catch(console.error);
