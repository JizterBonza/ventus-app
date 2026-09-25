const { isMailgunConfigured, sendMailgunEmail } = require('./mailgun');

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const brandedEmail = ({ eyebrow, title, greeting, body, actionLabel, actionUrl, code, footnote }) => `
  <div style="margin:0;padding:36px 16px;background:#e8eee5;font-family:Arial,sans-serif;color:#242424">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d7ddcf">
      <div style="padding:28px 36px;border-bottom:1px solid #e3e5df;letter-spacing:0.18em;font-family:Georgia,serif;font-size:19px">VENTUS <span style="font-size:12px;letter-spacing:0.22em">TRAVEL</span></div>
      <div style="padding:38px 36px 30px">
        <p style="margin:0 0 12px;color:#927b55;font-size:11px;letter-spacing:0.2em;text-transform:uppercase">${eyebrow}</p>
        <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-weight:400;font-size:30px;line-height:1.25">${title}</h1>
        <p style="margin:0 0 16px;line-height:1.65">${greeting}</p>
        <p style="margin:0 0 28px;line-height:1.65">${body}</p>
        ${actionLabel && actionUrl ? `<a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 24px;background:#242424;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase">${actionLabel}</a>` : ''}
        ${code ? `<p style="display:inline-block;margin:0;padding:14px 20px;background:#e8eee5;font-size:22px;letter-spacing:0.14em">${escapeHtml(code)}</p>` : ''}
        <p style="margin:30px 0 0;color:#626862;font-size:13px;line-height:1.6">${footnote}</p>
      </div>
      <div style="padding:20px 36px;border-top:1px solid #e3e5df;color:#626862;font-size:12px">Ventus Travel · Thoughtful journeys, exceptionally considered.</div>
    </div>
  </div>`;

const getAccountEmailProvider = () => {
  if (isMailgunConfigured() && (process.env.PASSWORD_RESET_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL)) return 'mailgun';
  if (process.env.RESEND_API_KEY && (process.env.PASSWORD_RESET_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL)) return 'resend';
  return null;
};

const sendAccountEmail = async (payload, provider) => {
  if (provider === 'mailgun') return sendMailgunEmail(payload);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Account email delivery failed (HTTP ${response.status})`);
};

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
  const payload = {
    from,
    to: [to],
    ...(process.env.PASSWORD_RESET_REPLY_TO && {
      reply_to: process.env.PASSWORD_RESET_REPLY_TO
    }),
    subject: 'A fresh start for your Ventus account',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'A request was made to choose a new password for your Ventus account.',
      `Reset your password: ${resetUrl}`,
      '',
      'This link expires in one hour and can only be used once.',
      'If you did not request this, you can safely ignore this email.'
    ].join('\n'),
    html: brandedEmail({
      eyebrow: 'Your account', title: 'A fresh start', greeting: `Hello ${safeName},`,
      body: 'A request was made to choose a new password for your Ventus account. Use the secure link below to continue.',
      actionLabel: 'Reset password', actionUrl: resetUrl,
      footnote: 'This link is valid for one hour and can be used once. If you did not request this, simply ignore this email.'
    })
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
    throw new Error(`Password reset email delivery failed (HTTP ${response.status})`);
  }
};

