import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

function buildEmailHtml({ title, message, ctaText, ctaUrl, imageUrl, email }) {
  const ctaSection = ctaText && ctaUrl ? `
    <div style="margin-top: 32px; text-align: center;">
      <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; background-image: linear-gradient(135deg, #7c3aed, #4f46e5); text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35); transition: all 0.2s ease;">
        ${ctaText}
      </a>
    </div>
  ` : '';

  const imageSection = imageUrl ? `
    <div style="margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #27272a;">
      <img src="${imageUrl}" alt="Broadcast Media" style="width: 100%; display: block; object-cover: cover;" />
    </div>
  ` : '';

  const unsubscribeUrl = `https://deepfocus.app/unsubscribe?email=${encodeURIComponent(email)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7; -webkit-font-smoothing: antialiased;">
      <div style="background-color: #09090b; padding: 48px 16px;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #030303; border: 1px solid #18181b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Brand Accent -->
          <div style="background-image: linear-gradient(90deg, #7c3aed, #4f46e5); height: 5px; width: 100%;"></div>
          
          <!-- Header -->
          <div style="padding: 32px 32px 24px; border-bottom: 1px solid #18181b; text-align: center;">
            <span style="font-weight: 800; font-size: 16px; letter-spacing: 0.1em; text-transform: uppercase; color: #a78bfa;">DeepFocus</span>
          </div>

          <!-- Body Content -->
          <div style="padding: 32px;">
            ${imageSection}
            
            <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em; line-height: 1.3;">
              ${title}
            </h2>
            
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #a1a1aa; font-weight: 400; white-space: pre-wrap;">
              ${message}
            </p>

            ${ctaSection}
          </div>

          <!-- Footer -->
          <div style="padding: 24px; background-color: #010101; text-align: center; border-top: 1px solid #18181b;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #52525b; font-weight: 600;">
              DeepFocus Productivity Platform
            </p>
            <p style="margin: 6px 0 0; font-size: 11px; color: #52525b; font-weight: 400;">
              You received this announcement because you are a registered user of DeepFocus.
            </p>
            <p style="margin: 12px 0 0; font-size: 10px; color: #71717a;">
              Don't want these emails? <a href="${unsubscribeUrl}" style="color: #a78bfa; text-decoration: underline;">Unsubscribe instantly</a>.
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization header is missing or malformed' });
  }

  try {
    const { notificationId, isTestSend = false, testEmail = null } = req.body;
    if (!notificationId) {
      return res.status(400).json({ error: 'Missing required field: notificationId' });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Verify User Role using JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication credentials' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // 1. Rate Limiting Check (Only for production broadcasts, bypass for test sends)
    if (!isTestSend) {
      const { data: rateLimitOk, error: rlError } = await supabase.rpc('check_admin_rate_limit', {
        p_admin_id: user.id
      });
      if (rlError || !rateLimitOk) {
        return res.status(429).json({ error: 'Too Many Requests: Maximum 3 broadcast deployments per minute.' });
      }
    }

    // Fetch Notification Details
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (notifError || !notification) {
      return res.status(404).json({ error: 'Notification details not found' });
    }

    // Check if email delivery is enabled by Feature Flags
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', 'email_broadcasts')
      .single();

    if (!flag || !flag.value) {
      return res.status(400).json({ error: 'Email broadcasts are currently disabled by feature flags.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[Broadcast Dispatcher Error] RESEND_API_KEY is not configured.');
      return res.status(500).json({ error: 'Resend API key missing from server configuration.' });
    }

    // Branded sender identity (configurable for future custom domains)
    const senderIdentity = process.env.RESEND_SENDER_IDENTITY || "DeepFocus Announcements <announcements@resend.dev>";

    // Handle Test Send logic
    if (isTestSend) {
      const emailToUse = testEmail || user.email;
      try {
        const emailHtml = buildEmailHtml({
          title: `[TEST] ${notification.title}`,
          message: notification.message,
          ctaText: notification.cta_text,
          ctaUrl: notification.cta_url,
          imageUrl: notification.image_url,
          email: emailToUse
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderIdentity,
            to: [emailToUse],
            subject: `[TEST SEND] ${notification.title}`,
            html: emailHtml,
            headers: {
              "List-Unsubscribe": `<https://deepfocus.app/unsubscribe?email=${encodeURIComponent(emailToUse)}>`,
              "X-Entity-Ref-ID": `test-${notificationId}`
            }
          }),
        });

        const data = await res.json();
        if (res.ok) {
          return res.status(200).json({ success: true, message: `Test email successfully dispatched to ${emailToUse}` });
        } else {
          return res.status(res.status).json({ error: data.message || 'Resend provider error during test dispatch' });
        }
      } catch (err) {
        return res.status(500).json({ error: `Test send failed: ${err.message}` });
      }
    }

    // Only process if delivery method includes email
    if (notification.delivery_method !== 'email' && notification.delivery_method !== 'both') {
      return res.status(200).json({ success: true, message: 'In-app only notification, skipping email dispatch.' });
    }

    // Resolve segment recipients
    const { data: recipients, error: recError } = await supabase.rpc(
      'get_users_matching_segment',
      { p_segment: notification.target_segment }
    );

    if (recError || !recipients || recipients.length === 0) {
      return res.status(200).json({ success: true, message: 'No recipients matched the target segment.' });
    }

    // Insert deliveries as 'queued' (Ignore duplicates via DB constraint)
    const deliveryInserts = recipients.map(r => ({
      notification_id: notificationId,
      user_id: r.user_id,
      email: r.email,
      delivery_method: 'email',
      status: 'queued'
    }));

    const { error: insertError } = await supabase
      .from('broadcast_deliveries')
      .insert(deliveryInserts, { ignoreDuplicates: true });

    if (insertError) {
      console.warn('[Broadcast Dispatcher] Queue insertions completed with logs:', insertError);
    }

    // Fetch queued deliveries
    const { data: queuedDeliveries } = await supabase
      .from('broadcast_deliveries')
      .select('*')
      .eq('notification_id', notificationId)
      .eq('status', 'queued');

    if (!queuedDeliveries || queuedDeliveries.length === 0) {
      return res.status(200).json({ success: true, message: 'All deliveries are already processed or sent.' });
    }

    let successCount = 0;
    let failedCount = 0;

    // Send emails sequentially or in small parallel batches to prevent rate limits
    for (const delivery of queuedDeliveries) {
      try {
        const emailHtml = buildEmailHtml({
          title: notification.title,
          message: notification.message,
          ctaText: notification.cta_text,
          ctaUrl: notification.cta_url,
          imageUrl: notification.image_url,
          email: delivery.email
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderIdentity,
            to: [delivery.email],
            subject: notification.title,
            html: emailHtml,
            headers: {
              "List-Unsubscribe": `<https://deepfocus.app/unsubscribe?email=${encodeURIComponent(delivery.email)}>`,
              "X-Entity-Ref-ID": notificationId
            }
          }),
        });

        const data = await res.json();

        if (res.ok) {
          await supabase
            .from('broadcast_deliveries')
            .update({ 
              status: 'sent', 
              resend_id: data.id, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', delivery.id);
          successCount++;
        } else {
          await supabase
            .from('broadcast_deliveries')
            .update({ 
              status: 'failed', 
              error_message: data.message || 'Resend provider error', 
              updated_at: new Date().toISOString() 
            })
            .eq('id', delivery.id);
          failedCount++;
        }
      } catch (err) {
        await supabase
          .from('broadcast_deliveries')
          .update({ 
            status: 'failed', 
            error_message: err.message || 'Network error during dispatch', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', delivery.id);
        failedCount++;
      }
    }

    // Log the campaign dispatch in admin audit logs via RPC
    await supabase.rpc('log_admin_action', {
      p_action: 'Email Campaign Sent',
      p_notification_id: notificationId,
      p_metadata: {
        total_attempted: queuedDeliveries.length,
        sent_success: successCount,
        sent_failed: failedCount,
        title: notification.title
      }
    });

    return res.status(200).json({ 
      success: true, 
      attempted: queuedDeliveries.length,
      successCount,
      failedCount 
    });

  } catch (error) {
    console.error('[Broadcast Dispatcher Error] Failed to complete execution:', error);
    return res.status(500).json({ error: 'Internal Server Error: Dispatch crashed' });
  }
}
