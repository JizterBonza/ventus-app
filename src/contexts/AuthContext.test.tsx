import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { getCurrentUser } from '../utils/authService';

jest.mock('../utils/authService');
const Status = () => <p>{useAuth().hasActiveMembership ? 'Member access' : 'No member access'}</p>;

afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

test('member access expires in an open tab even if refreshing the account fails', async () => {
  jest.useFakeTimers();
  (getCurrentUser as jest.Mock).mockResolvedValueOnce({ id: '1', membershipActive: true,
    membership: { paymentProvider: 'trial', expiresAt: new Date(Date.now() + 5000).toISOString() } }).mockResolvedValue(null);
  render(<AuthProvider><Status /></AuthProvider>);
  await waitFor(() => expect(screen.getByText('Member access')).toBeInTheDocument());
  await act(async () => { jest.advanceTimersByTime(5001); });
  expect(screen.getByText('No member access')).toBeInTheDocument();
});

test('an already expired membership never grants client access', async () => {
  (getCurrentUser as jest.Mock).mockResolvedValue({ id: '1', membershipActive: true,
    membership: { paymentProvider: 'trial', expiresAt: '2020-01-01T00:00:00Z' } });
  render(<AuthProvider><Status /></AuthProvider>);
  await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
  expect(screen.queryByText('Member access')).not.toBeInTheDocument();
});
