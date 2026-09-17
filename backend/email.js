const { isMailgunConfigured, sendMailgunEmail } = require('./mailgun');

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getPasswordResetEmailProvider = () => {
  if (isMailgunConfigured() && (process.env.PASSWORD_RESET_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL)) {
    return 'mailgun';
  }

  if (process.env.RESEND_API_KEY && process.env.PASSWORD_RESET_FROM_EMAIL) {
    return 'resend';
  }

  if (
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_PUBLIC_KEY
  ) {
    return 'emailjs';
  }

  return null;
};

const sendPasswordResetEmailViaHttp = async ({ to, firstName, resetUrl }, provider) => {
  const from = process.env.PASSWORD_RESET_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL;

  const safeName = escapeHtml(firstName || 'there');
  const safeResetUrl = escapeHtml(resetUrl);
  const payload = {
    from,
    to: [to],
    ...(process.env.PASSWORD_RESET_REPLY_TO && {
      reply_to: process.env.PASSWORD_RESET_REPLY_TO
    }),
    subject: 'Reset your Ventus Travel password',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'We received a request to reset your Ventus Travel password.',
      `Reset your password: ${resetUrl}`,
      '',
      'This link expires in one hour and can only be used once.',
      'If you did not request this, you can safely ignore this email.'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;color:#1f1f1f;line-height:1.6;max-width:600px;margin:0 auto">
        <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400">Reset your password</h1>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your Ventus Travel password.</p>
        <p style="margin:28px 0">
          <a href="${safeResetUrl}" style="display:inline-block;background:#1f1f1f;color:#fff;text-decoration:none;padding:13px 22px">Reset password</a>
        </p>
        <p>This link expires in one hour and can only be used once.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  };

  if (provider === 'mailgun') return sendMailgunEmail(payload);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const providerMessage = await response.text();
    throw new Error(`Password reset email provider returned ${response.status}: ${providerMessage.slice(0, 300)}`);
  }
};

const sendPasswordResetEmailViaEmailJS = async ({ to, firstName, resetUrl }) => {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: to,
        from_name: 'Ventus Travel',
        from_email: process.env.PASSWORD_RESET_REPLY_TO || 'daniella@ventustravel.co.uk',
        booking_id: 'PASSWORD-RESET',
        hotel_name: 'Ventus Travel password reset',
        guest_name: firstName || 'Ventus member',
        guest_email: to,
        guest_phone: 'Not applicable',
        check_in_date: 'Link expires in one hour',
        check_out_date: 'Single use only',
        number_of_guests: 'Not applicable',
        number_of_rooms: 'Not applicable',
        room_type: 'Account security',
        special_requests: `Reset your password using this secure link: ${resetUrl}`,
        total_price: 'Not applicable',
        submitted_at: new Date().toISOString(),
        reset_url: resetUrl,
        message: `Reset your Ventus Travel password: ${resetUrl}. This link expires in one hour and can only be used once.`
      }
    })
  });

  if (!response.ok) {
    const providerMessage = await response.text();
    throw new Error(`Password reset email provider returned ${response.status}: ${providerMessage.slice(0, 300)}`);
  }
};

const sendPasswordResetEmail = async (details) => {
  const provider = getPasswordResetEmailProvider();

  if (provider === 'mailgun' || provider === 'resend') {
    return sendPasswordResetEmailViaHttp(details, provider);
  }

  if (provider === 'emailjs') {
    return sendPasswordResetEmailViaEmailJS(details);
  }

  throw new Error('Password reset email delivery is not configured');
};

