// scripts/verify_unsubscribe.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '..', 'deepfocus-site', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: Supabase URL or Anon Key is missing.');
  process.exit(1);
}

// We will use service role client to sync/set up secret if needed, or check app_settings
const supabaseAdmin = serviceKey ? createClient(supabaseUrl, serviceKey) : null;
const supabaseUser = createClient(supabaseUrl, anonKey);

const testEmail = 'test-unsub-flow@deepfocus.app';
const secret = process.env.UNSUBSCRIBE_SECRET || 'fallback-secret-key-for-development';

function computeToken(email, secretKey) {
  return crypto
    .createHash('sha256')
    .update(secretKey + email.toLowerCase())
    .digest('hex');
}

async function runTests() {
  console.log('--- Unsubscribe Token Defensive Verification Tests ---');
  console.log(`Using target email: ${testEmail}`);
  console.log(`Using secret key: ${secret}`);

  // If admin key is present, let's sync the secret to app_settings to ensure they are synchronized
  if (supabaseAdmin) {
    console.log('Admin credentials found. Syncing secret to app_settings...');
    const { error: syncErr } = await supabaseAdmin
      .from('app_settings')
      .upsert({ key: 'unsubscribe_secret', value: secret }, { onConflict: 'key' });
    if (syncErr) {
      console.warn('Warning: Failed to sync secret to database settings:', syncErr.message);
    }
  }

  const validToken = computeToken(testEmail, secret);

  const testCases = [
    {
      name: '1. Missing token',
      email: testEmail,
      token: null,
      expected: false
    },
    {
      name: '2. Invalid token format/value',
      email: testEmail,
      token: 'not-a-valid-hash',
      expected: false
    },
    {
      name: '3. Valid token verification',
      email: testEmail,
      token: validToken,
      expected: true
    },
    {
      name: '4. Modified email (token from other email)',
      email: 'other-email@deepfocus.app',
      token: validToken,
      expected: false
    },
    {
      name: '5. Modified token (altered character)',
      email: testEmail,
      token: validToken.slice(0, -1) + (validToken.slice(-1) === 'a' ? 'b' : 'a'),
      expected: false
    }
  ];

  let passed = 0;

  for (const tc of testCases) {
    try {
      // Call the RPC
      const { data, error } = await supabaseUser.rpc('unsubscribe_user_email', {
        p_email: tc.email,
        p_token: tc.token
      });

      if (error) {
        console.log(`  ❌ ${tc.name} returned database error:`, error.message);
        if (tc.expected === false) {
          console.log(`     (Expected: failure/false, so this is correct/rejected)`);
          passed++;
        }
      } else {
        const isMatch = !!data;
        if (isMatch === tc.expected) {
          console.log(`  liked: ${tc.name} succeeded (Returned: ${data})`);
          passed++;
        } else {
          console.log(`  ❌ ${tc.name} failed (Returned: ${data}, Expected: ${tc.expected})`);
        }
      }
    } catch (err) {
      console.log(`  ❌ ${tc.name} threw error:`, err.message);
    }
  }

  console.log(`\nTests completed: ${passed}/${testCases.length} passed.`);
  if (passed !== testCases.length) {
    process.exit(1);
  }
}

runTests().catch(console.error);
