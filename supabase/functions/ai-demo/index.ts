import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-Extension-Token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAILY_LIMIT = 5;
const TRIAL_DAYS = 3;
const MAX_INPUT_CHARS = 12000;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeKey(value: string | undefined) {
  return String(value || "").trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clampText(value: unknown, fallback = "") {
  const text = typeof value === "string" ? value : fallback;
  return text.slice(0, MAX_INPUT_CHARS);
}

async function readProviderError(provider: string, response: Response) {
  const text = await response.text();
  let message = text || "Request failed";
  try {
    const data = JSON.parse(text);
    message = data?.error?.message || data?.error || data?.message || text;
      } catch (_) {
      }
  return `${provider} rejected the request (${response.status}): ${String(message).slice(0, 220)}`;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function resolveUserId(req: Request, supabase: ReturnType<typeof createClient>) {
  const auth = req.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (bearer && !bearer.startsWith("dfx_")) {
    const { data, error } = await supabase.auth.getUser(bearer);
    if (!error && data?.user?.id) return data.user.id;
  }

  const extensionToken = (req.headers.get("X-Extension-Token") || (bearer.startsWith("dfx_") ? bearer : "")).trim();
  if (!extensionToken || !extensionToken.startsWith("dfx_")) return null;

  const tokenHash = await sha256(extensionToken);
  const { data } = await supabase
    .from("extension_connections")
    .select("user_id")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data?.user_id || null;
}

async function getUsageAllowance(supabase: ReturnType<typeof createClient>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("ai_demo_usage")
    .select("first_used_at, usage_date, usage_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Unable to read demo AI usage.");

  if (!data) {
    return { remaining: DAILY_LIMIT, daysLeft: TRIAL_DAYS, count: 0, date: today, exists: false };
  }

  const firstUsed = new Date(data.first_used_at).getTime();
  const elapsedDays = Math.floor((Date.now() - firstUsed) / 86400000);
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsedDays);
  if (daysLeft <= 0) {
    throw new Error("Your 3-day demo AI trial has ended. Add your own OpenRouter, Groq, or OpenAI key to continue.");
  }

  const count = data.usage_date === today ? Number(data.usage_count || 0) : 0;
  if (count >= DAILY_LIMIT) {
    throw new Error("Demo AI limit reached for today (5/5). Add your own OpenRouter, Groq, or OpenAI key to continue.");
  }

  return { remaining: DAILY_LIMIT - count, daysLeft, count, date: today, exists: true };
}

async function recordUsage(supabase: ReturnType<typeof createClient>, userId: string, allowance: Awaited<ReturnType<typeof getUsageAllowance>>) {
  if (!allowance.exists) {
    const { error } = await supabase
      .from("ai_demo_usage")
      .insert({ user_id: userId, usage_date: allowance.date, usage_count: 1 });
    if (error) throw new Error("Unable to record demo AI usage.");
  } else {
    const { error } = await supabase
      .from("ai_demo_usage")
      .update({
        usage_date: allowance.date,
        usage_count: allowance.count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) throw new Error("Unable to update demo AI usage.");
  }

  return {
    remaining: Math.max(0, DAILY_LIMIT - allowance.count - 1),
    daysLeft: allowance.daysLeft,
  };
}

function buildPrompts(kind: string, payload: Record<string, unknown>) {
  const title = clampText(payload.title, "Unknown Problem").slice(0, 240);
  const difficulty = clampText(payload.difficulty, "Medium").slice(0, 24);

  if (kind === "pseudocode") {
    return {
      system: `You are a helpful programming tutor.
Explain the algorithm logic step-by-step in simple English.
Use concise pseudocode-style bullets so a developer can translate it to code.
Avoid formal math notation and keep it under 150 words.`,
      user: `Problem: ${title} (${difficulty})
User's Code/Notes:
${clampText(payload.code, "No code provided yet.")}`,
      temperature: 0.5,
    };
  }

  return {
    system: `You are an expert DSA mentor.
Analyze the user's submitted solution or notes.
Generate a concise, personalized summary with:
1. Code Review & Mistake
2. Cognitive Root Cause
3. Correct Approach Tip

Rules:
- Base response strictly on the submitted code/notes.
- Do not paste full solutions.
- Keep it under 180 words.`,
    user: `Problem: ${title} (${difficulty})
Focus Status: ${clampText(payload.focusStatus, "Unknown").slice(0, 80)}
User's Code/Notes/Approach:
${clampText(payload.codeOrNotes || payload.code, "No code or notes provided yet.")}`,
    temperature: 0.7,
  };
}

async function callOpenRouter(apiKey: string, prompts: ReturnType<typeof buildPrompts>) {
  const models = ["openrouter/free", "meta-llama/llama-3.3-70b-instruct:free"];
  const errors: string[] = [];

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://deepfocus.app",
          "X-Title": "DeepFocus",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: prompts.system },
            { role: "user", content: prompts.user },
          ],
          temperature: prompts.temperature,
          max_tokens: 300,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } else {
        errors.push(await readProviderError(`OpenRouter ${model}`, response));
      }
    } catch (err) {
      errors.push(`OpenRouter ${model} request failed: ${errorMessage(err) || "Network request failed"}`);
    }
  }

  throw new Error(errors.join("\n") || "OpenRouter did not return a response.");
}

async function callGroq(apiKey: string, prompts: ReturnType<typeof buildPrompts>) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: prompts.user },
      ],
      temperature: prompts.temperature,
      max_tokens: 300,
    }),
  });

  if (!response.ok) throw new Error(await readProviderError("Groq", response));
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim();
}

async function callOpenAI(apiKey: string, prompts: ReturnType<typeof buildPrompts>) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: prompts.user },
      ],
      temperature: prompts.temperature,
      max_tokens: 300,
    }),
  });

  if (!response.ok) throw new Error(await readProviderError("OpenAI", response));
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration error" }, 500);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userId = await resolveUserId(req, supabase);
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (_) {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const kind = body.kind === "pseudocode" ? "pseudocode" : "summary";
    const prompts = buildPrompts(kind, (body.payload || {}) as Record<string, unknown>);
    const allowance = await getUsageAllowance(supabase, userId);

    const errors: string[] = [];
    const openrouterKey = normalizeKey(Deno.env.get("OPENROUTER_API_KEY"));
    const groqKey = normalizeKey(Deno.env.get("GROQ_API_KEY"));
    const openAiKey = normalizeKey(Deno.env.get("OPENAI_API_KEY"));

    for (const attempt of [
      ["OpenRouter", openrouterKey, callOpenRouter],
      ["Groq", groqKey, callGroq],
      ["OpenAI", openAiKey, callOpenAI],
    ] as const) {
      const [name, key, fn] = attempt;
      if (!key) continue;
      try {
        const content = await fn(key, prompts);
        if (content) {
          const usage = await recordUsage(supabase, userId, allowance);
          return jsonResponse({ success: true, content, usage });
        }
      } catch (err) {
        errors.push(`${name}: ${errorMessage(err)}`);
      }
    }

    return jsonResponse({
      error: errors.length ? errors.join("\n") : "No demo AI provider is configured on the server.",
    }, 502);
  } catch (err) {
    const message = errorMessage(err);
    const status = message.includes("limit") || message.includes("trial") ? 429 : 500;
    return jsonResponse({ error: message }, status);
  }
});
