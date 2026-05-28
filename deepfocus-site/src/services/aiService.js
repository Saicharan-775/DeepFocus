import { supabase } from "../lib/supabaseClient";
const DEMO_AI_DAILY_LIMIT = 5;
const DEMO_AI_TRIAL_DAYS = 3;
const DEMO_AI_START_KEY = "df_demo_ai_started_at";
const DEMO_AI_DATE_KEY = "df_demo_ai_usage_date";
const DEMO_AI_COUNT_KEY = "df_demo_ai_usage_count";

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function getStoredValue(key) {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(key) || "";
}

function normalizeApiKey(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

function getAiKeys() {
  const userOpenrouterKey = normalizeApiKey(getStoredValue("df_openrouter_api_key"));
  const userGroqKey = normalizeApiKey(getStoredValue("df_groq_api_key"));
  const userOpenAiKey = normalizeApiKey(getStoredValue("df_openai_key"));
  const hasUserKey = !!(userOpenrouterKey || userGroqKey || userOpenAiKey);

  return {
    openrouterKey: userOpenrouterKey,
    groqKey: userGroqKey,
    openAiKey: userOpenAiKey,
    source: hasUserKey ? "byok" : "demo"
  };
}

function getDemoAiUsage() {
  if (typeof localStorage === "undefined") {
    return { allowed: true, remaining: DEMO_AI_DAILY_LIMIT, daysLeft: DEMO_AI_TRIAL_DAYS };
  }

  let startedAt = Number(localStorage.getItem(DEMO_AI_START_KEY) || 0);
  if (!startedAt) {
    startedAt = Date.now();
    localStorage.setItem(DEMO_AI_START_KEY, String(startedAt));
  }

  const elapsedDays = Math.floor((Date.now() - startedAt) / 86400000);
  const daysLeft = Math.max(0, DEMO_AI_TRIAL_DAYS - elapsedDays);
  const date = todayKey();
  const storedDate = localStorage.getItem(DEMO_AI_DATE_KEY);
  const count = storedDate === date ? Number(localStorage.getItem(DEMO_AI_COUNT_KEY) || 0) : 0;
  const remaining = Math.max(0, DEMO_AI_DAILY_LIMIT - count);

  return {
    allowed: daysLeft > 0 && remaining > 0,
    remaining,
    daysLeft,
    date,
    count
  };
}

function assertDemoAiAllowed(source) {
  if (source !== "demo") return;
  const usage = getDemoAiUsage();
  if (usage.daysLeft <= 0) {
    throw new Error("Your 3-day demo AI trial has ended. Add your own OpenRouter or Groq API key to continue.");
  }
  if (usage.remaining <= 0) {
    throw new Error("Demo AI limit reached for today (5/5). Add your own OpenRouter or Groq API key to continue.");
  }
}

function recordDemoAiUse(source) {
  if (source !== "demo" || typeof localStorage === "undefined") return;
  const usage = getDemoAiUsage();
  localStorage.setItem(DEMO_AI_DATE_KEY, usage.date || todayKey());
  localStorage.setItem(DEMO_AI_COUNT_KEY, String((usage.count || 0) + 1));
}

function finishAiResponse(content, source) {
  const value = content?.trim();
  if (!value) return null;
  recordDemoAiUse(source);
  return value;
}

async function readProviderError(provider, response) {
  let message = "";
  try {
    const text = await response.text();
    if (text) {
      try {
        const data = JSON.parse(text);
        message = data?.error?.message || data?.error || data?.message || text;
      } catch (_) {
        message = text;
      }
    }
  } catch (_) {
    message = "";
  }

  const cleanMessage = String(message || "Request failed").slice(0, 220);
  if (response.status === 429) {
    if (provider.startsWith("OpenRouter")) {
      return "OpenRouter is rate-limiting the free model right now. Try again in a minute, or add a Groq/OpenAI key in Settings for a backup provider.";
    }
    return `${provider} is rate-limited right now. Try again in a minute, or add another AI key in Settings.`;
  }

  return `${provider} rejected the request (${response.status}): ${cleanMessage}`;
}

function formatNetworkError(provider, err) {
  const raw = err?.message || "Network request failed";
  if (provider === "OpenAI" && raw.toLowerCase().includes("failed to fetch")) {
    return "OpenAI request failed from the browser. If the key is valid, use OpenRouter/Groq or route OpenAI through a server proxy.";
  }
  return `${provider} request failed: ${raw}`;
}

function formatProviderErrors(errors, fallback) {
  const uniqueErrors = [...new Set(errors.filter(Boolean))];
  return uniqueErrors.length ? uniqueErrors.join("\n") : fallback;
}

async function callDemoAi(kind, payload) {
  const { data, error } = await supabase.functions.invoke("ai-demo", {
    body: { kind, payload }
  });

  if (error) {
    throw new Error(error.message || "Demo AI request failed.");
  }
  if (!data?.success || !data?.content) {
    throw new Error(data?.error || "Demo AI did not return a response.");
  }

  try {
    if (typeof localStorage !== "undefined" && data.usage) {
      localStorage.setItem(DEMO_AI_DATE_KEY, todayKey());
      localStorage.setItem(DEMO_AI_COUNT_KEY, String(DEMO_AI_DAILY_LIMIT - Number(data.usage.remaining || 0)));
    }
  } catch (_) {
  }

  return data.content.trim();
}

export async function getAiSummary({ title, difficulty, focusStatus, codeOrNotes }) {
  const { openrouterKey, groqKey, openAiKey, source } = getAiKeys();
  const providerErrors = [];

  if (!openrouterKey && !groqKey && !openAiKey) {
    return callDemoAi("summary", { title, difficulty, focusStatus, codeOrNotes });
  }

  assertDemoAiAllowed(source);

  const systemPrompt = `You are an expert DSA mentor.
Analyze the user's submitted solution or notes.
Generate a concise, insightful, personalized summary structured exactly with these three headings:
1. **Code Review & Mistake**: (Identify specific bugs, edge-case failures, or performance flaws in their code/approach).
2. **Cognitive Root Cause ("What made you think like this?")**: (Explain the logical misconception, premature optimization, or missing observation that likely led to this specific approach).
3. **Correct Approach Tip**: (Provide only the direct suggestion/actionable steps for rectifying their mistake and correcting the approach).

Rules:
- Base response strictly on the USER'S SUBMITTED CODE/NOTES.
- Do NOT explain generic editorial or paste full solutions.
- Keep the response clear, concise (under 180 words), and highly action-oriented.`;

  const userPrompt = `Problem: ${title} (${difficulty || "Medium"})
Focus Status: ${focusStatus || "Unknown"}
User's Code/Notes/Approach:
${codeOrNotes || "No code or notes provided yet."}`;

  if (openrouterKey) {
    const models = [
      "openrouter/free",
      "meta-llama/llama-3.3-70b-instruct:free"
    ];

    for (const model of models) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://github.com/Saicharan-775/DeepFocus",
            "X-Title": "DeepFocus"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 300
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const result = finishAiResponse(content, source);
            if (result) return result;
          }
        } else {
          const message = await readProviderError(`OpenRouter ${model}`, res);
          providerErrors.push(message);
          console.warn(message);
        }
      } catch (err) {
        const message = formatNetworkError(`OpenRouter ${model}`, err);
        providerErrors.push(message);
        console.warn(message);
      }
    }
  }

  if (groqKey) {
    const groqModels = [
      "llama-3.3-70b-versatile",
      "llama3-8b-8192"
    ];

    for (const model of groqModels) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 300
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const result = finishAiResponse(content, source);
            if (result) return result;
          }
        } else {
          const message = await readProviderError(`Groq ${model}`, res);
          providerErrors.push(message);
          console.warn(message);
        }
      } catch (err) {
        const message = formatNetworkError(`Groq ${model}`, err);
        providerErrors.push(message);
        console.warn(message);
      }
    }
  }

  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const result = finishAiResponse(content, source);
          if (result) return result;
        }
      } else {
        const message = await readProviderError("OpenAI", res);
        providerErrors.push(message);
        if (!openrouterKey && !groqKey) throw new Error(message);
        console.warn(message);
      }
    } catch (err) {
      const message = err?.message?.startsWith("OpenAI ")
        ? err.message
        : formatNetworkError("OpenAI", err);
      providerErrors.push(message);
      if (!openrouterKey && !groqKey) throw new Error(message);
      console.warn(message);
    }
  }

  throw new Error(formatProviderErrors(
    providerErrors,
    "AI Analysis failed. No configured provider returned a response."
  ));
}

