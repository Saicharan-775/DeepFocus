import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Razorpay from "razorpay";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Enforce POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { amount, name, email, message, anonymous } = req.body || {};

    // 2. Server-side Input Validation
    const donationAmount = Number(amount);
    if (isNaN(donationAmount) || donationAmount < 10 || donationAmount > 100000) {
      return res.status(400).json({ error: "Invalid donation amount. Min is ₹10 and Max is ₹100,000." });
    }

    const sanitizedMessage = typeof message === "string" ? message.trim().slice(0, 200) : null;
    const sanitizedName = typeof name === "string" && name.trim() ? name.trim().slice(0, 50) : null;
    const sanitizedEmail = typeof email === "string" && email.trim() ? email.trim().slice(0, 100) : null;
    const isAnonymous = Boolean(anonymous);

    // Email format validation if provided
    if (sanitizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return res.status(400).json({ error: "Invalid email address format." });
    }

    // Resolve Supabase environment variables defensively
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Create Order Error] Supabase credentials (URL/Service Role Key) are missing on server.");
      return res.status(500).json({ error: "Server configuration error: Supabase credentials missing." });
    }

    // 3. Initialize Razorpay
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("[Create Order Error] Razorpay credentials (ID/Secret) are missing on server.");
      return res.status(500).json({ error: "Server configuration error: Razorpay keys missing." });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 4. Create Razorpay Order
    // Amount is in paisa (1 INR = 100 paisa)
    const order = await razorpay.orders.create({
      amount: donationAmount * 100,
      currency: "INR",
      receipt: `receipt_df_${Date.now()}`,
      notes: {
        supporter_name: isAnonymous ? "Anonymous" : sanitizedName || "Friend",
        message: sanitizedMessage || "",
      },
    });

    // 5. Initialize Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 6. Save Pending Donation Record to Supabase
    const { error: dbError } = await supabaseAdmin.from("donations").insert({
      name: isAnonymous ? null : sanitizedName,
      email: sanitizedEmail,
      amount: donationAmount,
      currency: "INR",
      order_id: order.id,
      anonymous: isAnonymous,
      message: sanitizedMessage,
      status: "pending",
    });

    if (dbError) {
      console.error("[Create Order Database Error] Failed to log pending donation:", dbError);
      return res.status(500).json({ error: "Database transaction failed." });
    }

    // 7. Return Order Info to Client
    return res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({ error: error?.message || "Internal server error." });
  }
}
