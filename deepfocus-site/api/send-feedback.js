import { createClient } from "@supabase/supabase-js";

// Simple in-memory rate limiting cache
const rateLimitCache = new Map();

function isRateLimited(userId, ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const limit = 5; // 5 requests

  const keys = [];
  if (userId) keys.push(`user_${userId}`);
  if (ip) keys.push(`ip_${ip}`);

  let limited = false;
  for (const key of keys) {
    let requests = rateLimitCache.get(key) || [];
    // Filter out requests older than the 15-minute window
    requests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (requests.length >= limit) {
      limited = true;
    }
    
    // Add current request timestamp
    requests.push(now);
    rateLimitCache.set(key, requests);
  }
  return limited;
}

function cleanupCache() {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  for (const [key, requests] of rateLimitCache.entries()) {
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    if (validRequests.length === 0) {
      rateLimitCache.delete(key);
    } else {
      rateLimitCache.set(key, validRequests);
    }
  }
}

export default async function handler(req, res) {
  // 1. Enforce POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1b. Enforce JWT authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization credentials required" });
  }
  const token = authHeader.split(" ")[1];

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { data, error: authError } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (authError || !user) {
    return res.status(401).json({ error: "Invalid authentication credentials" });
  }

  // 1c. Enforce Rate Limiting (5 requests per 15 minutes)
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
  cleanupCache();
  if (isRateLimited(user.id, ip)) {
    return res.status(429).json({ error: "Too many feedback submissions. Please wait 15 minutes before trying again." });
  }

  try {
    const { category, subject, details, priority, email, attachment, pageUrl, rating } = req.body;

    // 2. Server-side Validation & Input Sanitization
    if (!category || !subject || !details) {
      return res.status(400).json({ error: "Missing required fields: category, subject, and details are required." });
    }

    const validCategories = ["feature", "bug", "improvement", "general"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category: must be one of ${validCategories.join(", ")}` });
    }

    // Sanitize and enforce character limits
    const cleanSubject = String(subject).trim().substring(0, 120);
    const cleanDetails = String(details).trim().substring(0, 2000);
    const cleanEmail = email ? String(email).trim().substring(0, 100) : null;
    const cleanPriority = String(priority || "medium").trim().toLowerCase();
    const cleanPageUrl = pageUrl ? String(pageUrl).substring(0, 2083) : "Unknown";
    const parsedRating = rating ? parseInt(rating, 10) : null;

    if (cleanSubject.length < 4) {
      return res.status(400).json({ error: "Subject must be at least 4 characters long." });
    }
    if (cleanDetails.length < 10) {
      return res.status(400).json({ error: "Details must be at least 10 characters long." });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Provided email address is invalid." });
    }

    // 3. Secure API Key Retrieval
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[Feedback API Error] RESEND_API_KEY environment variable is not configured.");
      return res.status(500).json({ error: "Internal Server Error: Email service configuration missing." });
    }

    // 4. Build Category Label
    const categoryLabels = {
      feature: "Feature Request",
      bug: "Bug Report",
      improvement: "Improvement Suggestion",
      general: "General Feedback",
    };
    const categoryLabel = categoryLabels[category] || "General";

    // 5. Setup styling badges dynamically (Premium SaaS light design)
    const badgeColors = {
      bug: { bg: "#fef2f2", text: "#ef4444", border: "#fee2e2" },
      feature: { bg: "#eff6ff", text: "#3b82f6", border: "#dbeafe" },
      improvement: { bg: "#fffbeb", text: "#d97706", border: "#fef3c7" },
      general: { bg: "#faf5ff", text: "#7c3aed", border: "#f3e8ff" },
    };
    const colors = badgeColors[category] || badgeColors.general;

    const priorityColors = {
      low: { bg: "#f0fdf4", text: "#16a34a", border: "#dcfce7", label: "Low Priority" },
      medium: { bg: "#fffbeb", text: "#d97706", border: "#fef3c7", label: "Medium Priority" },
      high: { bg: "#fff7ed", text: "#ea580c", border: "#ffedd5", label: "High Priority" },
      critical: { bg: "#fef2f2", text: "#dc2626", border: "#fee2e2", label: "Critical Blocker" },
    };
    const pColors = priorityColors[cleanPriority] || priorityColors.medium;

    // 6. Build Premium Transactional SaaS HTML Template (Light Theme, ultra-clean)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DeepFocus Feedback Ticket</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <div style="background-color: #f8fafc; padding: 48px 16px;">
          <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03), 0 1px 4px rgba(15, 23, 42, 0.02);">
            
            <!-- Top brand line accent -->
            <div style="background-color: #7c3aed; height: 4px; width: 100%;"></div>
            
            <!-- Header Section -->
            <div style="padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: middle; width: 32px;">
                    <img src="https://raw.githubusercontent.com/Saicharan-775/DeepFocus/main/deepfocus-site/public/deepfocus-logo-small.png" alt="DF" style="display: block; width: 28px; height: 28px; border-radius: 6px; border: 1px solid #f1f5f9;" width="28" height="28" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 8px;">
                    <span style="font-weight: 700; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; color: #0f172a;">DeepFocus</span>
                  </td>
                </tr>
              </table>
              <h2 style="margin: 20px 0 6px; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em; line-height: 1.25;">New Feedback Received</h2>
              <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 400; line-height: 1.45;">A user has submitted feedback through DeepFocus.</p>
            </div>

            <!-- Content Area -->
            <div style="padding: 32px;">
              
              <!-- Badges Row -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; padding-bottom: 6px;">Category</td>
                  <td style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; padding-bottom: 6px; text-align: right;">Urgency</td>
                </tr>
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 8px; font-size: 10px; font-weight: 700; border-radius: 4px; background-color: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border}; text-transform: uppercase; letter-spacing: 0.025em;">
                      ${categoryLabel}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span style="display: inline-block; padding: 4px 8px; font-size: 10px; font-weight: 700; border-radius: 4px; background-color: ${pColors.bg}; color: ${pColors.text}; border: 1px solid ${pColors.border}; text-transform: uppercase; letter-spacing: 0.025em;">
                      ${pColors.label}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Subject Line -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px;">Subject</div>
                <div style="font-size: 15px; color: #0f172a; font-weight: 600; line-height: 1.4;">${cleanSubject}</div>
              </div>

              <!-- Message Card -->
              <div style="margin-bottom: 28px;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 8px;">Message Details</div>
                <div style="background-color: #f8fafc; border-left: 3px solid #7c3aed; padding: 16px 20px; border-radius: 0 8px 8px 0; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155; font-weight: 400; white-space: pre-wrap;">${cleanDetails}</p>
                </div>
              </div>

              <!-- Context Details Card -->
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                  <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Submission Context</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 0;">
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 16px; color: #64748b; font-weight: 500; width: 120px;">Sender Email</td>
                    <td style="padding: 10px 16px; text-align: right; color: #0f172a; font-weight: 600;">
                      ${cleanEmail ? `<a href="mailto:${cleanEmail}" style="color: #7c3aed; text-decoration: none;">${cleanEmail}</a>` : '<span style="color: #94a3b8; font-style: italic;">Anonymous</span>'}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 16px; color: #64748b; font-weight: 500; vertical-align: top;">Workspace URL</td>
                    <td style="padding: 10px 16px; text-align: right; word-break: break-all; max-width: 250px;">
                      <a href="${cleanPageUrl}" target="_blank" style="color: #7c3aed; text-decoration: none; font-weight: 600;">
                        View Page URL &rarr;
                      </a>
                    </td>
                  </tr>
                  ${parsedRating ? `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 16px; color: #64748b; font-weight: 500;">User Rating</td>
                    <td style="padding: 10px 16px; text-align: right; color: #eab308; font-weight: 600;">
                      ${'★'.repeat(parsedRating)}${'☆'.repeat(5 - parsedRating)} (${parsedRating}/5)
                    </td>
                  </tr>
                  ` : ''}
                  ${attachment ? `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 16px; color: #64748b; font-weight: 500;">Attachment</td>
                    <td style="padding: 10px 16px; text-align: right; color: #3b82f6; font-weight: 600;">
                      📎 ${attachment.name} (${attachment.size})
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 10px 16px; color: #64748b; font-weight: 500;">Timestamp</td>
                    <td style="padding: 10px 16px; text-align: right; color: #334155; font-weight: 500;">
                      ${new Date().toLocaleString("en-US", { timeZone: "UTC" })} UTC
                    </td>
                  </tr>
                </table>
              </div>

            </div>

            <!-- Footer Branding Section -->
            <div style="padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">Powered by DeepFocus Feedback System</p>
              <p style="margin: 3px 0 0; font-size: 10px; color: #94a3b8; font-weight: 500; font-style: italic;">Build real intuition.</p>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;

    // 7. Format attachments for Resend if present
    const attachments = [];
    if (attachment && attachment.dataUrl && attachment.name) {
      try {
        const base64Data = attachment.dataUrl.split(",")[1];
        if (base64Data) {
          attachments.push({
            filename: attachment.name,
            content: base64Data,
          });
        }
      } catch (err) {
        console.error("[Feedback API Warning] Failed to parse attachment base64:", err);
      }
    }

    // 8. Dispatch request to Resend API
    let recipient = "support.deepfocus@gmail.com";
    const resendPayload = {
      from: "DeepFocus <onboarding@resend.dev>",
      to: [recipient],
      subject: `[DeepFocus Feedback] ${categoryLabel} - ${cleanSubject}`,
      html: emailHtml,
    };

    if (attachments.length > 0) {
      resendPayload.attachments = attachments;
    }

    let response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    let data = await response.json();

    // If sandbox account restrictions block unverified recipient, automatically retry with the developer's verified email
    if (!response.ok && (response.status === 403 || response.status === 422 || response.status === 400)) {
      console.warn(`[Feedback API Warning] Failed to dispatch to ${recipient} (unverified restriction). Retrying with developer email...`);
      recipient = "nagillasaicharan775@gmail.com";
      resendPayload.to = [recipient];
      
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendPayload),
      });
      data = await response.json();
    }

    if (!response.ok) {
      console.error("[Feedback API Error] Resend dispatch failed:", data);
      return res.status(502).json({ error: "Failed to dispatch email via Resend API provider." });
    }

    // 9. Success response
    return res.status(200).json({ success: true, messageId: data.id });
  } catch (error) {
    console.error("[Feedback API Fatal Error] Request crashed:", error);
    return res.status(500).json({ error: "Internal Server Error: Something went wrong." });
  }
}
