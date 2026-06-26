import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // 1. Enforce POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Enforce JWT authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization credentials required" });
  }
  const token = authHeader.split(" ")[1];

  // Initialize standard client to verify user identity
  const standardSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: userData, error: authError } = await standardSupabase.auth.getUser(token);
  const user = userData?.user;
  if (authError || !user) {
    return res.status(401).json({ error: "Invalid authentication credentials" });
  }

  const userId = user.id;

  // Initialize administrative client using Service Role Key
  const adminSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 3. Explicitly delete user data to ensure compliance before deleting auth record
    // Delete revision problems
    await adminSupabase
      .from('revision_problems')
      .delete()
      .eq('user_id', userId);

    // Delete focus sessions
    await adminSupabase
      .from('focus_sessions')
      .delete()
      .eq('user_id', userId);

    // Delete extension connections
    await adminSupabase
      .from('extension_connections')
      .delete()
      .eq('user_id', userId);

    // 4. Delete the auth user record permanently
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[Account Deletion Error] Supabase Auth admin delete failed:", deleteError);
      return res.status(502).json({ error: "Failed to delete authentication user record." });
    }

    return res.status(200).json({ success: true, message: "Account and all associated data permanently deleted." });
  } catch (error) {
    console.error("[Account Deletion Error] Fatal error during deletion flow:", error);
    return res.status(500).json({ error: "Internal Server Error: Account deletion crashed." });
  }
}
