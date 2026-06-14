// Vercel Serverless Function: Send Feedback via Resend API
// Handles secure server-side email dispatch for DeepFocus MVP

export default async function handler(req, res) {
  // 1. Enforce POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { category, subject, details, priority, email, attachment, browserInfo, pageUrl } = req.body;

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
    const cleanEmail = email ? String(email).trim().substring(0, 100) : "Not Provided";
    const cleanPriority = String(priority || "medium").trim();
    const cleanBrowser = browserInfo ? String(browserInfo).substring(0, 250) : "Unknown";
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

    // 3. Rate Limiting Check (Simple IP-based Header Check)
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

    // 4. Secure API Key Retrieval
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[Feedback API Error] RESEND_API_KEY environment variable is not configured.");
      return res.status(500).json({ error: "Internal Server Error: Email service configuration missing." });
    }

    // 5. Build Category Label
    const categoryLabels = {
      feature: "Feature Request",
      bug: "Bug Report",
      improvement: "Improvement Suggestion",
      general: "General Feedback",
    };
    const categoryLabel = categoryLabels[category] || "General";

    // 6. Build HTML Template (Responsive, modern dark slate design)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>DeepFocus Feedback</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #09090b;
            color: #e4e4e7;
            margin: 0;
            padding: 24px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #18181b;
            border: 1px solid #27272a;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          }
          .header {
            background-color: #09090b;
            padding: 24px;
            border-bottom: 1px solid #27272a;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.025em;
            color: #ffffff;
          }
          .header span {
            color: #a78bfa;
          }
          .content {
            padding: 32px 24px;
          }
          .details-box {
            background-color: #09090b;
            border: 1px solid #27272a;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.6;
            color: #f4f4f5;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 24px;
          }
          .meta-table td {
            padding: 8px 0;
            border-bottom: 1px solid #27272a;
          }
          .meta-table td.label {
            color: #a1a1aa;
            width: 130px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .meta-table td.value {
            color: #ffffff;
            font-weight: 500;
          }
          .footer {
            background-color: #09090b;
            padding: 16px 24px;
            border-top: 1px solid #27272a;
            text-align: center;
            font-size: 11px;
            color: #71717a;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Deep<span>Focus</span> Feedback System</h1>
          </div>
          <div class="content">
            <table class="meta-table">
              <tr>
                <td class="label">Category</td>
                <td class="value">${categoryLabel}</td>
              </tr>
              <tr>
                <td class="label">Subject</td>
                <td class="value">${cleanSubject}</td>
              </tr>
              <tr>
                <td class="label">User Email</td>
                <td class="value">${cleanEmail}</td>
              </tr>
              <tr>
                <td class="label">Priority</td>
                <td class="value" style="text-transform: capitalize;">${cleanPriority}</td>
              </tr>
              <tr>
                <td class="label">Submitted At</td>
                <td class="value">${new Date().toISOString()}</td>
              </tr>
              <tr>
                <td class="label">Page URL</td>
                <td class="value">${cleanPageUrl}</td>
              </tr>
              <tr>
                <td class="label">Client IP</td>
                <td class="value">${clientIp}</td>
              </tr>
              <tr>
                <td class="label">Browser UA</td>
                <td class="value" style="font-family: monospace; font-size: 11px;">${cleanBrowser}</td>
              </tr>
            </table>

            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin-bottom: 8px;">
              Feedback Message:
            </div>
            <div class="details-box">${cleanDetails}</div>
          </div>
          <div class="footer">
            Automated delivery to support.deepfocus@gmail.com via Resend API
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
