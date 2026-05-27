import { updateProblemNotesByLink } from './revisionService';
import { supabase } from '../lib/supabaseClient';
import { installRevisionMessageBridge, refreshRevisionProblems } from '../store/revisionStore';

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
      aiKeyMode: hasUserKey ? "byok" : "demo"
    }, "*");
  }

  sendKeys();

  setTimeout(() => {
    window.postMessage({ type: "DEEPFOCUS_GET_PENDING_NOTES" }, "*");
  }, 1000);

  let pongReceived = false;

  async function checkAndConnect(session) {
    if (!session?.user) return;

    pongReceived = false;
    window.postMessage({ type: "DEEPFOCUS_PING_EXTENSION" }, "*");

    setTimeout(async () => {
      if (!pongReceived) {
        console.log("[DeepFocus] Extension ping timed out. Extension might not be installed or active.");
      }
    }, 2000);
  }

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) checkAndConnect(session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) checkAndConnect(session);
  });

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    if (!event.data) return;

    if (event.data.type === "DEEPFOCUS_GET_AI_KEYS") {
      sendKeys();
      window.postMessage({ type: "DEEPFOCUS_GET_PENDING_NOTES" }, "*");
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
        window.postMessage({ type: "DEEPFOCUS_CLEAR_PENDING_NOTES" }, "*");
      }
    }

    if (event.data.type === "DEEPFOCUS_PONG_EXTENSION") {
      pongReceived = true;
      const currentToken = event.data.token;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      let isTokenValid = false;

      if (currentToken) {
        try {
          const { data, error } = await supabase.rpc('verify_extension_token', { p_raw_token: currentToken });
          if (!error && data && data.success) {
            isTokenValid = true;
            console.log("[DeepFocus] Stored extension token is valid.");
            window.dispatchEvent(new CustomEvent('deepfocus_connection_changed', { detail: { connected: true } }));
          } else {
            console.warn("[DeepFocus] Stored extension token is invalid or expired. Generating a new one...");
          }
        } catch (e) {
          console.error("[DeepFocus] Verification RPC failed:", e);
        }
      }

      if (!isTokenValid) {
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

          console.log("[DeepFocus] Auto-generated and upserted new token successfully.");
          window.postMessage({ type: "DEEPFOCUS_CONNECT", token: rawToken }, "*");
          window.dispatchEvent(new CustomEvent('deepfocus_connection_changed', { detail: { connected: true } }));
        } catch (err) {
          console.error("[DeepFocus] Failed to auto-generate/upsert new extension token:", err);
        }
      }
    }
  });
}
