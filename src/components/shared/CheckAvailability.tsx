import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AvailabilityParams, AvailabilityResponse, Rate } from "../../types/search";
import { checkHotelAvailability } from "../../utils/api";
import { getNightlyPrice, getStayTotal } from "../../utils/livePricing";
import { getRoomTypeImages } from "../../utils/roomImages";
import { useAuth } from "../../contexts/AuthContext";
import {
    SEARCH_SESSION_COOKIES,
    getCookie,
    setCookie,
    parseSearchDate,
    dateToStorageString,
    ensureMinimumCheckOutDateString,
    getMinimumCheckOutDateString,
    getDefaultSearchDateStrings,
    getTodayLocalDateString,
    resolveSearchRoomSlots,
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
        currency: string;
        /** When set (from header search per-room guests), pre-fills the booking form. */
        initialRooms?: Array<{ adults: number; children: Array<{ age: number }> }>;
    };
    selectedRateIndex?: string;
}

interface CheckAvailabilityProps {
    hotelId: number;
    hotelName: string;
    className?: string;
    refreshNonce?: number;
    onAvailabilityStart?: () => void;
    onAvailabilityError?: () => void;
    onAvailabilityResult?: (result: AvailabilityResultWithFormData) => void;
    onRateSelected?: (rateIndex: string) => void;
}

function normalizeRateIndex(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value === "number") return String(value);
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    return null;
}

