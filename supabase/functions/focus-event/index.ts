import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Extension-Token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function validatePayload(payload: any) {
  if (typeof payload.title !== 'string') return false;
  if (typeof payload.link !== 'string' || !payload.link.startsWith('https://leetcode.com/')) return false;
  if (!['Easy', 'Medium', 'Hard'].includes(payload.difficulty)) return false;
  if (!['Cheated', 'Give Up', 'Low Focus', 'Focus Kept'].includes(payload.focus_status)) return false;
  
  const score = Number(payload.focus_score);
  if (isNaN(score) || score < 0 || score > 100) return false;
  
  const sws = Number(payload.switches);
  if (isNaN(sws) || sws < 0) return false;
  
  return true;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

export default async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
  const extToken = req.headers.get('X-Extension-Token')
  if (!extToken) {
    return new Response(JSON.stringify({ error: 'Missing Sync Token' }), { status: 401, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const hashedToken = await hashToken(extToken)

    // 1. Verify token exists AND is not expired
    const { data: connection, error: connError } = await adminClient
      .from('extension_connections')
      .select('user_id, expires_at')
      .eq('token_hash', hashedToken)
      .maybeSingle()

    if (connError) {
      console.error('Auth Query Error:', connError)
      return new Response(JSON.stringify({ error: 'Auth System Error' }), { status: 500, headers: corsHeaders })
    }

    if (!connection) {
      console.log(`[Auth] No connection found for token_hash: ${hashedToken}`);
      return new Response(JSON.stringify({ 
        error: 'Auth failed: Token hash mismatch',
        debug_hash: hashedToken 
      }), { status: 401, headers: corsHeaders })
    }

    if (new Date(connection.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token Expired' }), { status: 401, headers: corsHeaders })
    }

    // Parse payload
    const payload = await req.json()
    
    if (!validatePayload(payload)) {
      return new Response(JSON.stringify({ error: 'Invalid Payload Schema' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }
    
    // 2. Data Integrity: Upsert by (user_id, link)
    const { error: insertError } = await adminClient
      .from('revision_problems')
      .upsert({
        user_id: connection.user_id,
        title: payload.title,
        link: payload.link,
        difficulty: payload.difficulty,
        focus_status: payload.focus_status,
        focus_score: payload.focus_score,
        switches: payload.switches,
        focus_duration: payload.focus_duration || 0,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id, link' })

    if (insertError) {
      console.error('Database Upsert Error:', insertError)
      throw insertError
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err: any) {
    console.error('Fatal Edge Function Error:', err.message)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
}