const sendVerificationEmail = async ({ to, firstName, verifyUrl }) => {
  const provider = getAccountEmailProvider();
  if (!provider) throw new Error('Account email delivery is not configured');
  return sendAccountEmail({
    from: process.env.PASSWORD_RESET_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL,
    to: [to],
    ...(process.env.PASSWORD_RESET_REPLY_TO && { reply_to: process.env.PASSWORD_RESET_REPLY_TO }),
    subject: 'Confirm your email · Ventus Travel',
    text: [
      `Hello ${firstName || 'there'},`, '',
      'Welcome to Ventus Travel. Please confirm your email address to continue your membership.',
      `Confirm your email: ${verifyUrl}`, '',
      'This link is valid for 24 hours and can be used once.',
      'If you did not create an account, you can safely ignore this email.', '', 'Ventus Travel'
    ].join('\n'),
    html: brandedEmail({
      eyebrow: 'Welcome to Ventus', title: 'Your journey begins here',
      greeting: `Hello ${escapeHtml(firstName || 'there')},`,
      body: 'Please confirm your email address to continue your Ventus membership.',
      actionLabel: 'Confirm email', actionUrl: verifyUrl,
      footnote: 'This link is valid for 24 hours and can be used once. If you did not create an account, simply ignore this email.'
    })
  }, provider);
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
  const html = brandedEmail({
    eyebrow: 'Homepage editor', title: 'Confirm it’s you', greeting: 'Hello,',
    body: 'Use this one-time code to access the Ventus homepage editor.', code,
    footnote: 'The code is valid for 20 minutes and can be used once. If you did not request access, simply ignore this email.'
  });
  if (isMailgunConfigured() && from) {
    return sendMailgunEmail({ from, to: [to], subject: 'Verify your Ventus homepage editor access', text, html });
  }
  if (process.env.RESEND_API_KEY && from) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: 'Verify your Ventus homepage editor access', text, html })
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

const sendReservationEmail = async ({ recipient, kind, booking }) => {
  const from = process.env.BOOKING_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL || process.env.PASSWORD_RESET_FROM_EMAIL;
  const provider = isMailgunConfigured() && from ? 'mailgun' : process.env.RESEND_API_KEY && from ? 'resend' : null;
  if (!provider) throw new Error('Reservation email delivery is not configured');
  const isCancelled = kind === 'cancelled';
  const title = isCancelled ? 'Your booking is cancelled' : 'Your stay is confirmed';
  const manageUrl = `${(process.env.PUBLIC_APP_URL || 'https://destinations.ventustravel.co.uk').replace(/\/$/, '')}/my-bookings`;
  const details = [
    `Hotel: ${booking.hotel_name}`,
    `Stay: ${booking.check_in} to ${booking.check_out}`,
    `Confirmation: ${booking.confirmation_number || booking.id}`,
    ...(!isCancelled && booking.total_cost ? [`Booking total: ${booking.currency} ${booking.total_cost}`] : []),
    ...booking.rooms.map((room) => `Room: ${room.room_type}\nGuest: ${room.guest_name}\nCancellation policy: ${room.cancellation_policy || 'Contact Ventus for details.'}${room.deposit_policy ? `\nPayment terms: ${room.deposit_policy}` : ''}`),
  ];
  const note = isCancelled
    ? 'The supplier has confirmed cancellation. Any charges or refunds remain subject to the reservation terms.'
    : 'Hotel payment and cancellation terms apply. You can view and manage this booking in the Ventus account used to make it.';
  await sendAccountEmail({
    from, to: [recipient], reply_to: process.env.BOOKING_NOTIFICATION_EMAIL || 'daniella@ventustravel.co.uk',
    subject: `${isCancelled ? 'Booking cancelled' : 'Booking confirmed'} · Ventus Travel · ${booking.confirmation_number || booking.id}`,
    text: `${title}\n\n${details.join('\n\n')}\n\n${note}\n\nManage your booking: ${manageUrl}\n\nVentus Travel`,
    html: brandedEmail({ eyebrow: 'Your reservation', title,
      greeting: `Hello ${escapeHtml(booking.rooms[0]?.guest_name || 'there')},`,
      body: details.map((line) => escapeHtml(line).replace(/\n/g, '<br>')).join('<br><br>'),
      actionLabel: 'Manage your booking', actionUrl: manageUrl, footnote: escapeHtml(note),
    }),
  }, provider);
};

module.exports = { getPasswordResetEmailProvider, getAccountEmailProvider, sendPasswordResetEmail, sendVerificationEmail, sendHomepageEditorCode, sendBookingRequestNotification, sendReservationEmail };
