const DISMISSED_COOKIE = 'ventus_trial_welcome_dismissed_until';
const DISMISSAL_SECONDS = 14 * 24 * 60 * 60;

export const isTrialWelcomeDismissed = (): boolean => {
    const cookie = document.cookie.split(';').map(item => item.trim())
        .find(item => item.startsWith(`${DISMISSED_COOKIE}=`));
    const until = Number(cookie?.slice(DISMISSED_COOKIE.length + 1));
    return Number.isFinite(until) && until > Date.now();
};

export const rememberTrialWelcomeDismissal = (): void => {
    const until = Date.now() + DISMISSAL_SECONDS * 1000;
    const domain = /(^|\.)ventustravel\.co\.uk$/.test(window.location.hostname)
        ? '; Domain=ventustravel.co.uk; Secure' : '';
    document.cookie = `${DISMISSED_COOKIE}=${until}; Path=/; Max-Age=${DISMISSAL_SECONDS}; SameSite=Lax${domain}`;
};
