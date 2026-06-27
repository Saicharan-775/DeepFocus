import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Enforce POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    // 2. Validate parameters
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment signature verification parameters." });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("[Verify Payment Error] Razorpay secret key is missing on server.");
      return res.status(500).json({ error: "Server configuration error: Razorpay keys missing." });
    }

    // 3. Cryptographic verification of signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    const isVerified = expectedSignature === razorpay_signature;

    // Resolve Supabase environment variables defensively
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Verify Payment Error] Supabase credentials (URL/Service Role Key) are missing on server.");
      return res.status(500).json({ error: "Server configuration error: Supabase credentials missing." });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (isVerified) {
      // 4. Update donation status to successful in Database
      const { data, error: dbError } = await supabaseAdmin
        .from("donations")
        .update({
          status: "success",
          signature_verified: true,
          payment_id: razorpay_payment_id,
        })
        .eq("order_id", razorpay_order_id)
        .select()
        .single();

      if (dbError) {
        console.error("[Verify Payment Database Error] Update failed for verified order:", dbError);
        return res.status(500).json({ error: "Failed to record donation completion." });
      }

      if (!data) {
        console.error(`[Verify Payment Error] Order ID ${razorpay_order_id} not found in database.`);
        return res.status(404).json({ error: "Donation order registry not found." });
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and registered successfully.",
        donation: data,
      });
    } else {
      // 5. Mark signature verification failed in Database
      console.warn(`[Verify Payment Warning] Signature verification failed for order ${razorpay_order_id}`);
      
      await supabaseAdmin
        .from("donations")
        .update({
          status: "failed",
          signature_verified: false,
          payment_id: razorpay_payment_id,
        })
        .eq("order_id", razorpay_order_id);

      return res.status(400).json({ error: "Cryptographic signature mismatch. Verification failed." });
    }
  } catch (error: any) {
    console.error("Error verifying Razorpay signature:", error);
    return res.status(500).json({ error: error?.message || "Verification workflow crashed." });
  }
}
