import { getAuthToken } from './authService';
import { Reservation } from './reservationsService';

export interface AdminUser {
  id: string; email: string; firstName: string; lastName: string; phone: string; cityOfResidence: string;
  status: string; emailVerified: boolean; suspended: boolean; createdAt: string; lastLoginAt: string | null;
  membershipExpiresAt: string | null; cancelAtPeriodEnd: boolean; bookingCount: number; version: number; notes?: string;
}
export interface AdminMembership {
  id: string; plan: string; status: string; amountPaid: number; currency: string; provider: string; recurring: boolean;
  startsAt: string; expiresAt: string | null; billingStatus: string | null; trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean; renewalAmount: number | null;
}
export interface UserList { users: AdminUser[]; total: number; page: number; pageSize: number; summary: { total: number; active: number; trial: number; unverified: number; suspended: number } }
export interface Subscriber { email: string; status: string; source: string; createdAt: string; confirmedAt: string | null; unsubscribedAt: string | null }
export interface SubscriberList { subscribers: Subscriber[]; total: number; page: number; pageSize: number }
export interface ClientProfile {
  user: AdminUser; memberships: AdminMembership[]; bookings: Reservation[];
  bookingRequests: Array<{ reference: string; hotelName: string; checkIn: string; checkOut: string; status: string; createdAt: string }>;
  history: Array<{ action: string; createdAt: string; by: string; details: { reason?: string; fields?: string[] } }>;
  canSuspend: boolean; canLinkBookings: boolean;
}
export interface BillingDetails {
  available: boolean; paymentMethod: { brand: string; last4: string; expiryMonth: number; expiryYear: number } | null;
  invoices: Array<{ id: string; number: string | null; status: string; amountPaid: number; amountDue: number; currency: string; createdAt: string; url: string | null }>;
}
export class AdminVerificationRequired extends Error {}
const base = process.env.REACT_APP_AUTH_API_URL ? process.env.REACT_APP_AUTH_API_URL.replace(/\/auth\/?$/, '/admin')
  : process.env.NODE_ENV === 'production' ? 'https://ventus-backend.onrender.com/api/admin' : '/api/admin';
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = getAuthToken();
  if (!token) throw new Error('Please sign in to open the admin area.');
  const response = await fetch(base + path, { method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (data.code === 'ADMIN_VERIFICATION_REQUIRED') throw new AdminVerificationRequired(data.error);
  if (!response.ok) throw new Error(data.error || 'Unable to load client accounts. Please try again.');
  return data;
}
const query = (q: string, status: string, page: number) => `?${new URLSearchParams({ q, status, page: String(page) })}`;
const path = (id: string) => `/users/${encodeURIComponent(id)}`;
export const fetchAdminUsers = (q: string, status: string, page: number) => request<UserList>('/users' + query(q, status, page));
export const fetchAdminSubscribers = (q: string, status: string, page: number) => request<SubscriberList>('/newsletter' + query(q, status, page));
export const fetchClientProfile = (id: string) => request<ClientProfile>(path(id));
export const fetchClientBilling = (id: string) => request<BillingDetails>(path(id) + '/billing');
export const saveClientProfile = (id: string, fields: Pick<AdminUser, 'firstName' | 'lastName' | 'phone' | 'cityOfResidence' | 'notes' | 'version'>) => request<{ message: string }>(path(id), 'PUT', fields);
export const setClientAccess = (id: string, suspended: boolean, reason: string, version: number) => request<{ message: string }>(path(id) + '/access', 'POST', { suspended, reason, version });
export const sendClientPasswordReset = (id: string) => request<{ message: string }>(path(id) + '/password-reset', 'POST', {});
export const sendClientVerification = (id: string) => request<{ message: string }>(path(id) + '/verification-email', 'POST', {});
export const cancelClientRenewal = (id: string) => request<{ message: string }>(path(id) + '/cancel-renewal', 'POST', { acknowledged: true });
export const statusLabel = (value: string) => ({ registered: 'Registered', unverified: 'Email unconfirmed', trial: 'Free trial', active: 'Active member', past_due: 'Payment overdue', expired: 'Membership expired', cancelled: 'Membership cancelled', suspended: 'Sign-in suspended', subscribed: 'Confirmed subscriber', pending: 'Awaiting confirmation', unsubscribed: 'Unsubscribed' }[value] || value.replace(/_/g, ' '));
export const csvCell = (value: unknown) => {
  let text = String(value ?? '');
  if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
