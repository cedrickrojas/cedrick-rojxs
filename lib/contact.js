const RECIPIENT = 'rojascedrick543@gmail.com';
const EMAIL = /^[^\s<>(),;:\\"\[\]\r\n]+@[^\s<>(),;:\\"\[\]\r\n]+\.[^\s<>(),;:\\"\[\]\r\n]+$/;

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function renderInquiryEmail({ name, email, message }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);
  const replySubject = encodeURIComponent('Re: New portfolio inquiry - Cedrick Rojas');

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0a0c0a;color:#f3f0e7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0c0a;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#111510;border:1px solid #2a3028;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:26px 30px 24px;background:#171c16;border-bottom:1px solid #343a2e;">
            <p style="margin:0 0 12px;color:#ebb13e;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Cedrick Rojas · Portfolio</p>
            <h1 style="margin:0;color:#f3f0e7;font-size:25px;line-height:1.25;">New portfolio inquiry</h1>
            <p style="margin:9px 0 0;color:#a5aea2;font-size:14px;line-height:1.6;">Someone reached out through your contact form.</p>
          </td></tr>
          <tr><td style="padding:26px 30px 30px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:22px;">
              <tr><td style="padding:0 0 14px;color:#879184;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">From</td></tr>
              <tr><td style="padding:0 0 12px;color:#f3f0e7;font-size:16px;font-weight:bold;">${safeName}</td></tr>
              <tr><td style="color:#ebb13e;font-size:14px;"><a href="mailto:${safeEmail}" style="color:#ebb13e;text-decoration:none;">${safeEmail}</a></td></tr>
            </table>
            <p style="margin:0 0 10px;color:#879184;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">Message</p>
            <div style="padding:18px;background:#0b0e0b;border:1px solid #2a3028;border-radius:10px;color:#e2e5dc;font-size:15px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;">${safeMessage}</div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
              <tr><td style="background:#ebb13e;border-radius:8px;">
                <a href="mailto:${safeEmail}?subject=${replySubject}" style="display:inline-block;padding:12px 20px;color:#0a0c0a;font-size:14px;font-weight:bold;text-decoration:none;">Reply to ${safeName}</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:16px 30px;border-top:1px solid #2a3028;color:#768071;font-size:12px;line-height:1.5;">Sent from the contact form at cedrick-rojxs.vercel.app</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function createContactHandler({ createTransport, env }) {
  return async function contact(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return response.status(405).json({ success: false, message: 'Use POST to send a message.' });
    }

    let body;
    try {
      body = request.body;
    } catch {
      return response.status(400).json({ success: false, message: 'Invalid request.' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.isBuffer(body)) {
      return response.status(400).json({ success: false, message: 'Invalid request.' });
    }
    // Hidden field catches simple bots without sending email or displaying a CAPTCHA.
    if (body.website) {
      return response.status(200).json({ success: true });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!name || name.length > 100 || /[\r\n\x00]/.test(name) ||
        !EMAIL.test(email) || email.length > 254 ||
        !message || message.length > 5000 || message.includes('\x00')) {
      return response.status(400).json({ success: false, message: 'Please check your name, email, and message.' });
    }

    const user = (env.GMAIL_USER || '').trim();
    const password = (env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
    if (!EMAIL.test(user) || !password || password === 'replace-with-your-google-app-password') {
      return response.status(503).json({ success: false, message: 'Email is temporarily unavailable. Please email me directly.' });
    }

    const transport = createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass: password },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      const result = await transport.sendMail({
        from: { name: 'Cedrick Rojas Portfolio', address: user },
        to: RECIPIENT,
        replyTo: { name, address: email },
        subject: 'New portfolio inquiry - Cedrick Rojas',
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        html: renderInquiryEmail({ name, email, message }),
      });
      const accepted = result.accepted || [];
      if (!accepted.some(address => String(address).toLowerCase() === RECIPIENT)) {
        throw new Error('Recipient not accepted.');
      }
      return response.status(200).json({ success: true });
    } catch {
      // Never expose SMTP errors, credentials, or message contents to the browser/logs.
      return response.status(502).json({ success: false, message: 'Unable to send right now. Please try again later or email me directly.' });
    } finally {
      transport.close();
    }
  };
}

module.exports = { createContactHandler };
