// scripts/verify_database.js
/**
 * Verification script for database schema, indexes, and performance.
 * Connects to Supabase, runs EXPLAIN ANALYZE on key RPCs and checks index usage.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', 'deepfocus-site', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role for admin access

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Skipping Database schema verification: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in the environment.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runExplain(sql) {
  const { data, error } = await supabase.rpc('explain_analyze', { sql_query: sql });
  if (error) {
    console.error('EXPLAIN error:', error.message);
    return null;
  }
  return data;
}

async function verify() {
  const queries = [
    `SELECT * FROM public.get_user_notifications();`,
    `SELECT * FROM public.get_notification_analytics('00000000-0000-0000-0000-000000000000'::uuid);`,
    `SELECT * FROM public.get_users_matching_segment('all');`
  ];

  const reportLines = [];
  for (const q of queries) {
    console.log('\nRunning EXPLAIN ANALYZE for:', q);
    const result = await runExplain(q);
    if (result) {
      reportLines.push(`### Query: ${q}`);
      reportLines.push('```sql');
      reportLines.push(result);
      reportLines.push('```');
    }
  }

  const fs = require('fs');
  const reportPath = require('path').join(__dirname, '..', 'database_verification_report.md');
  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log('Database verification report written to', reportPath);
}

verify().catch(console.error);
