import { isTrialWelcomeDismissed, rememberTrialWelcomeDismissal } from './trialWelcome';

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-06T00:00:00Z'));
    document.cookie = 'ventus_trial_welcome_dismissed_until=; Max-Age=0; Path=/';
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test.each(['ventustravel.co.uk', 'www.ventustravel.co.uk', 'destinations.ventustravel.co.uk'])
('closing on %s shares a fourteen-day cookie across Ventus sites', hostname => {
    const location = Object.getOwnPropertyDescriptor(window, 'location')!;
    Object.defineProperty(window, 'location', { configurable: true, value: { hostname } });
    const setter = jest.spyOn(document, 'cookie', 'set');
    try {
        rememberTrialWelcomeDismissal();
        expect(setter).toHaveBeenCalledWith(
            `ventus_trial_welcome_dismissed_until=${Date.now() + 1209600000}; Path=/; Max-Age=1209600; SameSite=Lax; Domain=ventustravel.co.uk; Secure`
        );
    } finally { Object.defineProperty(window, 'location', location); }
});

test('invalid and expired preferences cannot hide the offer', () => {
    expect(isTrialWelcomeDismissed()).toBe(false);
    document.cookie = 'ventus_trial_welcome_dismissed_until=invalid; Path=/';
    expect(isTrialWelcomeDismissed()).toBe(false);
    document.cookie = `ventus_trial_welcome_dismissed_until=${Date.now()}; Path=/`;
    expect(isTrialWelcomeDismissed()).toBe(false);
});
