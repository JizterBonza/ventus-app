/** All live hotel searches use GBP, regardless of browser language or location. */
export const DEFAULT_DISPLAY_CURRENCY = "GBP";

/** Shared by search results and calendar rates. Ignore legacy location-based caches. */
export async function getVisitorCurrency(): Promise<string> {
    return DEFAULT_DISPLAY_CURRENCY;
}
