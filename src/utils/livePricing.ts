import { AvailabilityResponse, RateInfo } from "../types/search";

export interface LivePrice {
    rate: number;
    currency: string;
}

const validAmount = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;

const currencyCode = (value: unknown): string | null =>
    typeof value === "string" && /^[A-Z]{3}$/.test(value.trim().toUpperCase())
        ? value.trim().toUpperCase()
        : null;

/** Only nightly rates belong in a "from /night" label. Stay totals must not be used. */
export const getNightlyPrice = (
    value: number | RateInfo | null | undefined,
    defaultCurrency?: string | null,
    requestedCurrency?: string | null,
): LivePrice | null => {
    if (validAmount(value)) {
        const currency = currencyCode(defaultCurrency) ?? currencyCode(requestedCurrency);
        return currency ? { rate: value, currency } : null;
    }
    if (!value || typeof value !== "object") return null;

    const requested = currencyCode(value.requested_currency_code) ?? currencyCode(requestedCurrency);
    if (validAmount(value.rate_in_requested_currency) && requested) {
        return { rate: value.rate_in_requested_currency, currency: requested };
    }
    const base = currencyCode(value.currency_code) ?? currencyCode(defaultCurrency);
    if (validAmount(value.rate) && base) {
        return { rate: value.rate, currency: base };
    }
    return null;
};

/** Booking confirmation needs a supplier-provided stay total, never a nightly rate. */
export const getStayTotal = (
    value: RateInfo | null | undefined,
    defaultCurrency?: string | null,
    requestedCurrency?: string | null,
): LivePrice | null => {
    if (!value) return null;
    const requested = currencyCode(value.requested_currency_code) ?? currencyCode(requestedCurrency);
    if (validAmount(value.total_to_book_in_requested_currency) && requested) {
        return { rate: value.total_to_book_in_requested_currency, currency: requested };
    }
    const base = currencyCode(value.currency_code) ?? currencyCode(defaultCurrency);
    if (validAmount(value.total_to_book) && base) {
        return { rate: value.total_to_book, currency: base };
    }
    return null;
};

export const getLiveNightlyPrice = (
    result: AvailabilityResponse | null | undefined,
    requestedCurrency?: string | null,
): LivePrice | null => {
    if (!result?.is_available) return null;
    const primary = getNightlyPrice(result.lowest_rate, result.default_currency, requestedCurrency);
    if (primary) return primary;

    // Some hotel responses omit lowest_rate while supplying the actual room rates.
    const roomPrices = (Array.isArray(result.room_types) ? result.room_types : []).flatMap((room) => {
        const roomCurrency = room.currency ?? result.default_currency;
        return [
            getNightlyPrice(room.lowest_rate, roomCurrency, requestedCurrency),
            getNightlyPrice(room.rate, roomCurrency, requestedCurrency),
            ...(Array.isArray(room.rates) ? room.rates : []).map((rate) => getNightlyPrice(rate, roomCurrency, requestedCurrency)),
        ].filter((price): price is LivePrice => price !== null);
    });
    const requested = currencyCode(requestedCurrency);
    const preferredCurrency = requested && roomPrices.some((price) => price.currency === requested)
        ? requested
        : roomPrices[0]?.currency;
    const comparablePrices = roomPrices.filter((price) => price.currency === preferredCurrency);
    return comparablePrices.length
        ? comparablePrices.reduce((lowest, price) => price.rate < lowest.rate ? price : lowest)
        : null;
};
