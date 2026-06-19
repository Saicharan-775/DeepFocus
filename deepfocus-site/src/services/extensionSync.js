import { updateProblemNotesByLink } from './revisionService';
import { supabase } from '../lib/supabaseClient';
import { installRevisionMessageBridge, refreshRevisionProblems } from '../store/revisionStore';
import { getSafeSession } from '../utils/authHelpers';

export function startExtensionSync() {
  installRevisionMessageBridge();

  function sendKeys() {
    const userOpenrouterApiKey = (localStorage.getItem("df_openrouter_api_key") || "").trim();
    const userGroqApiKey = (localStorage.getItem("df_groq_api_key") || "").trim();
    const userOpenAiKey = (localStorage.getItem("df_openai_key") || "").trim();
    const hasUserKey = !!(userOpenrouterApiKey || userGroqApiKey || userOpenAiKey);

    window.postMessage({
      type: "DEEPFOCUS_SET_AI_KEYS",
      openrouterApiKey: hasUserKey ? userOpenrouterApiKey : "",
      groqApiKey: hasUserKey ? userGroqApiKey : "",
      openAiApiKey: hasUserKey ? userOpenAiKey : "",
      aiKeyMode: hasUserKey ? "byok" : "none"
    }, window.location.origin);
  }

  sendKeys();

  setTimeout(() => {
    window.postMessage({ type: "DEEPFOCUS_GET_PENDING_NOTES" }, window.location.origin);
  }, 1000);

  let pongReceived = false;

  async function checkAndConnect(session) {
    if (!session?.user) return;

    pongReceived = false;
    window.postMessage({ type: "DEEPFOCUS_PING_EXTENSION" }, window.location.origin);

    setTimeout(async () => {
      if (!pongReceived) {
        window.dispatchEvent(new CustomEvent('deepfocus_connection_changed', { detail: { connected: false } }));
      }
    }, 2000);
  }

  getSafeSession().then((session) => {
    if (session) checkAndConnect(session);
  }).catch((err) => {
    console.error("[Extension Sync Auth Error]:", err);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) checkAndConnect(session);
  });

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    if (!event.data) return;

    if (event.data.type === "DEEPFOCUS_GET_AI_KEYS") {
      sendKeys();
      window.postMessage({ type: "DEEPFOCUS_GET_PENDING_NOTES" }, window.location.origin);
    }
    
    if (event.data.type === "DEEPFOCUS_SET_PENDING_NOTES") {
      const notes = event.data.notes;
      if (Array.isArray(notes) && notes.length > 0) {
        for (const note of notes) {
          if (note.link && note.summary) {
            await updateProblemNotesByLink(note.link, note.summary, note.title, note.difficulty);
          }
        }
        refreshRevisionProblems();
        window.postMessage({ type: "DEEPFOCUS_CLEAR_PENDING_NOTES" }, window.location.origin);
      }
    }

    if (event.data.type === "DEEPFOCUS_PONG_EXTENSION") {
      pongReceived = true;
      const session = await getSafeSession();
      if (!session?.user) return;

      if (event.data.connected) {
        window.dispatchEvent(new CustomEvent('deepfocus_connection_changed', { detail: { connected: true } }));
        return;
      }

      try {
        const rawToken = 'dfx_' + crypto.randomUUID().replace(/-/g, '');
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(rawToken.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const tokenHash = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');

        const { error: rpcError } = await supabase.rpc('upsert_extension_token', {
          p_token_hash: tokenHash
        });

        if (rpcError) throw rpcError;

        window.postMessage({ type: "DEEPFOCUS_CONNECT", token: rawToken }, window.location.origin);
        window.dispatchEvent(new CustomEvent('deepfocus_connection_changed', { detail: { connected: true } }));
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[DeepFocus] Failed to auto-generate/upsert new extension token:", err);
        }
      }
    }
  });
}
