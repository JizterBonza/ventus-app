import { useSyncExternalStore } from 'react';
import { DEFAULT_DISPLAY_CURRENCY, getDisplayCurrency, subscribeToDisplayCurrency } from '../utils/currency';

/** Keep header controls, searches and rooms in sync, including other browser tabs. */
export function useDisplayCurrency() {
    return useSyncExternalStore(subscribeToDisplayCurrency, getDisplayCurrency, () => DEFAULT_DISPLAY_CURRENCY);
}