export async function getAiPseudoCode({ title, difficulty, code }) {
  const { openrouterKey, groqKey, openAiKey, source } = getAiKeys();
  const providerErrors = [];

  if (!openrouterKey && !groqKey && !openAiKey) {
    return callDemoAi("pseudocode", { title, difficulty, code });
  }

  assertDemoAiAllowed(source);

  const systemPrompt = `You are a helpful programming tutor.
Explain the algorithm logic step-by-step in very simple, plain, and easy-to-understand English.
Use simple, clear bullet points or numbered steps (pseudo-code style) so a developer can easily translate it to code.
Avoid formal math notations or rigid programming syntax. Keep the tone friendly, normal, and natural.
Keep it under 150 words.`;

  const userPrompt = `Problem: ${title} (${difficulty || "Medium"})
User's Code/Notes:
${code || "No code provided yet."}`;

  if (openrouterKey) {
    const models = [
      "openrouter/free",
      "meta-llama/llama-3.3-70b-instruct:free"
    ];

    for (const model of models) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://github.com/Saicharan-775/DeepFocus",
            "X-Title": "DeepFocus"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.5,
            max_tokens: 300
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const result = finishAiResponse(content, source);
            if (result) return result;
          }
        } else {
          const message = await readProviderError(`OpenRouter ${model}`, res);
          providerErrors.push(message);
          console.warn(message);
        }
      } catch (err) {
        const message = formatNetworkError(`OpenRouter ${model}`, err);
        providerErrors.push(message);
        console.warn(message);
      }
    }
  }

  if (groqKey) {
    const groqModels = [
      "llama-3.3-70b-versatile",
      "llama3-8b-8192"
    ];

    for (const model of groqModels) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.5,
            max_tokens: 300
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const result = finishAiResponse(content, source);
            if (result) return result;
          }
        } else {
          const message = await readProviderError(`Groq ${model}`, res);
          providerErrors.push(message);
          console.warn(message);
        }
      } catch (err) {
        const message = formatNetworkError(`Groq ${model}`, err);
        providerErrors.push(message);
        console.warn(message);
      }
    }
  }

  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.5,
          max_tokens: 300
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const result = finishAiResponse(content, source);
          if (result) return result;
        }
      } else {
        const message = await readProviderError("OpenAI", res);
        providerErrors.push(message);
        if (!openrouterKey && !groqKey) throw new Error(message);
        console.warn(message);
      }
    } catch (err) {
      const message = err?.message?.startsWith("OpenAI ")
        ? err.message
        : formatNetworkError("OpenAI", err);
      providerErrors.push(message);
      if (!openrouterKey && !groqKey) throw new Error(message);
      console.warn(message);
    }
  }

  throw new Error(formatProviderErrors(
    providerErrors,
    "AI Pseudocode generation failed. No configured provider returned a response."
  ));
}
