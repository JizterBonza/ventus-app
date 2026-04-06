import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AvailabilityParams, AvailabilityResponse, Rate, RateInfo } from "../../types/search";
import { checkHotelAvailability } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import {
    SEARCH_SESSION_COOKIES,
    getCookie,
    parseSearchDate,
    dateToStorageString,
    getDefaultSearchDateStrings,
    getTodayLocalDateString,
    parseSearchRoomSlotsJson,
    searchRoomSlotsToAvailabilityRooms,
    searchRoomSlotsToBookingInitialRooms,
    type SearchRoomSlot,
} from "../../utils/searchSession";

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
    return currency && SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number]) ? currency : "PHP";
}

/** Fallback when IP geolocation is not available (e.g. SSR or request failed). */
function getCurrencyFromLocale(): string {
    try {
        const locale = typeof navigator !== "undefined" ? navigator.language : "";
        const region = (locale.split("-")[1] || "").toUpperCase();
        return currencyForCountry(region);
    } catch {
        return "PHP";
    }
}

interface AvailabilityResultWithFormData extends AvailabilityResponse {
    formData?: {
        start_date: string;
        end_date: string;
        adults: number;
        /** When set (from header search per-room guests), pre-fills the booking form. */
        initialRooms?: Array<{ adults: number; children: Array<{ age: number }> }>;
    };
    selectedRateIndex?: string;
}

interface CheckAvailabilityProps {
    hotelId: number;
    hotelName: string;
    className?: string;
    onAvailabilityResult?: (result: AvailabilityResultWithFormData) => void;
}

