import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[Account Deletion API] Received account deletion request.`);

  // 1. Enforce POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Enforce JWT authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("[Account Deletion API] Authorization header missing or invalid.");
    return res.status(401).json({ error: "Authorization credentials required" });
  }
  const token = authHeader.split(" ")[1];

  // Resolve Supabase environment variables defensively (supports all naming conventions)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Account Deletion Error] Core Supabase credentials (URL/Anon Key) are missing on server.");
    return res.status(500).json({ error: "Server configuration error: Core Supabase credentials are missing." });
  }

  // Initialize client with authorization headers to verify the user identity
  const standardSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const { data: userData, error: authError } = await standardSupabase.auth.getUser(token);
  const user = userData?.user;

  if (authError || !user) {
    console.error("[Account Deletion Error] Authentication verification failed:", authError?.message);
    return res.status(401).json({ error: `Authentication failed: ${authError?.message || "Invalid token."}` });
  }

  const userId = user.id;
  const userEmail = user.email;
  console.log(`[Account Deletion Service] Starting permanent deletion for user: ${userId} (${userEmail})`);

  // Initialize administrative client using Service Role Key if available
  const adminSupabase = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

  try {
    // 3. Try to clean up database records in a single transaction via RPC
    let rpcSuccess = false;
    const clientForDb = adminSupabase || standardSupabase;
    
    try {
      console.log(`[Account Deletion Service] Executing transactional RPC delete_user_account_admin for user: ${userId}`);
      const { error: rpcError } = await clientForDb.rpc("delete_user_account_admin", {
        target_user_id: userId
      });

      if (!rpcError) {
        console.log(`[Account Deletion Service] Transactional RPC deletion completed successfully for user: ${userId}`);
        rpcSuccess = true;
      } else {
        console.warn(`[Account Deletion Service] RPC delete_user_account_admin failed: ${rpcError.message} (Code: ${rpcError.code}). Falling back to sequential cleanup.`);
      }
    } catch (rpcCatchErr: any) {
      console.warn(`[Account Deletion Service] RPC delete_user_account_admin invocation crashed: ${rpcCatchErr?.message || rpcCatchErr}. Falling back to sequential cleanup.`);
    }

    // 4. Sequential fallback: clean up user data table-by-table if RPC was not successful/available
    if (!rpcSuccess) {
      console.log(`[Account Deletion Service] Running sequential fallback cleanup for user: ${userId}`);
      const clientToUse = adminSupabase || standardSupabase;

      // Clean unsubscribed emails if exists
      if (userEmail) {
        try {
          await clientToUse.from("unsubscribed_emails").delete().eq("email", userEmail);
        } catch (e) {
          console.warn(`[Account Deletion Service] Sequential fallback: failed to delete unsubscribed email:`, e);
        }
      }

      // Tables to delete sequentially
      const tables = [
        { name: "profiles", key: "id" },
        { name: "revision_problems", key: "user_id" },
        { name: "focus_sessions", key: "user_id" },
        { name: "extension_connections", key: "user_id" },
        { name: "community_posts", key: "user_id" },
        { name: "community_comments", key: "user_id" },
        { name: "community_post_votes", key: "user_id" },
        { name: "community_post_loves", key: "user_id" },
        { name: "ai_demo_usage", key: "user_id" },
        { name: "notification_interactions", key: "user_id" },
        { name: "broadcast_deliveries", key: "user_id" },
        { name: "notifications", key: "user_id" }
      ];

      for (const table of tables) {
        try {
          const { error: deleteError } = await clientToUse
            .from(table.name)
            .delete()
            .eq(table.key, userId);

          if (deleteError) {
            console.warn(`[Account Deletion Service] Sequential fallback warning: failed to purge table ${table.name}:`, deleteError.message);
          } else {
            console.log(`[Account Deletion Service] Sequential fallback: purged table ${table.name}`);
          }
        } catch (tableErr: any) {
          console.warn(`[Account Deletion Service] Sequential fallback error on table ${table.name}:`, tableErr?.message || tableErr);
        }
      }
    }

    // 5. Delete user files from Supabase Storage buckets
    try {
      const buckets = ["avatars", "profiles", "attachments"];
      const clientForStorage = adminSupabase || standardSupabase;

      for (const bucket of buckets) {
        console.log(`[Account Deletion Service] Cleaning up storage bucket: ${bucket}`);
        const { data: files, error: listError } = await clientForStorage.storage
          .from(bucket)
          .list(userId);

        if (files && files.length > 0 && !listError) {
          const filesToRemove = files.map((file) => `${userId}/${file.name}`);
          const { error: removeError } = await clientForStorage.storage
            .from(bucket)
            .remove(filesToRemove);
          if (removeError) {
            console.warn(`[Account Deletion Service] Failed to remove storage objects in ${bucket}:`, removeError.message);
          } else {
            console.log(`[Account Deletion Service] Successfully removed ${filesToRemove.length} storage objects in ${bucket}`);
          }
        }
      }
    } catch (storageErr: any) {
      console.warn("[Account Deletion Service] Non-blocking warning during storage cleanup:", storageErr?.message || storageErr);
    }

    // 6. Delete the auth user record
    // If we have admin client, we use it to delete user from Auth. Otherwise, if RPC succeeded,
    // the user record is already deleted from auth.users via SQL. Let's make sure it is removed.
    if (adminSupabase) {
      console.log(`[Account Deletion Service] Calling Admin Auth API to delete user record for user: ${userId}`);
      const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        // If it fails with user not found, it means RPC already deleted the auth user, which is a success!
        if (authDeleteError.message.includes("not found") || authDeleteError.message.includes("does not exist")) {
          console.log(`[Account Deletion Service] User already deleted from auth via database cascade/SQL.`);
        } else {
          console.error("[Account Deletion Error] Supabase Auth admin delete failed:", authDeleteError.message);
          return res.status(502).json({ 
            error: `Supabase Auth server rejected account deletion: ${authDeleteError.message}` 
          });
        }
      }
    } else {
      // If we don't have admin client, the auth deletion is dependent on the RPC SQL having executed.
      // If RPC failed to run, we return an error indicating missing service role credentials.
      if (!rpcSuccess) {
        console.error("[Account Deletion Error] Admin credentials (SUPABASE_SERVICE_ROLE_KEY) are missing on the server and RPC transaction failed.");
        return res.status(500).json({ 
          error: "Admin credentials (SUPABASE_SERVICE_ROLE_KEY) are missing on the server, and transactional database deletion was not available." 
        });
      }
    }

    console.log(`[Account Deletion Service] Successfully completed deletion flow for user: ${userId}`);
    return res.status(200).json({ 
      success: true, 
      message: "Account and all associated data permanently deleted." 
    });

  } catch (error: any) {
    console.error("[Account Deletion Error] Fatal crash during execution flow:", error);
    return res.status(500).json({ 
      error: `Internal Server Error: Account deletion crashed. Details: ${error?.message || error}` 
    });
  }
}
