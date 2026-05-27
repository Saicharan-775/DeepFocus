const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Extension-Token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);
const VALID_STATUSES = new Set(['Cheated', 'Give Up', 'Low Focus', 'Focus Kept']);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeProblemUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.split('?')[0].split('#')[0];
  const match = cleanUrl.match(/https?:\/\/(?:www\.)?leetcode\.com\/problems\/([^/]+)/i);
  return match ? `https://leetcode.com/problems/${match[1]}/` : cleanUrl;
}

function normalizePayload(payload) {
  const normalized = {
    title: typeof payload?.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Unknown Problem',
    link: normalizeProblemUrl(payload?.link),
    difficulty: VALID_DIFFICULTIES.has(payload?.difficulty) ? payload.difficulty : 'Medium',
    focus_status: VALID_STATUSES.has(payload?.focus_status) ? payload.focus_status : 'Give Up',
    focus_score: Number(payload?.focus_score),
    switches: Number(payload?.switches),
    focus_duration: Number(payload?.focus_duration || 0),
    code: typeof payload?.code === 'string' ? payload.code : null,
  };

  if (!/^https:\/\/leetcode\.com\/problems\/[^/]+\/$/.test(normalized.link)) {
    return { error: 'Invalid LeetCode problem link' };
  }

  if (!Number.isFinite(normalized.focus_score)) normalized.focus_score = 0;
  normalized.focus_score = Math.max(0, Math.min(100, Math.round(normalized.focus_score)));

  if (!Number.isFinite(normalized.switches) || normalized.switches < 0) normalized.switches = 0;
  normalized.switches = Math.round(normalized.switches);

  if (!Number.isFinite(normalized.focus_duration) || normalized.focus_duration < 0) normalized.focus_duration = 0;
  normalized.focus_duration = Math.round(normalized.focus_duration);

  return { payload: normalized };
}

function extractExtensionToken(req) {
  let extToken = req.headers.get('X-Extension-Token') || '';

  if (!extToken) {
    const auth = req.headers.get('Authorization') || '';
    if (auth.startsWith('Bearer dfx_')) {
      extToken = auth.slice('Bearer '.length);
    }
  }

  return extToken.trim();
}

async function callSyncRpc(supabaseUrl, serviceRoleKey, token, payload, includeCode) {
  const body = {
    p_raw_token: token,
    p_title: payload.title,
    p_link: payload.link,
    p_difficulty: payload.difficulty,
    p_status: payload.focus_status,
    p_score: payload.focus_score,
    p_switches: payload.switches,
    p_duration: payload.focus_duration,
  };

  if (includeCode) {
    body.p_code = payload.code;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sync_focus_event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch (_) {}

  return { response, data, text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    const extToken = extractExtensionToken(req);
    if (!extToken || !extToken.startsWith('dfx_')) {
      return jsonResponse({ error: 'Missing or invalid extension token' }, 401);
    }

    let rawPayload;
    try {
      rawPayload = await req.json();
    } catch (_) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const normalized = normalizePayload(rawPayload);
    if (normalized.error) {
      return jsonResponse({ error: normalized.error }, 400);
    }

    let result = await callSyncRpc(supabaseUrl, serviceRoleKey, extToken, normalized.payload, true);

    if (!result.response.ok && (result.response.status === 400 || result.response.status === 404)) {
      const errorText = `${result.text} ${result.data?.message || ''} ${result.data?.error || ''}`.toLowerCase();
      if (errorText.includes('p_code') || errorText.includes('schema cache') || errorText.includes('function')) {
        result = await callSyncRpc(supabaseUrl, serviceRoleKey, extToken, normalized.payload, false);
      }
    }

    if (!result.response.ok) {
      return jsonResponse({
        error: result.data?.error || result.data?.message || result.text || 'Database sync failed',
      }, result.response.status);
    }

    if (result.data?.success === false) {
      return jsonResponse({ error: result.data.error || 'Database sync rejected token' }, 401);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({
      error: 'Internal server error',
      details: err?.message || String(err),
    }, 500);
  }
});
