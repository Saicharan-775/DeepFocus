// Vercel Serverless Function: Send Feedback via Resend API
// Handles secure server-side email dispatch for DeepFocus MVP (Root Version)

export default async function handler(req, res) {
  // 1. Enforce POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { category, subject, details, priority, email, attachment, pageUrl } = req.body;

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

    // 5. Setup styling badges dynamically
    const badgeColors = {
      bug: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", border: "rgba(239, 68, 68, 0.2)" },
      feature: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", border: "rgba(59, 130, 246, 0.2)" },
      improvement: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.2)" },
      general: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6", border: "rgba(139, 92, 246, 0.2)" },
    };
    const colors = badgeColors[category] || badgeColors.general;

    const priorityColors = {
      low: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", border: "rgba(16, 185, 129, 0.2)", label: "Low Priority" },
      medium: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.2)", label: "Medium Priority" },
      high: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316", border: "rgba(249, 115, 22, 0.2)", label: "High Priority" },
      critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", border: "rgba(239, 68, 68, 0.2)", label: "Critical Blocker" },
    };
    const pColors = priorityColors[cleanPriority] || priorityColors.medium;

    // 6. Build Premium AI SaaS HTML Template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DeepFocus Feedback</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <div style="background-color: #0b0f19; padding: 40px 16px;">
          <div style="max-width: 580px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
            
            <!-- Glow Accent Top Border -->
            <div style="background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%); height: 5px; width: 100%;"></div>
            
            <!-- Header Section -->
            <div style="padding: 36px 32px 28px; text-align: center; border-bottom: 1px solid #1f2937; background: linear-gradient(180deg, rgba(139, 92, 246, 0.03) 0%, transparent 100%);">
              <div style="margin-bottom: 18px; display: inline-block;">
                <div style="width: 46px; height: 46px; line-height: 46px; text-align: center; background-color: #09090b; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; font-weight: 800; font-size: 18px; color: #ffffff; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);">DF</div>
              </div>
              <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em; line-height: 1.25;">New Feedback Received</h2>
              <p style="margin: 6px 0 0; font-size: 13px; color: #9ca3af; font-weight: 500;">A user has submitted feedback through DeepFocus.</p>
            </div>

            <!-- Content Area -->
            <div style="padding: 32px;">
              
              <!-- Badges Card Row -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px; background-color: #131924; border-radius: 12px; border: 1px solid #1f2937;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding-bottom: 6px;">Category</td>
                        <td style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding-bottom: 6px; text-align: right;">Urgency</td>
                      </tr>
                      <tr>
                        <td>
                          <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; border-radius: 6px; background-color: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border}; text-transform: uppercase; letter-spacing: 0.025em;">
                            ${categoryLabel}
                          </span>
                        </td>
                        <td style="text-align: right;">
                          <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; border-radius: 6px; background-color: ${pColors.bg}; color: ${pColors.text}; border: 1px solid ${pColors.border}; text-transform: uppercase; letter-spacing: 0.025em;">
                            ${pColors.label}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Subject Line -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 6px;">Subject</div>
                <div style="font-size: 15px; color: #ffffff; font-weight: 600; line-height: 1.4;">${cleanSubject}</div>
              </div>

              <!-- Feedback Details Card (Quote Style) -->
              <div style="margin-bottom: 28px;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 8px;">Feedback Message</div>
                <div style="background-color: #0a0e17; border-left: 3px solid #8b5cf6; border-radius: 0 12px 12px 0; padding: 20px 24px; border-top: 1px solid #1e293b; border-right: 1px solid #1e293b; border-bottom: 1px solid #1e293b; box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);">
                  <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #e5e7eb; font-weight: 400; white-space: pre-wrap;">${cleanDetails}</p>
                </div>
              </div>

              <!-- Context Details Card -->
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #1f2937; background-color: #131924; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px; border-radius: 12px; border: 1px solid #1f2937; background-color: #131924;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 12px;">Submission Context</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                      <tr>
                        <td style="padding: 6px 0; color: #9ca3af; font-weight: 500;">Sender Email</td>
                        <td style="padding: 6px 0; text-align: right; color: #ffffff; font-weight: 600;">
                          ${cleanEmail ? `<a href="mailto:${cleanEmail}" style="color: #3b82f6; text-decoration: none;">${cleanEmail}</a>` : '<span style="color: #4b5563; font-style: italic;">Anonymous</span>'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #9ca3af; font-weight: 500; vertical-align: top;">Origin Page URL</td>
                        <td style="padding: 6px 0; text-align: right; max-width: 260px; word-break: break-all;">
                          <a href="${cleanPageUrl}" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: 600;">
                            View Page Link &rarr;
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #9ca3af; font-weight: 500;">Timestamp</td>
                        <td style="padding: 6px 0; text-align: right; color: #d1d5db; font-weight: 500;">
                          ${new Date().toLocaleString("en-US", { timeZone: "UTC" })} UTC
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </div>

            <!-- Footer Branding Section -->
            <div style="padding: 24px; background-color: #09090b; text-align: center; border-top: 1px solid #1f2937;">
              <p style="margin: 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563;">Powered by DeepFocus Feedback System</p>
              <p style="margin: 3px 0 0; font-size: 11px; color: #9ca3af; font-weight: 500; font-style: italic;">Build real intuition.</p>
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
    const resendPayload = {
      from: "DeepFocus <onboarding@resend.dev>",
      to: ["support.deepfocus@gmail.com"],
      subject: `[DeepFocus Feedback] ${categoryLabel} - ${cleanSubject}`,
      html: emailHtml,
    };

    if (attachments.length > 0) {
      resendPayload.attachments = attachments;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const data = await response.json();

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
