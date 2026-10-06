import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TrialWelcomePopup from './TrialWelcomePopup';
import { subscribeToNewsletter } from '../../utils/newsletter';

const mockAuth = { isLoading: false, isAuthenticated: false, hasActiveMembership: false, user: null as any };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../../utils/newsletter', () => ({ subscribeToNewsletter: jest.fn() }));
beforeEach(() => {
    jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-06T00:00:00Z')); jest.clearAllMocks(); sessionStorage.clear(); localStorage.clear(); document.cookie="ventus_account_known=; Max-Age=0; Path=/";
    document.cookie="ventus_trial_welcome_dismissed_until=; Max-Age=0; Path=/";
    Object.assign(mockAuth, { isLoading: false, isAuthenticated: false, hasActiveMembership: false, user: null });
});
afterEach(() => { jest.useRealTimers(); });
const open = () => { render(<TrialWelcomePopup />); act(() => jest.advanceTimersByTime(700)); };

test('guest offer is accessible and closing hides it for fourteen days', () => {
    const { unmount } = render(<TrialWelcomePopup />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(700));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Make sure it’s worth the stay.');
    expect(screen.getByText(/Card required. £0 today/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CHECK IN & EXPLORE' })).toHaveAttribute('href', '/signup');
    const close = screen.getByRole('button', { name: 'Close free trial offer' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' }); expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    unmount();
    expect(document.cookie).toContain(`ventus_trial_welcome_dismissed_until=${Date.parse('2026-10-20T00:00:00Z') + 700}`);
    const hidden = render(<TrialWelcomePopup />);
    act(() => jest.advanceTimersByTime(700));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    hidden.unmount();
    jest.setSystemTime(new Date('2026-10-19T23:59:00Z'));
    const stillHidden = render(<TrialWelcomePopup />);
    act(() => jest.advanceTimersByTime(700));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    stillHidden.unmount();
    jest.setSystemTime(new Date('2026-10-20T00:00:01Z'));
    open(); expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('old dismissal cookies do not suppress the updated guest offer', () => {
    localStorage.setItem('ventus:trial-welcome-dismissed-until:v1', String(Date.now()+30*86400000));
    sessionStorage.setItem('ventus:trial-welcome-dismissed:v1', '1');
    open(); expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test.each(['loading', 'member', 'trial-used'])('does not show the offer to %s visitors', (state) => {
    if (state === 'loading') mockAuth.isLoading = true;
    if (state === 'member') { mockAuth.hasActiveMembership = true; mockAuth.isAuthenticated = true; }
    if (state === 'trial-used') { mockAuth.isAuthenticated = true; mockAuth.user = { trial: { eligible: false, used: true } }; }
    open(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('signed-in clients are not shown the popup even before starting a trial', () => {
    mockAuth.isAuthenticated = true; mockAuth.user = { trial: { eligible: true } };
    open(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('known account cookie also hides the offer in the marketing site embed', () => {
    document.cookie = 'ventus_account_known=1; Path=/';
    const onDismiss = jest.fn();
    render(<TrialWelcomePopup embedded onDismiss={onDismiss} />);
    act(() => jest.advanceTimersByTime(700));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalled();
    expect(document.cookie).not.toContain('ventus_trial_welcome_dismissed_until=');
});

test('a shared dismissal closes the embed without extending the two-week expiry', () => {
    const until = Date.now() + 86400000;
    document.cookie = `ventus_trial_welcome_dismissed_until=${until}; Path=/`;
    const onDismiss = jest.fn();
    render(<TrialWelcomePopup embedded onDismiss={onDismiss} />);
    act(() => jest.advanceTimersByTime(700));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalled();
    expect(document.cookie).toContain(`ventus_trial_welcome_dismissed_until=${until}`);
});

test('email capture requires separate consent and only shows success after the server accepts it', async () => {
    (subscribeToNewsletter as jest.Mock).mockRejectedValueOnce(new Error('Please try again later.')).mockResolvedValueOnce('Check your inbox to confirm your email.');
    open();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'guest@example.test' } });
    const form = screen.getByRole('button', { name: 'SHOW ME WHAT’S INSIDE' }).closest('form')!;
    fireEvent.submit(form); expect(subscribeToNewsletter).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => fireEvent.submit(form));
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again later.');
    await act(async () => fireEvent.submit(form));
    expect(subscribeToNewsletter).toHaveBeenLastCalledWith('guest@example.test', true, '');
    expect(screen.getByRole('status')).toHaveTextContent('Check your inbox');
    expect(screen.queryByRole('button', { name: 'SHOW ME WHAT’S INSIDE' })).not.toBeInTheDocument();
});
