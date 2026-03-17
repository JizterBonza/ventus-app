const SUPPORTED_CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "SGD"] as const;

/** Country/region code → supported currency. Used for both locale and IP-based detection. */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
    PH: "PHP", US: "USD", GB: "GBP", UK: "GBP", JP: "JPY", AU: "AUD", SG: "SGD",
    AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR", FI: "EUR",
    FR: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR", LV: "EUR",
    MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR",
};

function currencyForCountry(countryCode: string): string {
    const code = (countryCode || "").toUpperCase();
    const currency = COUNTRY_TO_CURRENCY[code];
    return currency && SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number]) ? currency : "USD";
}

/** Fallback when IP geolocation is not available (e.g. SSR or request failed). */
function getCurrencyFromLocale(): string {
    try {
        const locale = typeof navigator !== "undefined" ? navigator.language : "";
        const region = (locale.split("-")[1] || "").toUpperCase();
        return currencyForCountry(region);
    } catch {
        return "USD";
    }
}

/**
 * Resolve currency for the visitor based on country (IP geolocation) with locale fallback.
 * Use for "Starting From" and other country-based pricing.
 */
export async function getVisitorCurrency(): Promise<string> {
    try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return getCurrencyFromLocale();
        const data = await res.json();
        const country = data?.country_code;
        if (!country) return getCurrencyFromLocale();
        return currencyForCountry(country);
    } catch {
        return getCurrencyFromLocale();
    }
}
