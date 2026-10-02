import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TrialWelcomePopup from './TrialWelcomePopup';
import { subscribeToNewsletter } from '../../utils/newsletter';

const mockAuth = { isLoading: false, isAuthenticated: false, hasActiveMembership: false, user: null as any };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../../utils/newsletter', () => ({ subscribeToNewsletter: jest.fn() }));
beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks(); sessionStorage.clear(); localStorage.clear();
    Object.assign(mockAuth, { isLoading: false, isAuthenticated: false, hasActiveMembership: false, user: null });
});
afterEach(() => { jest.useRealTimers(); });
const open = () => { render(<TrialWelcomePopup />); act(() => jest.advanceTimersByTime(1200)); };

test('homepage offer is accessible, keeps the no-card terms and remembers dismissal across visits', () => {
    const { unmount } = render(<TrialWelcomePopup />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1200));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('The travel membership that pays for itself*');
    expect(screen.getByText('No card required. No automatic charge.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'START YOUR 7 DAY FREE TRIAL' })).toHaveAttribute('href', '/signup');
    const close = screen.getByRole('button', { name: 'Close free trial offer' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' }); expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    unmount(); sessionStorage.clear(); open(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('the offer can return on a new visit once the 30-day dismissal expires', () => {
    const { unmount } = render(<TrialWelcomePopup />);
    act(() => jest.advanceTimersByTime(1200));
    fireEvent.click(screen.getByRole('button', { name: 'Close free trial offer' }));
    unmount(); sessionStorage.clear();
    jest.setSystemTime(Date.now() + 30 * 24 * 60 * 60 * 1000 + 1);
    open(); expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test.each(['loading', 'member', 'trial-used'])('does not show the offer to %s visitors', (state) => {
    if (state === 'loading') mockAuth.isLoading = true;
    if (state === 'member') mockAuth.hasActiveMembership = true;
    if (state === 'trial-used') { mockAuth.isAuthenticated = true; mockAuth.user = { trial: { eligible: false, used: true } }; }
    open(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('eligible signed-in clients go to their membership page', () => {
    mockAuth.isAuthenticated = true; mockAuth.user = { trial: { eligible: true } };
    open(); expect(screen.getByRole('link', { name: 'START YOUR 7 DAY FREE TRIAL' })).toHaveAttribute('href', '/subscription');
});

test('email capture requires separate consent and only shows success after the server accepts it', async () => {
    (subscribeToNewsletter as jest.Mock).mockRejectedValueOnce(new Error('Please try again later.')).mockResolvedValueOnce('Check your inbox to confirm your email.');
    open();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'guest@example.test' } });
    const form = screen.getByRole('button', { name: 'SHOW ME HOW' }).closest('form')!;
    fireEvent.submit(form); expect(subscribeToNewsletter).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => fireEvent.submit(form));
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again later.');
    await act(async () => fireEvent.submit(form));
    expect(subscribeToNewsletter).toHaveBeenLastCalledWith('guest@example.test', true, '');
    expect(screen.getByRole('status')).toHaveTextContent('Check your inbox');
    expect(screen.queryByRole('button', { name: 'SHOW ME HOW' })).not.toBeInTheDocument();
});
