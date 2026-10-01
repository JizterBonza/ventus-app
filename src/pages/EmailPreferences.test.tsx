import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EmailPreferences from './EmailPreferences';
import { confirmNewsletter, unsubscribeNewsletter } from '../utils/newsletter';
let mockHash = '';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ hash: mockHash }), Link: ({ to, children }: any) => <a href={to}>{children}</a> }), { virtual: true });
jest.mock('../components/layout/Layout', () => ({ children }: any) => <div>{children}</div>);
jest.mock('../utils/newsletter', () => ({ confirmNewsletter: jest.fn(), unsubscribeNewsletter: jest.fn() }));
beforeEach(() => jest.resetAllMocks());
test('confirmation requires a click and explains that trial signup is separate', async () => {
    mockHash = '#action=confirm&token=' + 'a'.repeat(64);
    (confirmNewsletter as jest.Mock).mockResolvedValue('Your email is confirmed.');
    render(<EmailPreferences />);
    expect(confirmNewsletter).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm my emails' }));
    await screen.findByText('Your email is confirmed.');
    expect(screen.getByRole('link', { name: 'Start your 7 day free trial' })).toHaveAttribute('href', '/signup');
});
test('unsubscribe link works without login or another click and can safely retry a failure', async () => {
    const token = 'a'.repeat(36) + '.' + 'b'.repeat(64);
    mockHash = '#action=unsubscribe&token=' + token;
    (unsubscribeNewsletter as jest.Mock).mockRejectedValueOnce(new Error('Temporary error')).mockResolvedValueOnce('You are unsubscribed.');
    render(<EmailPreferences />);
    await screen.findByText('Temporary error');
    expect(unsubscribeNewsletter).toHaveBeenCalledWith(token);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('You are unsubscribed.'));
});
