const SUPPORTED_CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "SGD"] as const;
const VISITOR_CURRENCY_CACHE_KEY = "ventus:visitor-currency:v1";
const VISITOR_CURRENCY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let visitorCurrencyMemoryCache: { currency: string; expiresAt: number } | null = null;
let visitorCurrencyInflight: Promise<string> | null = null;

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
    if (visitorCurrencyMemoryCache && visitorCurrencyMemoryCache.expiresAt > Date.now()) {
        return visitorCurrencyMemoryCache.currency;
    }

    if (typeof window !== "undefined") {
        try {
            const stored = JSON.parse(window.localStorage.getItem(VISITOR_CURRENCY_CACHE_KEY) || "null");
            if (stored?.currency && stored?.expiresAt > Date.now()) {
                visitorCurrencyMemoryCache = stored;
                return stored.currency;
            }
        } catch {
            // Ignore unavailable or malformed browser storage.
        }
    }

    if (visitorCurrencyInflight) return visitorCurrencyInflight;

    visitorCurrencyInflight = (async () => {
        let currency = getCurrencyFromLocale();
        try {
            const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(1500) });
            if (res.ok) {
                const data = await res.json();
                if (data?.country_code) currency = currencyForCountry(data.country_code);
            }
        } catch {
            // Locale fallback is deliberately immediate when IP lookup is slow/unavailable.
        }

        const entry = { currency, expiresAt: Date.now() + VISITOR_CURRENCY_CACHE_TTL_MS };
        visitorCurrencyMemoryCache = entry;
        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(VISITOR_CURRENCY_CACHE_KEY, JSON.stringify(entry));
            } catch {
                // In-memory caching still avoids duplicate lookups for this session.
            }
        }
        return currency;
    })().finally(() => {
        visitorCurrencyInflight = null;
    });

    return visitorCurrencyInflight;
}
