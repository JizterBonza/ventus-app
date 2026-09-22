import { getAuthToken } from './authService';

export interface Reservation {
  id: string;
  hotel_id: string | null;
  hotel_name: string;
  city: string;
  address: string;
  check_in: string;
  check_out: string;
  state: string;
  confirmation_number: string;
  total_cost: string;
  currency: string;
  is_cancellable: boolean;
  cancellation_deadline: string;
  cancellation_state?: string | null;
  stale?: boolean;
  can_cancel?: boolean;
  rooms: Array<{ guest_name: string; room_type: string; adults: number | null; cancellation_policy: string; deposit_policy: string; benefits: string[] }>;
}

const base = process.env.REACT_APP_AUTH_API_URL
  ? process.env.REACT_APP_AUTH_API_URL.replace(/\/auth\/?$/, '/reservations')
  : process.env.NODE_ENV === 'development' ? '/api/reservations' : 'https://ventus-backend.onrender.com/api/reservations';

async function request<T>(path = '', body?: unknown): Promise<T> {
  const token = getAuthToken();
  if (!token) throw new Error('Please sign in to manage your bookings.');
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to load your reservations. Please try again.');
  return data as T;
}

export const getReservations = () => request<{ bookings: Reservation[] }>();
export const getCancellationPreview = (id: string) => request<{ reviewId: string; booking: Reservation }>(`/${encodeURIComponent(id)}/cancellation-preview`, {});
export const cancelReservation = (id: string, reviewId: string) => request<{ booking: Reservation }>(`/${encodeURIComponent(id)}/cancel`, { reviewId, acknowledged: true });
export const getUnlinkedReservations = () => request<{ bookings: Reservation[] }>('/admin/unlinked');
export const linkReservation = (bookingId: string, email: string) => request('/admin/link', { bookingId, email, ownershipVerified: true });
export const reservationGroup = (booking: Reservation, today = new Date().toLocaleDateString('en-CA')) => {
  if (['cancelled', 'canceled'].includes(booking.state)) return 'cancelled';
  return booking.check_out && booking.check_out < today ? 'past' : 'upcoming';
};
