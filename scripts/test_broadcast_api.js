// scripts/test_broadcast_api.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

console.log('--- Testing /api/send-broadcast Logic and Syntax ---');

// 1. Read the send-broadcast.js code
const filePath = path.join(__dirname, '..', 'api', 'send-broadcast.js');
let code = fs.readFileSync(filePath, 'utf8');

// 2. Transpile imports to global mock variables for sandboxed execution
code = code
  .replace(/import\s+\{\s*createClient\s*\}\s+from\s+['"]@supabase\/supabase-js['"];?/g, 'const { createClient } = global;')
  .replace(/import\s+fetch\s+from\s+['"]node-fetch['"];?/g, 'const fetch = global.mockFetch;')
  .replace(/import\s+crypto\s+from\s+['"]crypto['"];?/g, 'const crypto = require("crypto");')
  .replace(/export\s+default\s+async\s+function\s+handler/g, 'global.handler = async function handler');

// 3. Define a chainable mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: async (token) => {
      if (token === 'valid-admin-token') {
        return { data: { user: { id: 'admin-123', email: 'admin@deepfocus.app' } }, error: null };
      }
      return { data: { user: null }, error: new Error('Invalid token') };
    }
  },
  from: (table) => {
    const queryBuilder = {
      select: (fields) => queryBuilder,
      eq: (field, value) => queryBuilder,
      insert: async (data, options) => {
        console.log(`  [Mock DB] Inserted into ${table}:`, data);
        return { error: null };
      },
      upsert: async (data, options) => {
        console.log(`  [Mock DB] Upserted into ${table}:`, data);
        return { error: null };
      },
      update: (data) => {
        console.log(`  [Mock DB] Updated ${table} with:`, data);
        return {
          eq: (field, value) => {
            console.log(`  [Mock DB] Where ${field} = ${value}`);
            return Promise.resolve({ error: null });
          }
        };
      },
      single: async () => {
        if (table === 'profiles') {
          return { data: { role: 'admin' }, error: null };
        }
        if (table === 'notifications') {
          return {
            data: {
              id: 'notif-123',
              title: 'Verify Feature',
              message: 'Unsubscribe check',
              delivery_method: 'email',
              target_segment: 'all',
              cta_text: 'Go to dashboard',
              cta_url: 'https://deepfocus.app/dashboard',
              image_url: null
            },
            error: null
          };
        }
        if (table === 'feature_flags') {
          return { data: { value: true }, error: null };
        }
        return { data: null, error: new Error('Not found') };
      },
      // then method makes the object thenable so it acts like a Promise (resolved on await)
      then: (onFulfilled) => {
        if (table === 'broadcast_deliveries') {
          onFulfilled({
            data: [
              { id: 'del-123', email: 'user1@example.com', notification_id: 'notif-123', status: 'queued' },
              { id: 'del-456', email: 'user2@example.com', notification_id: 'notif-123', status: 'queued' }
            ],
            error: null
          });
        } else {
          onFulfilled({ data: [], error: null });
        }
      }
    };
    return queryBuilder;
  },
  rpc: async (func, args) => {
    if (func === 'check_admin_rate_limit') {
      return { data: true, error: null };
    }
    if (func === 'get_users_matching_segment') {
      return {
        data: [
          { user_id: 'user-1', email: 'user1@example.com' },
          { user_id: 'user-2', email: 'user2@example.com' }
        ],
        error: null
      };
    }
    if (func === 'log_admin_action') {
      console.log(`  [Mock DB] Executed RPC log_admin_action with args:`, args);
      return { data: true, error: null };
    }
    return { data: null, error: new Error('RPC not mocked') };
  }
};

// Mock fetch to simulate Resend API responses
const mockFetch = async (url, options) => {
  const body = JSON.parse(options.body);
  console.log(`  [Mock Resend Fetch] URL: ${url}`);
  
  if (url === 'https://api.resend.com/emails/batch') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: body.map((item, idx) => ({ id: `resend-id-${idx}` }))
      })
    };
  }
  
  if (url === 'https://api.resend.com/emails') {
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-single-id' })
    };
  }

  return {
    ok: false,
    status: 400,
    json: async () => ({ message: 'Bad request' })
  };
};

// 4. Set up the VM Context
const sandbox = {
  global: {
    createClient: () => mockSupabaseClient,
    mockFetch
  },
  process: {
    env: {
      NODE_ENV: 'development',
      UNSUBSCRIBE_SECRET: 'fallback-secret-key-for-development',
      RESEND_API_KEY: 'mock-resend-key',
      VITE_SUPABASE_URL: 'https://vcfwjpywxbjnnpswjivu.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'mock-anon-key'
    }
  },
  console,
  require,
  setTimeout
};

vm.createContext(sandbox);

try {
  vm.runInContext(code, sandbox);
  console.log('✅ Code successfully parsed and loaded.');
} catch (e) {
  console.error('❌ Code syntax or execution error:', e);
  process.exit(1);
}

// 5. Invoke handler for test send and standard campaign send
async function runTests() {
  const resMock = (onFinish) => {
    let statusCode = 0;
    let responseBody = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseBody = data;
            onFinish(statusCode, responseBody);
            return res;
          }
        };
      },
      setHeader: () => {}
    };
    return res;
  };

  console.log('\n--- Running Test 1: Test Send Mode ---');
  const reqTest = {
    method: 'POST',
    headers: { authorization: 'Bearer valid-admin-token' },
    body: {
      notificationId: 'notif-123',
      isTestSend: true,
      testEmail: 'test-admin@deepfocus.app'
    }
  };

  await new Promise((resolve) => {
    const res = resMock((status, body) => {
      console.log(`Test Send Response Status: ${status}`);
      console.log('Test Send Response Body:', body);
      if (status === 200 && body.success) {
        console.log('✅ Test Send completed successfully!');
      } else {
        console.error('❌ Test Send failed');
        process.exit(1);
      }
      resolve();
    });
    sandbox.global.handler(reqTest, res).catch(err => {
      console.error(err);
      process.exit(1);
    });
  });

  console.log('\n--- Running Test 2: Standard Campaign Send Mode ---');
  const reqStandard = {
    method: 'POST',
    headers: { authorization: 'Bearer valid-admin-token' },
    body: {
      notificationId: 'notif-123',
      isTestSend: false
    }
  };

  await new Promise((resolve) => {
    const res = resMock((status, body) => {
      console.log(`Standard Campaign Response Status: ${status}`);
      console.log('Standard Campaign Response Body:', body);
      if (status === 200 && body.success && body.successCount === 2) {
        console.log('✅ Standard Campaign Batch completed successfully with 2 successful deliveries!');
      } else {
        console.error('❌ Standard Campaign failed');
        process.exit(1);
      }
      resolve();
    });
    sandbox.global.handler(reqStandard, res).catch(err => {
      console.error(err);
      process.exit(1);
    });
  });
}

runTests().catch((err) => {
  console.error('Test execution crashed:', err);
  process.exit(1);
});