const sendHomepageEditorCode = async ({ to, code }) => {
  const from = process.env.MAILGUN_FROM_EMAIL || process.env.PASSWORD_RESET_FROM_EMAIL;
  const text = [
    'Your Ventus homepage editor verification code is:',
    '',
    code,
    '',
    'Enter this code on the homepage editor page. It expires in 20 minutes and can only be used once.',
    'If you did not request this, you can safely ignore this email.'
  ].join('\n');
  if (isMailgunConfigured() && from) {
    return sendMailgunEmail({ from, to: [to], subject: 'Verify your Ventus homepage editor access', text });
  }
  if (process.env.RESEND_API_KEY && from) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: 'Verify your Ventus homepage editor access', text })
    });
    if (!response.ok) throw new Error(`Homepage editor email delivery failed (HTTP ${response.status})`);
    return;
  }
  throw new Error('Homepage editor email delivery is not configured');
};

const sendBookingRequestNotification = async (booking) => {
  const notificationEmail = process.env.BOOKING_NOTIFICATION_EMAIL || 'daniella@ventustravel.co.uk';
  const summary = [
    `Booking request ${booking.reference}`,
    `Hotel: ${booking.hotelName} (${booking.hotelId})`,
    `Stay: ${booking.startDate} to ${booking.endDate}`,
    `Guest: ${booking.guestName}`,
    `Email: ${booking.guestEmail}`,
    `Phone: ${booking.guestPhone}`,
    `Room: ${booking.roomType || 'Selected room'}`,
    `Rooms: ${JSON.stringify(booking.rooms)}`,
    `Quote shown: ${booking.quotedAmount === null ? 'Not available' : `${booking.quotedCurrency} ${booking.quotedAmount}`}`,
    `Special requests: ${booking.specialRequests || 'None'}`,
  ].join('\n');

  const from = process.env.BOOKING_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL || process.env.PASSWORD_RESET_FROM_EMAIL;
  const useMailgun = isMailgunConfigured() && Boolean(from);
  if (useMailgun || (process.env.RESEND_API_KEY && from)) {
    const postEmail = async (payload) => {
      if (useMailgun) return sendMailgunEmail(payload);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const providerMessage = await response.text();
        throw new Error(`Booking email provider returned ${response.status}: ${providerMessage.slice(0, 300)}`);
      }
    };

    await Promise.all([
      postEmail({
        from,
        to: [notificationEmail],
        reply_to: booking.guestEmail,
        subject: `New Ventus booking request ${booking.reference}`,
        text: summary
      }),
      postEmail({
        from,
        to: [booking.guestEmail],
        ...(process.env.PASSWORD_RESET_REPLY_TO && { reply_to: process.env.PASSWORD_RESET_REPLY_TO }),
        subject: `We received your Ventus booking request ${booking.reference}`,
        text: `Hello ${booking.guestName},\n\nWe have received your request for ${booking.hotelName}, ${booking.startDate} to ${booking.endDate}. No payment has been taken. The Ventus team will confirm availability, benefits and the final total before booking.\n\nReference: ${booking.reference}\n\nVentus Travel`
      })
    ]);
    return true;
  }

  if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY) {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: notificationEmail,
          from_name: booking.guestName,
          from_email: booking.guestEmail,
          booking_id: booking.reference,
          hotel_name: booking.hotelName,
          guest_name: booking.guestName,
          guest_email: booking.guestEmail,
          guest_phone: booking.guestPhone,
          check_in_date: booking.startDate,
          check_out_date: booking.endDate,
          number_of_guests: booking.rooms.reduce((sum, room) => sum + Number(room.adults || 0) + (room.children?.length || 0), 0),
          number_of_rooms: booking.rooms.length,
          room_type: booking.roomType || 'Selected room',
          special_requests: booking.specialRequests || 'None',
          total_price: booking.quotedAmount === null ? 'To be confirmed' : `${booking.quotedCurrency} ${booking.quotedAmount}`,
          submitted_at: new Date().toISOString(),
          message: summary
        }
      })
    });
    if (!response.ok) {
      const providerMessage = await response.text();
      throw new Error(`Booking email provider returned ${response.status}: ${providerMessage.slice(0, 300)}`);
    }
    return true;
  }

  return false;
};

module.exports = { getPasswordResetEmailProvider, sendPasswordResetEmail, sendHomepageEditorCode, sendBookingRequestNotification };
