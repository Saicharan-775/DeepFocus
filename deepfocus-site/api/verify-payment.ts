import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("Incoming request: verify-payment");

  // 1. Enforce POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    // 2. Validate parameters
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log("Verification failure: Missing payment signature verification parameters.");
      return res.status(400).json({ error: "Missing payment signature verification parameters." });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("[Verify Payment Error] Razorpay secret key is missing on server.");
      return res.status(500).json({ error: "Server configuration error: Razorpay keys missing." });
    }

    // Resolve Supabase environment variables defensively
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    let dbDonation = null;
    let supabaseAdmin = null;

    if (supabaseUrl && supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Verify the order exists in our database to prevent tampered payloads or orphan updates
      const { data: donation, error: dbErr } = await supabaseAdmin
        .from("donations")
        .select("*")
        .eq("order_id", razorpay_order_id)
        .maybeSingle();

      if (dbErr) {
        console.error("[Verify Payment Database Fetch Warning] Failed to query donation:", dbErr);
      }
      dbDonation = donation;

      if (!dbDonation) {
        console.log(`Verification failure: Order ID ${razorpay_order_id} does not exist in database.`);
        return res.status(400).json({ error: "Invalid order: This payment order was not registered by our servers." });
      }

      // Check for duplicate/replay verification requests
      if (dbDonation.status === "success" && dbDonation.signature_verified) {
        console.log("Verification success (Idempotent replay)");
        return res.status(200).json({
          success: true,
          message: "Payment verified successfully.",
        });
      }
    }

    // 3. Cryptographic verification of signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    const isVerified = expectedSignature === razorpay_signature;

    if (isVerified) {
      console.log("Verification success");

      // 4. Update status to successful in Database if Supabase is connected
      if (supabaseAdmin) {
        try {
          const { error: updateErr } = await supabaseAdmin
            .from("donations")
            .update({
              status: "success",
              signature_verified: true,
              payment_id: razorpay_payment_id,
            })
            .eq("order_id", razorpay_order_id);

          if (updateErr) {
            console.error("[Verify Payment Update Error] Failed to update success status:", updateErr);
            return res.status(500).json({ error: "Failed to persist successful payment status in database." });
          }
        } catch (dbErr) {
          console.error("[Verify Payment Database Log Warning] Failed to update success status:", dbErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully.",
      });
    } else {
      console.log("Verification failure: Signature mismatch");

      // Mark failed in Database if Supabase is connected and order exists
      if (supabaseAdmin && dbDonation) {
        try {
          await supabaseAdmin
            .from("donations")
            .update({
              status: "failed",
              signature_verified: false,
              payment_id: razorpay_payment_id,
            })
            .eq("order_id", razorpay_order_id);
        } catch (dbErr) {
          console.error("[Verify Payment Database Log Warning] Failed to update failed status:", dbErr);
        }
      }

      return res.status(400).json({ error: "Cryptographic signature mismatch. Verification failed." });
    }
  } catch (error: any) {
    console.error("Error verifying Razorpay signature:", error);
    return res.status(500).json({ error: error?.message || "Verification workflow crashed." });
  }
}
