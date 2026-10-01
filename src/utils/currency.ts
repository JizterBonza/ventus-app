export const DEFAULT_DISPLAY_CURRENCY = 'GBP';

// Supported by both the supplier's availability and calendar endpoints.
export const DISPLAY_CURRENCIES = [
    { code: 'GBP', name: 'British pound' },
    { code: 'EUR', name: 'Euro' },
    { code: 'USD', name: 'US dollar' },
    { code: 'HKD', name: 'Hong Kong dollar' },
] as const;
export type DisplayCurrency = typeof DISPLAY_CURRENCIES[number]['code'];
const STORAGE_KEY = 'ventus:display-currency:v1';
const CHANGE_EVENT = 'ventus:display-currency-changed';
let sessionCurrency: DisplayCurrency | null = null;

const isDisplayCurrency = (value: unknown): value is DisplayCurrency =>
    DISPLAY_CURRENCIES.some(({ code }) => code === value);

/** Only an explicit selection changes GBP. Never infer currency from location. */
export function getDisplayCurrency(): DisplayCurrency {
    if (sessionCurrency) return sessionCurrency;
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return isDisplayCurrency(saved) ? saved : DEFAULT_DISPLAY_CURRENCY;
    } catch {
        return DEFAULT_DISPLAY_CURRENCY;
    }
}

export function setDisplayCurrency(currency: string): void {
    if (!isDisplayCurrency(currency)) return;
    sessionCurrency = currency;
    try {
        window.localStorage.setItem(STORAGE_KEY, currency);
        sessionCurrency = null;
    } catch {
        // Keep the explicit choice for this session if browser storage is unavailable.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToDisplayCurrency(onChange: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY || event.key === null) {
            sessionCurrency = null;
            onChange();
        }
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener('storage', onStorage);
    };
}
