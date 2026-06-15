const MISSING_BYOK_MESSAGE = "Add your OpenRouter, Groq, or OpenAI API key in Settings to use AI analysis.";

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

  return {
    openrouterKey: userOpenrouterKey,
    groqKey: userGroqKey,
    openAiKey: userOpenAiKey
  };
}

function finishAiResponse(content) {
  const value = content?.trim();
  if (!value) return null;
  
  try {
    const currentCount = parseInt(localStorage.getItem('df_ai_usage_count') || '0', 10);
    localStorage.setItem('df_ai_usage_count', (currentCount + 1).toString());
    
    // Dispatch a custom event so UI can update immediately if needed
    window.dispatchEvent(new Event("df_ai_usage_updated"));
  } catch (e) {
    // Ignore if localStorage fails
  }

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

export async function getAiSummary({ title, difficulty, focusStatus, codeOrNotes }) {
  const { openrouterKey, groqKey, openAiKey } = getAiKeys();
  const providerErrors = [];

  if (!openrouterKey && !groqKey && !openAiKey) {
    throw new Error(MISSING_BYOK_MESSAGE);
  }

  const systemPrompt = `You are DeepFocus, a friendly DSA mentor helping students improve their problem-solving skills.

Your goal is not just to point out mistakes, but to help the user understand why they made them and how to think better next time.

Analyze the user's code, pseudocode, explanation, or approach and provide feedback using exactly these sections:

Code Review & Mistake
* If the user's solution is correct, state if it is optimal. If it is correct but sub-optimal (e.g., O(N^2) instead of O(N)), clearly specify the best possible time/space complexity and what optimization was missed.
* If the user's solution is incorrect, clearly identify where the main bug, logical error, or missing edge case lies. Be specific and direct.

What Made You Think Like This?
* If correct and optimal, briefly confirm that they correctly identified the pattern (keep it under 15 words).
* If correct but sub-optimal, explain the thinking pattern that led to the slower solution (e.g., nested loops instead of using a hash map).
* If incorrect, explain the reasoning mistake or missing observation that likely led to the approach. Focus on the thinking process.

Correct Approach Tip
* If correct and optimal, state that the approach is optimal and keep this section extremely short (under 15 words).
* If correct but sub-optimal, explain the key insight or pattern needed to achieve the best complexity, keeping it concise and actionable.
* If incorrect, explain the key insight, pattern, or invariant needed to improve and fix the code, keeping it concise and actionable.

Rules:
* If the solution is correct and optimal, keep the entire response extremely short and concise (under 50 words total).
* If the solution is correct but sub-optimal, or incorrect, keep the response under 120 words total, focusing on the gap and how to reach the best approach.
* Be encouraging but honest. Use simple, student-friendly English without academic jargon.
* Do not use markdown tables or bullet points unless necessary.
* Do not use phrases like "As an AI" or "In my opinion."`;

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
            const result = finishAiResponse(content);
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
            const result = finishAiResponse(content);
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
          const result = finishAiResponse(content);
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
  const { openrouterKey, groqKey, openAiKey } = getAiKeys();
  const providerErrors = [];

  if (!openrouterKey && !groqKey && !openAiKey) {
    throw new Error(MISSING_BYOK_MESSAGE);
  }

  const systemPrompt = `You are a helpful programming tutor.
Explain the algorithm logic step-by-step in very simple, plain, and easy-to-understand English.
Use clean, simple numbered steps (pseudo-code style) so a developer can easily translate it directly to code.
Avoid complex math notations, rigid programming syntax, or unnecessary markdown symbols. Keep the tone friendly, natural, and highly readable.
Keep it extremely concise (under 150 words).`;

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
            const result = finishAiResponse(content);
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
            const result = finishAiResponse(content);
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
          const result = finishAiResponse(content);
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
