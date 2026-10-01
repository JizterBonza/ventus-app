const AUTH_BASE = process.env.REACT_APP_AUTH_API_URL || (process.env.NODE_ENV === 'production' ? 'https://ventus-backend.onrender.com/api/auth' : '/api/auth');
const BASE = AUTH_BASE.replace(/\/auth\/?$/, '/newsletter');

async function request(action: string, body: Record<string, unknown>): Promise<string> {
    const response = await fetch(`${BASE}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Unable to complete your request. Please try again.');
    return data.message;
}
export const subscribeToNewsletter = (email: string, consent: boolean, website = '') => request('subscribe', { email, consent, website });
export const confirmNewsletter = (token: string) => request('confirm', { token });
export const unsubscribeNewsletter = (token: string) => request('unsubscribe', { token });