const CheckAvailability: React.FC<CheckAvailabilityProps> = ({
    hotelId,
    hotelName,
    className = "",
    onAvailabilityResult,
}) => {
    const { isAuthenticated } = useAuth();
    const [urlSearchParams] = useSearchParams();
    const [formData, setFormData] = useState(() => {
        const dates = getDefaultSearchDateStrings();
        return {
            ...dates,
            currency: getCurrencyFromLocale(),
            adults: 1,
        };
    });

    /** Per-room adults/children from the header search; when set, availability uses full `rooms` array. */
    const [searchRoomSlots, setSearchRoomSlots] = useState<SearchRoomSlot[] | null>(null);

    // Match header search: dates, guests, and optional per-room `roomSlots` from URL / cookies
    useEffect(() => {
        const urlCheckIn = urlSearchParams.get("checkIn");
        const urlCheckOut = urlSearchParams.get("checkOut");
        const urlGuests = urlSearchParams.get("guests");
        const urlRoomSlots = urlSearchParams.get("roomSlots");

        const ci = parseSearchDate(urlCheckIn || getCookie(SEARCH_SESSION_COOKIES.CHECK_IN) || "");
        const co = parseSearchDate(urlCheckOut || getCookie(SEARCH_SESSION_COOKIES.CHECK_OUT) || "");

        const fromUrl = urlRoomSlots ? parseSearchRoomSlotsJson(urlRoomSlots) : null;
        const fromCookie = parseSearchRoomSlotsJson(getCookie(SEARCH_SESSION_COOKIES.ROOM_SLOTS));
        const slots: SearchRoomSlot[] | null =
            fromUrl && fromUrl.length > 0
                ? fromUrl
                : fromCookie && fromCookie.length > 0
                  ? fromCookie
                  : null;

        if (slots && slots.length > 0) {
            setSearchRoomSlots(slots);
        } else {
            setSearchRoomSlots(null);
        }

        setFormData((prev) => {
            const next: typeof prev = {
                ...prev,
                ...(ci ? { start_date: dateToStorageString(ci) } : {}),
                ...(co ? { end_date: dateToStorageString(co) } : {}),
            };
            if (slots && slots.length > 0) {
                next.adults = slots.reduce((s, r) => s + r.adults, 0);
            } else {
                const g = parseInt(urlGuests || getCookie(SEARCH_SESSION_COOKIES.GUESTS) || "1", 10);
                if (!isNaN(g)) next.adults = g;
            }
            return next;
        });
    }, [urlSearchParams]);

    // Set default currency from user's location (IP-based, so VPN/location changes are reflected)
    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch("https://ipapi.co/json/", {
                    signal: controller.signal,
                });
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const country = data?.country_code;
                if (cancelled || !country) return;
                const currency = currencyForCountry(country);
                setFormData((prev) => ({ ...prev, currency }));
            } catch {
                // Keep locale-based default on network/parse error or abort
            }
        })();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, []);

    const [isChecking, setIsChecking] = useState(false);
    const [availabilityResult, setAvailabilityResult] = useState<AvailabilityResponse | null>(null);
    const [selectedRateIndex, setSelectedRateIndex] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const roomImageFallbacks = [
        "/assets/img/rooms/1.jpg",
        "/assets/img/rooms/2.jpg",
        "/assets/img/rooms/3.jpg",
        "/assets/img/rooms/4.jpg",
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "adults") {
            setSearchRoomSlots(null);
        }
        setFormData((prev) => ({
            ...prev,
            [name]: name === "adults" ? parseInt(value) || 0 : value,
        }));
    };

    const validateForm = (): boolean => {
        if (!formData.start_date) {
            setError("Please select check-in date");
            return false;
        }
        if (!formData.end_date) {
            setError("Please select check-out date");
            return false;
        }
        if (formData.start_date >= formData.end_date) {
            setError("Check-out date must be after check-in date");
            return false;
        }
        if (formData.adults < 1) {
            setError("Number of adults must be at least 1");
            return false;
        }
        if (!formData.currency) {
            setError("Please select a currency");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsChecking(true);
        setError(null);
        setAvailabilityResult(null);
        setSelectedRateIndex("");

        try {
            const roomsPayload =
                searchRoomSlots && searchRoomSlots.length > 0
                    ? searchRoomSlotsToAvailabilityRooms(searchRoomSlots)
                    : [{ adults: formData.adults }];

            const params: AvailabilityParams = {
                hotel_id: hotelId,
                start_date: formData.start_date,
                end_date: formData.end_date,
                currency: formData.currency,
                rooms: roomsPayload,
            };

            const results = await checkHotelAvailability(params);
            
            if (results && results.length > 0) {
                const result = results[0];
                setAvailabilityResult(result);
                const defaultRateIndex = getFirstAvailableRateIndex(result);
                setSelectedRateIndex(defaultRateIndex);
                emitAvailabilityResult(result, defaultRateIndex);
            } else {
                setError("No availability data returned");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to check availability";
            setError(errorMessage);
            console.error("Error checking availability:", err);
        } finally {
            setIsChecking(false);
        }
    };

    const getMinDate = () => getTodayLocalDateString();

    const getMinEndDate = () => {
        return formData.start_date || getMinDate();
    };

    const formatRate = (rate: number | RateInfo | undefined, currency: string | undefined, defaultCurrency: string): string | null => {
        if (rate === undefined || rate === null) {
            return null;
        }

        // Handle rate as object
        if (typeof rate === 'object') {
            const rateValue = rate.rate_in_requested_currency ?? rate.rate ?? rate.total_to_book_in_requested_currency ?? rate.total_to_book;
            const currencyCode = rate.currency_code ?? rate.requested_currency_code ?? currency ?? defaultCurrency;
            return rateValue !== undefined ? `${currencyCode} ${rateValue}` : null;
        }

        // Handle rate as number
        return `${currency ?? defaultCurrency} ${rate}`;
    };

    const getRoomTypeImage = (roomType: Record<string, any>, index: number): string => {
        const directKeys = ["image", "image_url", "photo", "photo_url", "thumbnail_url"];
        for (const key of directKeys) {
            const value = roomType[key];
            if (typeof value === "string" && value.trim() !== "") {
                return value;
            }
        }

        const collectionKeys = ["images", "photos", "gallery"];
        for (const key of collectionKeys) {
            const value = roomType[key];
            if (Array.isArray(value) && value.length > 0) {
                const first = value[0];
                if (typeof first === "string" && first.trim() !== "") {
                    return first;
                }
                if (first && typeof first === "object") {
                    const objectUrl = first.url ?? first.image_url ?? first.thumbnail_url ?? first.photo_url;
                    if (typeof objectUrl === "string" && objectUrl.trim() !== "") {
                        return objectUrl;
                    }
                }
            }
        }

        return roomImageFallbacks[index % roomImageFallbacks.length];
    };

    const getRoomTypeFeatures = (roomType: Record<string, any>): string[] => {
        const featureSet = new Set<string>();
        const addFeature = (value: unknown) => {
            if (typeof value === "string" && value.trim() !== "") {
                featureSet.add(value.trim());
            }
        };

        const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
        toArray(roomType.features).forEach(addFeature);
        toArray(roomType.amenities).forEach(addFeature);
        toArray(roomType.additional_benefits).forEach(addFeature);

        if (Array.isArray(roomType.rates)) {
            roomType.rates.forEach((rate: Record<string, any>) => {
                toArray(rate?.additional_benefits).forEach(addFeature);
            });
        }

        return Array.from(featureSet);
    };

    const getRateValueAndCurrency = (
        rate: Rate | Record<string, any>,
        fallbackCurrency: string
    ): { value: number | null; currency: string } => {
        const value =
            rate?.rate_in_requested_currency ??
            rate?.rate ??
            rate?.total_to_book_in_requested_currency ??
            rate?.total_to_book;
        const currency =
            rate?.requested_currency_code ??
            rate?.currency_code ??
            fallbackCurrency;
        return { value: typeof value === "number" ? value : null, currency };
    };

    const normalizeRateIndex = (value: unknown): string | null => {
        if (value === undefined || value === null) return null;
        if (typeof value === "number") return String(value);
        if (typeof value === "string" && value.trim() !== "") return value.trim();
        return null;
    };

    const getFirstAvailableRateIndex = (result: AvailabilityResponse): string => {
        for (const roomType of result.room_types || []) {
            if (Array.isArray(roomType.rates) && roomType.rates.length > 0) {
                for (const rate of roomType.rates) {
                    const normalized = normalizeRateIndex(rate.rate_index);
                    if (normalized) return normalized;
                }
            }
            const legacy = normalizeRateIndex(roomType.rate_index);
            if (legacy) return legacy;
        }
        return "";
    };

    const emitAvailabilityResult = (result: AvailabilityResponse, chosenRateIndex: string) => {
        const initialRooms =
            searchRoomSlots && searchRoomSlots.length > 0
                ? searchRoomSlotsToBookingInitialRooms(searchRoomSlots)
                : undefined;
        const resultWithFormData: AvailabilityResultWithFormData = {
            ...result,
            formData: {
                start_date: formData.start_date,
                end_date: formData.end_date,
                adults: formData.adults,
                ...(initialRooms ? { initialRooms } : {}),
            },
            selectedRateIndex: chosenRateIndex || undefined,
        };
        onAvailabilityResult?.(resultWithFormData);
    };

    const handleSelectRate = (rateIndexValue: string) => {
        if (!availabilityResult || !rateIndexValue) return;
        setSelectedRateIndex(rateIndexValue);
        emitAvailabilityResult(availabilityResult, rateIndexValue);
    };

    return (
        <div className={`global-form ${className}`}>
            <div className="text-center">
                <h2>Check Availability</h2>
                <p className="text-muted mb-0">Hotel: {hotelName}</p>
            </div>
            <form className="form slim" onSubmit={handleSubmit}>
                <div className="d-grid form-row">
                    <div className="form-column">
                        <div className="form-column-inner">
                            <label htmlFor="start_date" className="form-label">
                                Check-in Date *
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                id="start_date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleInputChange}
                                min={getMinDate()}
                                required
                            />
                        </div>
                        <div className="form-column-inner">
                             <label htmlFor="end_date" className="form-label">
                            Check-out Date *
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                id="end_date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleInputChange}
                                min={getMinEndDate()}
                                required
                            />
                        </div>
                    </div>

                </div>
                <div className="d-grid form-row">
                    <div className="form-column">
                       
                    

                    <div className="form-column-inner">
                        <label htmlFor="adults" className="form-label">
                            Number of Adults *
                        </label>
                        <input
                            type="number"
                            className="form-control"
                            id="adults"
                            name="adults"
                            value={formData.adults}
                            onChange={handleInputChange}
                            min="1"
                            max="20"
                            required
                        />
                        </div>
                   
                </div>
                    
                </div>
                <div className="d-grid form-row">
                    <div className="form-column">
                        <div className="form-column-inner">
                                    <label htmlFor="currency" className="form-label">
                                    Currency *
                                </label>
                                <select
                                    className="form-select"
                                    id="currency"
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="PHP">PHP (Philippine Peso)</option>
                                    <option value="USD">USD (US Dollar)</option>
                                    <option value="EUR">EUR (Euro)</option>
                                    <option value="GBP">GBP (British Pound)</option>
                                    <option value="JPY">JPY (Japanese Yen)</option>
                                    <option value="AUD">AUD (Australian Dollar)</option>
                                    <option value="SGD">SGD (Singapore Dollar)</option>
                                </select>
                            </div>
                    </div>
                </div>
                <div className="d-grid">
                    {error && (
                        <div className="alert alert-danger mb-3">
                            {error}
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary btn-lg" disabled={isChecking}>
                        {isChecking ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                    aria-hidden="true"
                                ></span>
                                Checking Availability...
                            </>
                        ) : (
                            "Check Availability"
                        )}
                    </button>
                </div>
            </form>

            {availabilityResult && (
                <div className="availability-results mt-4">
                    <div className={`alert ${availabilityResult.is_available ? "alert-success" : "alert-warning"}`}>
                        <h4>
                            {availabilityResult.is_available ? (
                                <><i className="fa fa-check-circle me-2"></i>Available</>
                            ) : (
                                <><i className="fa fa-exclamation-triangle me-2"></i>Not Available</>
                            )}
                        </h4>
                        <p className="mb-0">
                            <strong>Hotel:</strong> {availabilityResult.hotel_name}
                        </p>
                    </div>

                    {availabilityResult.is_under_refurbishment && (
                        <div className="alert alert-info">
                            <strong>Under Refurbishment</strong>
                            {availabilityResult.refurbishment_ends_at && (
                                <p className="mb-0">Expected completion: {availabilityResult.refurbishment_ends_at}</p>
                            )}
                        </div>
                    )}

                    {availabilityResult.is_temporarily_closed && (
                        <div className="alert alert-warning">
                            <strong>Temporarily Closed</strong>
                            {availabilityResult.closed_from && availabilityResult.closed_until && (
                                <p className="mb-0">
                                    Closed from {availabilityResult.closed_from} until {availabilityResult.closed_until}
                                </p>
                            )}
                        </div>
                    )}

                    {isAuthenticated && availabilityResult.lowest_rate !== null && (
                        <div className="card mt-3 availability-pricing-card">
                            <div className="card-body">
                                <h5 className="card-title">Pricing</h5>
                                <p className="card-text">
                                    <strong>Lowest Rate:</strong> {formatRate(availabilityResult.lowest_rate, availabilityResult.default_currency || undefined, formData.currency) || 'N/A'}
                                </p>
                            </div>
                        </div>
                    )}

                    {availabilityResult.room_types && availabilityResult.room_types.length > 0 && (
                        <div className="card mt-3 availability-room-types-card">
                            <div className="card-body">
                                <h5 className="card-title">Available Room Types</h5>
                                <div className="room-types-list">
                                    {availabilityResult.room_types.map((roomType, index) => {
                                        const formattedRate = formatRate(roomType.rate, roomType.currency, formData.currency);
                                        const roomImage = getRoomTypeImage(roomType as Record<string, any>, index);
                                        const roomFeatures = getRoomTypeFeatures(roomType as Record<string, any>);
                                        const roomRates =
                                            Array.isArray(roomType.rates) && roomType.rates.length > 0
                                                ? roomType.rates
                                                : roomType.rate !== undefined && roomType.rate !== null
                                                  ? [{ title: "Standard Rate", ...((typeof roomType.rate === "object" ? roomType.rate : { rate: roomType.rate })) }]
                                                  : [];
                                        return (
                                            <div key={index} className="room-type-item">
                                                <div className="room-type-image-wrap">
                                                    <img
                                                        src={roomImage}
                                                        alt={roomType.name || `Room Type ${index + 1}`}
                                                        className="room-type-image"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = roomImageFallbacks[index % roomImageFallbacks.length];
                                                        }}
                                                    />
                                                </div>
                                                {roomType.name && (
                                                    <h6 className="room-type-name">{roomType.name}</h6>
                                                )}
                                                {roomType.description && (
                                                    <p className="room-type-description">{roomType.description}</p>
                                                )}
                                                {roomFeatures.length > 0 && (
                                                    <div className="room-type-features">
                                                        <small className="room-type-features-label">Features</small>
                                                        <div className="room-type-features-list">
                                                            {roomFeatures.map((feature) => (
                                                                <span key={`${index}-${feature}`} className="room-type-feature-tag">
                                                                    {feature}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {roomRates.length > 0 && (
                                                    <div className="room-type-rates">
                                                        <small className="room-type-features-label">Rates</small>
                                                        <div className="room-type-rates-list">
                                                            {roomRates.map((rate, rateIndex) => {
                                                                const { value, currency } = getRateValueAndCurrency(
                                                                    rate as Rate,
                                                                    roomType.currency ?? availabilityResult.default_currency ?? formData.currency
                                                                );
                                                                const rateTitle = (rate as Rate).title || `Rate ${rateIndex + 1}`;
                                                                const cancellationPolicy =
                                                                    typeof (rate as Record<string, any>).cancellation_policy === "string"
                                                                        ? (rate as Record<string, any>).cancellation_policy
                                                                        : null;
                                                                const resolvedRateIndex =
                                                                    normalizeRateIndex((rate as Rate).rate_index) ??
                                                                    normalizeRateIndex(roomType.rate_index);
                                                                const isSelected = !!resolvedRateIndex && selectedRateIndex === resolvedRateIndex;
                                                                return (
                                                                    <div
                                                                        key={`${index}-rate-${rateIndex}`}
                                                                        className={`room-type-rate-item ${isSelected ? "room-type-rate-item--selected" : ""}`}
                                                                    >
                                                                        <span className="room-type-rate-title">{rateTitle}</span>
                                                                        {isAuthenticated ? (
                                                                            <span className="room-type-rate-value">
                                                                                {value !== null ? `${currency} ${value.toLocaleString()}` : "Price not available"}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="room-type-rate-value">Login to view price</span>
                                                                        )}
                                                                        {resolvedRateIndex && (
                                                                            <label className={`room-type-rate-checkbox ${isSelected ? "is-checked" : ""}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={(e) => {
                                                                                        if (e.target.checked) {
                                                                                            handleSelectRate(resolvedRateIndex);
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </label>
                                                                        )}
                                                                        {cancellationPolicy && (
                                                                            <p className="room-type-rate-policy mb-0">
                                                                                Cancellation Policy: {cancellationPolicy}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {selectedRateIndex && (
                                                            <p className="room-type-selected-rate mb-0">
                                                                Selected Rate Index: <strong>{selectedRateIndex}</strong>
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="room-type-footer">
                                                    {roomType.max_occupancy && (
                                                        <span className="room-type-occupancy">
                                                            Max Occupancy: {roomType.max_occupancy}
                                                        </span>
                                                    )}
                                                    {isAuthenticated && formattedRate && (
                                                        <strong className="room-type-rate">
                                                            {formattedRate}
                                                        </strong>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {availabilityResult.room_types && availabilityResult.room_types.length === 0 && availabilityResult.is_available && (
                        <div className="alert alert-info mt-3">
                            <p className="mb-0">Hotel is available but no room types were returned. Please contact the hotel directly for booking.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CheckAvailability;


