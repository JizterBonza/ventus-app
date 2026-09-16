import { AvailabilityResponse } from "../types/search";
import { getLiveNightlyPrice, getNightlyPrice, getStayTotal } from "./livePricing";

const availability = (overrides: Partial<AvailabilityResponse> = {}): AvailabilityResponse => ({
    hotel_id: 1,
    hotel_name: "Test hotel",
    is_available: true,
    session_id: null,
    default_currency: "GBP",
    opened_at: "",
    is_under_refurbishment: false,
    refurbishment_ends_at: null,
    is_temporarily_closed: false,
    closed_from: "",
    closed_until: "",
    display_order: null,
    hotel_info: null,
    room_types: [],
    lowest_rate: null,
    links: { self: { href: "", method: "GET" }, booking: { href: "", method: "POST" }, hotel: { href: "", method: "GET" } },
    ...overrides,
});

test("uses the currency paired with the requested rate", () => {
    expect(getLiveNightlyPrice(availability({
        lowest_rate: { rate: 400, currency_code: "GBP", rate_in_requested_currency: 800, requested_currency_code: "AUD" },
    }))).toEqual({ rate: 800, currency: "AUD" });
});

test("never displays totals, zero rates, or unavailable inventory as nightly prices", () => {
    expect(getNightlyPrice({ total_to_book: 1200, currency_code: "GBP" })).toBeNull();
    expect(getNightlyPrice(0, "GBP")).toBeNull();
    expect(getNightlyPrice(Number.NaN, "GBP")).toBeNull();
    expect(getLiveNightlyPrice(availability({ is_available: false, lowest_rate: 500 }))).toBeNull();
});

test("finds a room rate when the summary rate is absent", () => {
    expect(getLiveNightlyPrice(availability({
        room_types: [{ currency: "GBP", rates: [{ rate_index: "1", rate: 320 }] }],
    }))).toEqual({ rate: 320, currency: "GBP" });
});

test("does not invent a currency", () => {
    expect(getNightlyPrice({ rate: 500 })).toBeNull();
});

test("does not present a nightly rate as a booking total", () => {
    expect(getStayTotal({ rate: 500, currency_code: "GBP" })).toBeNull();
    expect(getStayTotal({ total_to_book: 1500, currency_code: "GBP" })).toEqual({ rate: 1500, currency: "GBP" });
});
