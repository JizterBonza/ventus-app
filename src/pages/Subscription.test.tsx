import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Subscription from './Subscription';
import { createStripeMembershipCheckout, confirmStripeMembershipCheckout, getMembershipCheckoutConfig, getMembershipQuote } from '../utils/authService';

let mockSearch = '';
jest.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ search: mockSearch }),
}), { virtual: true });
jest.mock('../components/layout/Layout', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../components/shared/BannerCTA', () => () => null);
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, hasActiveMembership: false, isLoading: false }) }));
jest.mock('../utils/authService');

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = '';
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