const RoomTypeImageGallery: React.FC<{ images: string[]; roomName: string }> = ({ images, roomName }) => {
    const [imageIndex, setImageIndex] = useState(0);
    const imagesKey = images.join('|');

    useEffect(() => setImageIndex(0), [imagesKey]);

    if (images.length === 0) {
        return <span className="room-type-image-placeholder" role="img" aria-label={`${roomName} image unavailable`} />;
    }

    const showPrevious = () => setImageIndex((current) => (current - 1 + images.length) % images.length);
    const showNext = () => setImageIndex((current) => (current + 1) % images.length);

    return (
        <div className="room-type-gallery">
            <img
                src={images[imageIndex]}
                alt={`${roomName} — ${imageIndex + 1} of ${images.length}`}
                className="room-type-image"
                loading="lazy"
                decoding="async"
            />
            {images.length > 1 && (
                <>
                    <button type="button" className="room-type-gallery-arrow room-type-gallery-arrow--previous" onClick={showPrevious} aria-label={`Previous ${roomName} photo`}>
                        <span aria-hidden="true">‹</span>
                    </button>
                    <button type="button" className="room-type-gallery-arrow room-type-gallery-arrow--next" onClick={showNext} aria-label={`Next ${roomName} photo`}>
                        <span aria-hidden="true">›</span>
                    </button>
                    <div className="room-type-gallery-dots" aria-label={`Photo ${imageIndex + 1} of ${images.length}`}>
                        {images.map((_, index) => (
                            <button
                                type="button"
                                key={index}
                                className={index === imageIndex ? 'is-active' : ''}
                                onClick={() => setImageIndex(index)}
                                aria-label={`Show ${roomName} photo ${index + 1}`}
                                aria-current={index === imageIndex ? 'true' : undefined}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const CheckAvailability: React.FC<CheckAvailabilityProps> = ({
    hotelId,
    hotelName,
    className = "",
    refreshNonce = 0,
    onAvailabilityStart,
    onAvailabilityError,
    onAvailabilityResult,
    onRateSelected,
}) => {
    const { isAuthenticated, hasActiveMembership } = useAuth();
    const [urlSearchParams, setSearchParams] = useSearchParams();
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

    /** After first sync from URL/cookies so auto-check does not run with stale default dates before header state applies. */
    const [searchHydrated, setSearchHydrated] = useState(false);

    const fetchSeqRef = useRef(0);
    const onAvailabilityStartRef = useRef(onAvailabilityStart);
    onAvailabilityStartRef.current = onAvailabilityStart;
    const onAvailabilityErrorRef = useRef(onAvailabilityError);
    onAvailabilityErrorRef.current = onAvailabilityError;
    const onAvailabilityResultRef = useRef(onAvailabilityResult);
    onAvailabilityResultRef.current = onAvailabilityResult;

    // Match header search: dates, guests, and per-room `roomSlots` from URL / cookies
    // (falling back to a legacy total guests/rooms split -- see resolveSearchRoomSlots)
    useEffect(() => {
        const urlCheckIn = urlSearchParams.get("checkIn");
        const urlCheckOut = urlSearchParams.get("checkOut");

        const ci = parseSearchDate(urlCheckIn || getCookie(SEARCH_SESSION_COOKIES.CHECK_IN) || "");
        const co = parseSearchDate(urlCheckOut || getCookie(SEARCH_SESSION_COOKIES.CHECK_OUT) || "");
        const startDate = ci ? dateToStorageString(ci) : "";
        const requestedEndDate = co ? dateToStorageString(co) : "";
        const endDate = ensureMinimumCheckOutDateString(startDate, requestedEndDate);

        const slots: SearchRoomSlot[] = resolveSearchRoomSlots(urlSearchParams);
        setSearchRoomSlots(slots);

        setFormData((prev) => ({
            ...prev,
            ...(startDate ? { start_date: startDate } : {}),
            ...(endDate ? { end_date: endDate } : {}),
            adults: slots.reduce((s, r) => s + r.adults, 0),
        }));

        if (startDate && endDate && endDate !== requestedEndDate) {
            setCookie(SEARCH_SESSION_COOKIES.CHECK_IN, startDate);
            setCookie(SEARCH_SESSION_COOKIES.CHECK_OUT, endDate);
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("checkIn", startDate);
                    next.set("checkOut", endDate);
                    return next;
                },
                { replace: true }
            );
        }
        setSearchHydrated(true);
    }, [urlSearchParams, setSearchParams]);

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
    /** Incremented by "Check again" to re-run availability with the same dates. */
    const [recheckNonce, setRecheckNonce] = useState(0);
    /** Editable dates while result is "Not Available"; applied on "Check again" only (no auto-fetch on change). */
    const [retryDraft, setRetryDraft] = useState<{ start_date: string; end_date: string } | null>(null);
    const getValidationError = (): string | null => {
        if (!formData.start_date) {
            return "Please select check-in date";
        }
        if (!formData.end_date) {
            return "Please select check-out date";
        }
        if (formData.start_date >= formData.end_date) {
            return "Check-out date must be after check-in date";
        }
        if (formData.adults < 1) {
            return "Number of adults must be at least 1";
        }
        if (!formData.currency) {
            return "Please select a currency";
        }
        return null;
    };

    /** Keeps header `SearchBarNew` in sync (URL + cookies). */
    const persistSearchDatesToUrlAndCookies = (checkIn: string, checkOut: string) => {
        if (!checkIn || !checkOut) return;
        setCookie(SEARCH_SESSION_COOKIES.CHECK_IN, checkIn);
        setCookie(SEARCH_SESSION_COOKIES.CHECK_OUT, checkOut);
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("checkIn", checkIn);
                next.set("checkOut", checkOut);
                return next;
            },
            { replace: true }
        );
    };

    useEffect(() => {
        if (availabilityResult && !availabilityResult.is_available) {
            setRetryDraft({
                start_date: formData.start_date,
                end_date: formData.end_date,
            });
        } else {
            setRetryDraft(null);
        }
    }, [availabilityResult, formData.start_date, formData.end_date]);

    const handleRetryCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setRetryDraft((prev) => {
            const base = prev ?? { start_date: formData.start_date, end_date: formData.end_date };
            const end = ensureMinimumCheckOutDateString(newStart, base.end_date);
            return { start_date: newStart, end_date: end };
        });
    };

    const handleRetryCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = e.target.value;
        setRetryDraft((prev) => {
            const base = prev ?? { start_date: formData.start_date, end_date: formData.end_date };
            const end = ensureMinimumCheckOutDateString(base.start_date, newEnd);
            return { start_date: base.start_date, end_date: end };
        });
    };

    const handleCheckAgain = () => {
        const requestedDraft =
            retryDraft ?? { start_date: formData.start_date, end_date: formData.end_date };
        const draft = {
            ...requestedDraft,
            end_date: ensureMinimumCheckOutDateString(
                requestedDraft.start_date,
                requestedDraft.end_date
            ),
        };
        if (!draft.start_date) {
            setError("Please select check-in date");
            return;
        }
        if (!draft.end_date) {
            setError("Please select check-out date");
            return;
        }
        if (draft.start_date >= draft.end_date) {
            setError("Check-out date must be after check-in date");
            return;
        }
        setError(null);
        persistSearchDatesToUrlAndCookies(draft.start_date, draft.end_date);
        const unchanged =
            draft.start_date === formData.start_date && draft.end_date === formData.end_date;
        if (unchanged) {
            setRecheckNonce((n) => n + 1);
        } else {
            setFormData((prev) => ({
                ...prev,
                start_date: draft.start_date,
                end_date: draft.end_date,
            }));
        }
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
                currency: formData.currency,
                ...(initialRooms ? { initialRooms } : {}),
            },
            selectedRateIndex: chosenRateIndex || undefined,
        };
        onAvailabilityResultRef.current?.(resultWithFormData);
    };

    // Auto-run availability using header search (URL + cookies), after hydration from the same source.
    useEffect(() => {
        if (!hasActiveMembership || !searchHydrated || !hotelId) {
            return;
        }

        const validationError = getValidationError();
        if (validationError) {
            setError(validationError);
            onAvailabilityStartRef.current?.();
            onAvailabilityErrorRef.current?.();
            setAvailabilityResult(null);
            setSelectedRateIndex("");
            setIsChecking(false);
            return;
        }

        const seq = ++fetchSeqRef.current;
        onAvailabilityStartRef.current?.();
        setIsChecking(true);
        setError(null);
        setAvailabilityResult(null);
        setSelectedRateIndex("");

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

        let cancelled = false;
        (async () => {
            try {
                const results = await checkHotelAvailability(params);
                if (cancelled || seq !== fetchSeqRef.current) {
                    return;
                }
                if (results && results.length > 0) {
                    const result = results[0];
                    setAvailabilityResult(result);
                    setSelectedRateIndex("");
                    emitAvailabilityResult(result, "");
                } else {
                    setError("No availability data returned");
                    onAvailabilityErrorRef.current?.();
                }
            } catch (err) {
                if (cancelled || seq !== fetchSeqRef.current) {
                    return;
                }
                const errorMessage = err instanceof Error ? err.message : "Failed to check availability";
                setError(errorMessage);
                onAvailabilityErrorRef.current?.();
                console.error("Error checking availability:", err);
            } finally {
                if (!cancelled && seq === fetchSeqRef.current) {
                    setIsChecking(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        searchHydrated,
        hotelId,
        formData.start_date,
        formData.end_date,
        formData.adults,
        formData.currency,
        searchRoomSlots,
        urlSearchParams,
        recheckNonce,
        refreshNonce,
        hasActiveMembership,
    ]);

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
    ): { value: number | null; currency: string | null; isStayTotal: boolean } => {
        const nightly = getNightlyPrice(rate, fallbackCurrency, formData.currency);
        if (nightly) return { value: nightly.rate, currency: nightly.currency, isStayTotal: false };
        const total = getStayTotal(rate, fallbackCurrency, formData.currency);
        if (total) return { value: total.rate, currency: total.currency, isStayTotal: true };
        return { value: null, currency: null, isStayTotal: false };
    };

    const handleSelectRate = (rateIndexValue: string) => {
        if (!availabilityResult || !rateIndexValue) return;
        setSelectedRateIndex(rateIndexValue);
        emitAvailabilityResult(availabilityResult, rateIndexValue);
        onRateSelected?.(rateIndexValue);
    };

    const notAvailableRetryDates =
        availabilityResult && !availabilityResult.is_available
            ? (retryDraft ?? {
                  start_date: formData.start_date,
                  end_date: formData.end_date,
              })
            : null;

    if (!hasActiveMembership) {
        return (
            <div className={`global-form ${className}`}>
                <div className="text-center availability-intro">
                    <h2>Rooms &amp; rates</h2>
                    <p>{isAuthenticated ? "Complete your membership to view live prices, benefits and room availability." : "Log in to view live prices, benefits and room availability."}</p>
                    <a className="btn btn-primary" href={isAuthenticated ? "/subscription" : "/login"}>
                        {isAuthenticated ? "Complete membership" : "Log in"}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={`global-form ${className}`}>
            <div className="text-center availability-intro">
                <h2>Rooms &amp; rates</h2>
                <p className="text-muted mb-0">
                    {hotelName} · Using dates and guests from your search above.
                </p>
            </div>

            {isChecking && (
                <div className="d-flex align-items-center justify-content-center gap-2 my-4" aria-live="polite">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Checking availability…</span>
                </div>
            )}

            {error && (
                <div className="alert alert-danger my-3" role="alert">
                    {error}
                </div>
            )}

            {availabilityResult && (
                <div className="availability-results mt-4">
                    <div className={`alert availability-status ${availabilityResult.is_available ? "alert-success" : "alert-warning"}`} role="status">
                        {availabilityResult.is_available
                            ? "Rooms available for your dates"
                            : "No rooms available for these dates"}
                    </div>

                    {notAvailableRetryDates && (
                        <div className="card mt-3 availability-retry-dates-card">
                            <div className="card-body">
                                <h3 className="card-title" style={{ color: "#fff" }}>Check availability again</h3>
                                <p className="text-muted small mb-3">
                                    Choose check-in and check-out, then click <strong>Check again</strong>. Your search bar dates update when you submit.
                                </p>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-5 col-lg-4">
                                        <label htmlFor="ca-retry-checkin" className="form-label">
                                            Check-in
                                        </label>
                                        <input
                                            id="ca-retry-checkin"
                                            type="date"
                                            className="form-control"
                                            min={getTodayLocalDateString()}
                                            value={notAvailableRetryDates.start_date}
                                            onChange={handleRetryCheckInChange}
                                            disabled={isChecking}
                                        />
                                    </div>
                                    <div className="col-md-5 col-lg-4">
                                        <label htmlFor="ca-retry-checkout" className="form-label">
                                            Check-out
                                        </label>
                                        <input
                                            id="ca-retry-checkout"
                                            type="date"
                                            className="form-control"
                                            min={getMinimumCheckOutDateString(notAvailableRetryDates.start_date)}
                                            value={notAvailableRetryDates.end_date}
                                            onChange={handleRetryCheckOutChange}
                                            disabled={isChecking}
                                        />
                                    </div>
                                    <div className="col-12 col-md-auto d-flex align-items-end pt-2 pt-md-0">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleCheckAgain}
                                            disabled={isChecking}
                                        >
                                            Check again
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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

                    {availabilityResult.is_available &&
                        availabilityResult.room_types &&
                        availabilityResult.room_types.length > 0 && (
                        <div className="card mt-3 availability-room-types-card">
                            <div className="card-body">
                                <h3 className="card-title">Available rooms</h3>
                                <div className="room-types-list">
                                    {availabilityResult.room_types.map((roomType, index) => {
                                        const roomImages = getRoomTypeImages(roomType as Record<string, unknown>);
                                        const roomName = roomType.name || `Room type ${index + 1}`;
                                        const roomFeatures = getRoomTypeFeatures(roomType as Record<string, any>).slice(0, 3);
                                        const roomRates =
                                            Array.isArray(roomType.rates) && roomType.rates.length > 0
                                                ? roomType.rates
                                                : roomType.rate !== undefined && roomType.rate !== null
                                                  ? [{ title: "Standard Rate", ...((typeof roomType.rate === "object" ? roomType.rate : { rate: roomType.rate })) }]
                                                  : [];
                                        return (
                                            <div key={index} className="room-type-item">
                                                <div className="room-type-image-wrap">
                                                    <RoomTypeImageGallery images={roomImages} roomName={roomName} />
                                                </div>
                                                {roomType.name && (
                                                    <h4 className="room-type-name">{roomType.name}</h4>
                                                )}
                                                <div className="room-type-meta">
                                                    {[roomType.room_size, roomType.bed_size, roomType.view_from_room]
                                                        .filter((value): value is string => typeof value === "string" && value.trim() !== "")
                                                        .map((value) => <span key={value}>{value}</span>)}
                                                </div>
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
                                                                const { value, currency, isStayTotal } = getRateValueAndCurrency(
                                                                    rate as Rate,
                                                                    roomType.currency ?? availabilityResult.default_currency ?? formData.currency
                                                                );
                                                                const rateTitle = (rate as Rate).title || `Rate ${rateIndex + 1}`;
                                                                const cancellationPolicy =
                                                                    typeof (rate as Record<string, any>).cancellation_policy === "string"
                                                                        ? (rate as Record<string, any>).cancellation_policy
                                                                        : null;
                                                                const paymentDescription =
                                                                    typeof (rate as Record<string, any>).payment_description === "string"
                                                                        ? (rate as Record<string, any>).payment_description
                                                                        : null;
                                                                const rateBenefits = Array.from(new Set([
                                                                    ...(((rate as Rate).benefits || []).filter(Boolean)),
                                                                    ...(((rate as Rate).additional_benefits || []).filter(Boolean)),
                                                                ]));
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
                                                                        {hasActiveMembership ? (
                                                                            <span className="room-type-rate-value">
                                                                                {value !== null && currency
                                                                                    ? `${isStayTotal ? "Stay total: " : ""}${currency} ${value.toLocaleString()}`
                                                                                    : "Rate unavailable — check with hotel"}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="room-type-rate-value">Login to view price</span>
                                                                        )}
                                                                        {resolvedRateIndex && hasActiveMembership && (
                                                                            <button
                                                                                type="button"
                                                                                className={`btn room-type-select-rate ${isSelected ? "btn-outline-primary" : "btn-primary"}`}
                                                                                onClick={() => handleSelectRate(resolvedRateIndex)}
                                                                            >
                                                                                {isSelected ? "Selected" : "Select room"}
                                                                            </button>
                                                                        )}
                                                                        {(cancellationPolicy || paymentDescription || rateBenefits.length > 0) && (
                                                                            <details className="room-type-rate-details">
                                                                                <summary>Rate details</summary>
                                                                                {rateBenefits.length > 0 && (
                                                                                    <ul>
                                                                                        {rateBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
                                                                                    </ul>
                                                                                )}
                                                                                {cancellationPolicy && <p>{cancellationPolicy}</p>}
                                                                                {paymentDescription && <p>{paymentDescription}</p>}
                                                                            </details>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="room-type-footer">
                                                    {roomType.max_occupancy && (
                                                        <span className="room-type-occupancy">
                                                            Max Occupancy: {roomType.max_occupancy}
                                                        </span>
                                                    )}
                                                    {!hasActiveMembership && <span className="room-type-rate">Complete membership to view prices</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {availabilityResult.is_available &&
                        availabilityResult.room_types &&
                        availabilityResult.room_types.length === 0 && (
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
