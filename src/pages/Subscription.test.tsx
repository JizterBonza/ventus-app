import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Subscription from './Subscription';
import { createStripeMembershipCheckout, confirmStripeMembershipCheckout, getMembershipCheckoutConfig, getMembershipQuote, startMembershipTrial } from '../utils/authService';

let mockSearch = '';
let mockAuth: any;
jest.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ search: mockSearch }),
}), { virtual: true });
jest.mock('../components/layout/Layout', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../components/shared/BannerCTA', () => () => null);
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../utils/authService');

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = '';
  mockAuth = { isAuthenticated: true, hasActiveMembership: false, isLoading: false,
    user: { trial: { eligible: true, used: false, expiresAt: null } }, refreshUser: jest.fn().mockResolvedValue(undefined) };
  (getMembershipCheckoutConfig as jest.Mock).mockResolvedValue({ stripe: { configured: true }, paypal: { configured: false } });
  (getMembershipQuote as jest.Mock).mockResolvedValue({ finalPrice: 299, basePrice: 299, discountPercent: 0 });
});

test('offers Stripe card checkout when PayPal is not configured and permits retry after failure', async () => {
  (createStripeMembershipCheckout as jest.Mock).mockRejectedValue(new Error('Please try again.'));
  render(<Subscription />);
  const pay = await screen.findByRole('button', { name: 'Pay £299.00 securely' });
  expect(screen.queryByText(/Secure payment is being configured/)).not.toBeInTheDocument();
  fireEvent.click(pay);
  await screen.findByText('Please try again.');
  expect(createStripeMembershipCheckout).toHaveBeenCalledWith(undefined);
  expect(screen.getByRole('button', { name: 'Pay £299.00 securely' })).toBeEnabled();
  expect(screen.getByText(/No automatic renewal/)).toBeInTheDocument();
});

test('a failed return verification offers checking again without another payment', async () => {
  mockSearch = '?stripe_session_id=cs_test_example';
  (confirmStripeMembershipCheckout as jest.Mock).mockRejectedValue(new Error('Payment verification unavailable.'));
  render(<Subscription />);
  await screen.findByText('Payment verification unavailable.');
  expect(confirmStripeMembershipCheckout).toHaveBeenCalledWith('cs_test_example');
  expect(screen.getByRole('button', { name: 'Check payment again' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Pay £/ })).not.toBeInTheDocument();
  expect(getMembershipCheckoutConfig).not.toHaveBeenCalled();
});

test('return URL never claims success until the server confirms membership', async () => {
  mockSearch = '?stripe_session_id=cs_test_example';
  (confirmStripeMembershipCheckout as jest.Mock).mockResolvedValue({ active: false, pending: false });
  render(<Subscription />);
  await waitFor(() => expect(screen.getByText(/This payment has not activated/)).toBeInTheDocument());
  expect(screen.queryByText('Your Ventus Travel membership is active.')).not.toBeInTheDocument();
});

test('trial starts only on request and refreshes the account without opening payment', async () => {
  (startMembershipTrial as jest.Mock).mockResolvedValue(undefined);
  render(<Subscription />);
  const start = await screen.findByRole('button', { name: 'Start free trial' });
  expect(startMembershipTrial).not.toHaveBeenCalled();
  fireEvent.click(start);
  await waitFor(() => expect(mockAuth.refreshUser).toHaveBeenCalled());
  expect(startMembershipTrial).toHaveBeenCalledTimes(1);
  expect(createStripeMembershipCheckout).not.toHaveBeenCalled();
});

test('trial failure is shown and can be retried without a payment', async () => {
  (startMembershipTrial as jest.Mock).mockRejectedValue(new Error('Please confirm your email.'));
  render(<Subscription />);
  fireEvent.click(await screen.findByRole('button', { name: 'Start free trial' }));
  await screen.findByRole('alert');
  expect(screen.getByText('Please confirm your email.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start free trial' })).toBeEnabled();
});

test('active trials show their deadline and allow voluntary annual checkout', async () => {
  mockAuth.hasActiveMembership = true;
  mockAuth.user = { membership: { paymentProvider: 'trial' }, trial: { used: true, expiresAt: '2030-10-08T04:00:00Z' } };
  render(<Subscription />);
  expect(screen.getByText('Your free trial is active')).toBeInTheDocument();
  expect(screen.getByText(/8 October 2030/)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Pay £299.00 securely' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Start free trial' })).not.toBeInTheDocument();
});

test('expired trials offer paid access and keep existing bookings accessible', async () => {
  mockAuth.user.trial = { used: true, eligible: false, expiresAt: '2026-09-01T04:00:00Z' };
  render(<Subscription />);
  expect(screen.getByText('Your free trial has ended')).toBeInTheDocument();
  expect(screen.getByText('My Bookings')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start free trial' })).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Pay £299.00 securely' })).toBeEnabled();
});

test('a trial upgrade return still verifies payment despite active trial access', async () => {
  mockAuth.hasActiveMembership = true;
  mockAuth.user.membership = { paymentProvider: 'trial' };
  mockSearch = '?stripe_session_id=cs_test_example';
  (confirmStripeMembershipCheckout as jest.Mock).mockResolvedValue({ active: false, pending: false });
  render(<Subscription />);
  await waitFor(() => expect(confirmStripeMembershipCheckout).toHaveBeenCalledWith('cs_test_example'));
  expect(screen.queryByRole('button', { name: 'Start free trial' })).not.toBeInTheDocument();
});
