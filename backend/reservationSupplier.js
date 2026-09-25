const crypto = require('crypto');

const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode, publicError: true });
const id = (value) => /^[1-9]\d{0,15}$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? String(value) : null;
const text = (value, length = 4000) => typeof value === 'string' ? value.slice(0, length) : '';
const cancelled = (booking) => ['cancelled', 'canceled'].includes(booking.state);
const confirmed = (booking) => ['booked', 'confirmed'].includes(booking.state) && Boolean(booking.confirmation_number);
const policies = (booking) => [...new Set(booking.rooms.map((room) => room.cancellation_policy).filter(Boolean))];
const canCancel = (booking) => confirmed(booking) && booking.is_cancellable === true &&
  booking.rooms.length > 0 && booking.rooms.every((room) => room.cancellation_policy.trim());
// PostgreSQL JSONB reorders object keys; normalize before comparing a saved review.
const fingerprint = (booking) => crypto.createHash('sha256').update(JSON.stringify(sanitizeBooking(booking))).digest('hex');

// Keep only documented display fields. Supplier responses can also contain private data.
function sanitizeBooking(data) {
  if (!data || !id(data.id)) throw error('The supplier returned an invalid reservation.', 502);
  return {
    id: id(data.id), hotel_id: id(data.hotel_id), hotel_name: text(data.hotel_name, 255),
    city: text(data.city, 255), address: text(data.address),
    check_in: text(data.check_in, 32), check_out: text(data.check_out, 32),
    state: text(data.state, 40).toLowerCase(), confirmation_number: text(data.confirmation_number, 120),
    total_cost: typeof data.total_cost === 'number' ? String(data.total_cost) : text(data.total_cost, 40),
    currency: text(data.currency, 3), is_cancellable: data.is_cancellable === true,
    cancellation_deadline: text(data.cancellation_deadline, 80),
    rooms: (Array.isArray(data.rooms) ? data.rooms : []).slice(0, 20).map((room) => ({
      guest_name: text(room.guest_name, 200), room_type: text(room.room_type, 255),
      adults: Number.isInteger(room.adults) ? room.adults : null,
      cancellation_policy: text(room.cancellation_policy, 12000), deposit_policy: text(room.deposit_policy, 12000),
      benefits: (Array.isArray(room.benefits) ? room.benefits : []).filter((item) => typeof item === 'string').map((item) => item.slice(0, 1000)),
    })),
  };
}

function bookingPayload(body) {
  const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!id(body.hotel_id) || !date(body.start_date) || !date(body.end_date) || body.end_date <= body.start_date ||
    !text(body.session_id, 255).trim() || body.session_id.length > 255 || !text(body.rate_index, 255).trim() || body.rate_index.length > 255 ||
    !text(body.guest_name, 200).trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.guest_email || '') || body.guest_email.length > 254) {
    throw error('Valid stay dates, a selected rate and guest details are required.');
  }
  if (body.credit_card) throw error('Please enter card details through the secure booking form.');
  if (!Array.isArray(body.rooms) || body.rooms.length < 1 || body.rooms.length > 10 || body.rooms.some((room) =>
    !Number.isInteger(room.adults) || room.adults < 1 || room.adults > 20 ||
    (room.children != null && !Array.isArray(room.children)) || (room.children || []).length > 10 ||
    (room.children || []).some((child) => !Number.isInteger(child.age) || child.age < 0 || child.age > 17))) {
    throw error('A valid room and guest configuration is required.');
  }
  return {
    hotel_id: Number(body.hotel_id), start_date: body.start_date, end_date: body.end_date,
    session_id: body.session_id.trim(), rate_index: body.rate_index.trim(),
    guest_name: body.guest_name.trim().slice(0, 200), guest_email: body.guest_email.trim().toLowerCase(),
    ...(body.eta != null && /^([01]?\d|2[0-3])$/.test(String(body.eta)) ? { eta: String(body.eta) } : {}),
    rooms: body.rooms.map((room, index) => ({ adults: room.adults, children: (room.children || []).map((child) => ({ age: child.age })),
      // Ventus sends the guest confirmation through its durable email queue.
      // Enforce this for every room, including requests from older website versions.
      send_email_to_guest: false,
      ...(index === 0 ? { guest_name: body.guest_name.trim().slice(0, 200), guest_email: body.guest_email.trim().toLowerCase() } : {}),
    })),
  };
}

function createSupplier({ baseUrl = process.env.HOTEL_API_BASE || 'https://api-staging.littleemperors.com', token = process.env.HOTEL_API_TOKEN, fetchImpl = fetch } = {}) {
  return async (method, path, body) => {
    if (!token) throw error('Reservation service is not configured.', 503);
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v2/hotels/bookings${path}`, {
      method, signal: AbortSignal.timeout(method === 'GET' ? 15000 : 30000), redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const failure = error(method === 'DELETE' ? 'The supplier could not confirm cancellation. Please refresh the booking or contact Ventus.' :
        'The reservation service could not complete this request. Please try again or contact Ventus.', response.status >= 500 ? 502 : 400);
      failure.definitive = response.status >= 400 && response.status < 500;
      throw failure;
    }
    if (method === 'DELETE' && response.status !== 200) {
      throw error('The supplier has not yet confirmed cancellation.', 503);
    }
    return data;
  };
}

// The generic proxy must never expose the agency-wide booking API to clients.
const isPublicHotelProxyRequest = (method, path) =>
  (method === 'GET' && /^\/v2\/(search|hotel-groups(?:\/\d+)?|hotels(?:\/filters|\/\d+(?:\/calendar)?)?)\/?$/.test(path)) ||
  (method === 'POST' && /^\/v2\/hotels\/availability\/?$/.test(path));

module.exports = { error, id, cancelled, confirmed, policies, canCancel, fingerprint, sanitizeBooking, bookingPayload, createSupplier, isPublicHotelProxyRequest };
