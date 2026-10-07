import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserAdmin from './UserAdmin';
import * as api from '../utils/userAdmin';
import { requestHomepageEditorCode, verifyHomepageEditorCode } from '../utils/homepageContent';
let mockParams: { id?: string } = {};
jest.mock('react-router-dom', () => ({ useParams: () => mockParams, Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/layout/Layout', () => ({ __esModule: true, default: ({ children }: any) => <main>{children}</main> }));
jest.mock('../utils/userAdmin', () => ({ ...jest.requireActual('../utils/userAdmin'), fetchAdminUsers: jest.fn(), fetchAdminSubscribers: jest.fn(), fetchClientProfile: jest.fn(), fetchClientBilling: jest.fn(), saveClientProfile: jest.fn(), sendClientPasswordReset: jest.fn(), sendClientVerification: jest.fn(), setClientAccess: jest.fn(), cancelClientRenewal: jest.fn() }));
jest.mock('../utils/homepageContent', () => ({ requestHomepageEditorCode: jest.fn(), verifyHomepageEditorCode: jest.fn() }));
const user: api.AdminUser = { id: '3', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: '', cityOfResidence: 'London', emailVerified: true, suspended: false, status: 'active', createdAt: '2026-10-01', lastLoginAt: '2026-10-08', membershipExpiresAt: '2027-10-01', cancelAtPeriodEnd: false, bookingCount: 1, version: 2, notes: '' };
const profile: api.ClientProfile = { user, memberships: [{ id: '1', plan: 'travel-yearly', status: 'active', amountPaid: 299, currency: 'GBP', provider: 'stripe_subscription', recurring: true, startsAt: '2026-10-01', expiresAt: '2027-10-01', billingStatus: 'active', trialEndsAt: null, cancelAtPeriodEnd: false, renewalAmount: 299 }], bookings: [{ id: '101', hotel_id: '42', hotel_name: 'Example Hotel', city: 'London', address: '', check_in: '2027-12-01', check_out: '2027-12-04', state: 'booked', confirmation_number: 'VT101', total_cost: '1500', currency: 'GBP', is_cancellable: true, cancellation_deadline: '', synced_at: '2026-10-08', rooms: [{ guest_name: 'Sample Client', room_type: 'Suite', adults: 2, cancellation_policy: 'Free cancellation before 30 November', deposit_policy: '', benefits: ['Breakfast'] }] }], bookingRequests: [], history: [], canSuspend: true, canLinkBookings: true };
beforeEach(() => {
  jest.resetAllMocks(); mockParams = {};
  (api.fetchAdminUsers as jest.Mock).mockResolvedValue({ users: [user], total: 1, page: 1, pageSize: 25, summary: { total: 1, active: 1, trial: 0, unverified: 0, suspended: 0 } });
  (api.fetchClientProfile as jest.Mock).mockResolvedValue(profile);
  (api.fetchClientBilling as jest.Mock).mockResolvedValue({ available: true, paymentMethod: { brand: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2030 }, invoices: [{ id: 'in_1', number: 'VT-1', status: 'paid', amountPaid: 299, amountDue: 299, currency: 'GBP', createdAt: '2026-10-01', url: 'https://invoice.example/1' }] });
});
test('denied access never displays client details or account actions', async () => {
  (api.fetchAdminUsers as jest.Mock).mockRejectedValue(new Error('User administrator access required.'));
  render(<UserAdmin />); expect(await screen.findByRole('alert')).toHaveTextContent('User administrator access required');
  expect(screen.queryByText(user.email)).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Send password reset' })).not.toBeInTheDocument();
});
test('searches by name and status and links client profiles', async () => {
  render(<UserAdmin />); const links = await screen.findAllByRole('link', { name: /Sample Client|View Sample Client/ }); expect(links[0]).toHaveAttribute('href', '/admin/users/3');
  fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'Sample' } }); fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } }); fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(api.fetchAdminUsers).toHaveBeenLastCalledWith('Sample', 'active', 1));
  (api.fetchAdminSubscribers as jest.Mock).mockResolvedValue({ subscribers: [{ email: 'lead@example.test', status: 'pending', createdAt: '2026-10-01', confirmedAt: null, unsubscribedAt: null, source: 'main-site' }], total: 1, page: 1, pageSize: 25 });
  fireEvent.click(await screen.findByRole('tab', { name: 'Email subscribers' })); expect(await screen.findByText('lead@example.test')).toBeInTheDocument(); expect(screen.getAllByText('Awaiting confirmation').length).toBeGreaterThan(0);
});
test('staff verification unlocks accounts only after submitting the emailed code', async () => {
  (api.fetchAdminUsers as jest.Mock).mockRejectedValueOnce(new api.AdminVerificationRequired('Confirm staff email'));
  (requestHomepageEditorCode as jest.Mock).mockResolvedValue({}); (verifyHomepageEditorCode as jest.Mock).mockResolvedValue({});
  render(<UserAdmin />); const sendCodeButton = await screen.findByRole('button', { name: 'Send verification code' }); await act(async () => { fireEvent.click(sendCodeButton); }); await waitFor(() => expect(requestHomepageEditorCode).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'ABCDEF123456' } }); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm code' })); });
  await waitFor(() => expect(verifyHomepageEditorCode).toHaveBeenCalledWith('ABCDEF123456')); expect(await screen.findByText(user.email)).toBeInTheDocument();
});
test('profile changes and password resets act on the selected account', async () => {
  mockParams = { id: '3' }; (api.saveClientProfile as jest.Mock).mockResolvedValue({ message: 'Profile saved.' }); (api.sendClientPasswordReset as jest.Mock).mockResolvedValue({ message: 'Reset email sent.' });
  render(<UserAdmin />); fireEvent.change(await screen.findByLabelText('First name'), { target: { value: 'Updated' } }); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save profile' })); });
  await waitFor(() => expect(api.saveClientProfile).toHaveBeenCalledWith('3', expect.objectContaining({ firstName: 'Updated', version: 2 })));
  await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Send password reset' })); }); await waitFor(() => expect(api.sendClientPasswordReset).toHaveBeenCalledWith('3'));
  expect(await screen.findByText('Reset email sent.')).toBeInTheDocument();
});
test('suspending sign-in requires a reason and an explicit confirmation', async () => {
  mockParams = { id: '3' }; (api.setClientAccess as jest.Mock).mockResolvedValue({ message: 'Sign-in suspended.' });
  render(<UserAdmin />); fireEvent.click(await screen.findByRole('button', { name: 'Suspend sign-in' })); expect(api.setClientAccess).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Confirm access change' })).toBeDisabled(); fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Client request' } }); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm access change' })); });
  await waitFor(() => expect(api.setClientAccess).toHaveBeenCalledWith('3', true, 'Client request', 2));
});
test('billing shows masked card and invoices; cancellation requires confirmation; bookings show stay terms', async () => {
  mockParams = { id: '3' }; (api.cancelClientRenewal as jest.Mock).mockResolvedValue({ message: 'Renewal cancelled.' }); render(<UserAdmin />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Billing' })); expect(await screen.findByText(/VISA ending 4242/)).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'View invoice ↗' })).toHaveAttribute('href', 'https://invoice.example/1');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel membership renewal' })); expect(api.cancelClientRenewal).not.toHaveBeenCalled(); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm renewal cancellation' })); }); await waitFor(() => expect(api.cancelClientRenewal).toHaveBeenCalledWith('3'));
  fireEvent.click(await screen.findByRole('tab', { name: 'Bookings' })); expect(screen.getByText('Example Hotel')).toBeInTheDocument(); expect(screen.getByText('VT101')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Link an existing booking' })).toHaveAttribute('href', '/admin/reservations');
});
test('navigating away from a profile never reveals stale client information', async () => {
  mockParams = { id: '3' }; const view = render(<UserAdmin />); await screen.findByLabelText('First name');
  (api.fetchClientProfile as jest.Mock).mockReturnValue(new Promise(() => {})); mockParams = { id: '4' }; view.rerender(<UserAdmin />);
  expect(screen.queryByText(user.email)).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Send password reset' })).not.toBeInTheDocument();
  await act(async () => {});
});
test('CSV cells escape quotes and prevent spreadsheet formulas', () => {
  expect(api.csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"'); expect(api.csvCell('Sample "Client"')).toBe('"Sample ""Client"""'); expect(api.csvCell('  +123')).toBe('"\'  +123"');
});
