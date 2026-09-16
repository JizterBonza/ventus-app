import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AvailabilityResponse, BookingResponse, Rate, RoomType } from "../../types/search";
import { submitBooking } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { ensureMinimumCheckOutDateString } from "../../utils/searchSession";
import { getStayTotal } from "../../utils/livePricing";

interface BookingFormProps {
    hotelId: number;
    hotelName: string;
    onBookingSuccess?: (response: BookingResponse) => void;
    onBookingError?: (error: string) => void;
    onRefreshAvailability?: () => void;
    className?: string;
    sessionId?: string;
    rateIndex?: string;
    startDate?: string;
    endDate?: string;
    requestedCurrency?: string;
    initialRooms?: Array<{ adults: number; children: Array<{ age: number }> }>;
    availabilityResult?: AvailabilityResponse | null;
}

const CARD_WIDGET_ORIGIN = "https://api.littleemperors.com";

const findSelectedRate = (
    availabilityResult: AvailabilityResponse | null,
    rateIndex: string,
): { roomType?: RoomType; rate?: Rate } => {
    if (!availabilityResult || !rateIndex) return {};
    for (const roomType of availabilityResult.room_types || []) {
        const rate = roomType.rates?.find((candidate) => String(candidate.rate_index) === rateIndex);
        if (rate) return { roomType, rate };
        if (String(roomType.rate_index) === rateIndex) {
            return {
                roomType,
                rate: typeof roomType.rate === "object"
                    ? ({ ...roomType.rate, rate_index: rateIndex } as Rate)
                    : ({ rate: roomType.rate, rate_index: rateIndex } as Rate),
            };
        }
    }
    return {};
};

const BookingForm: React.FC<BookingFormProps> = ({
    hotelId,
    hotelName,
    onBookingSuccess,
    onBookingError,
    onRefreshAvailability,
    className = "",
    sessionId = "",
    rateIndex = "",
    startDate = "",
    endDate = "",
    requestedCurrency,
    initialRooms,
    availabilityResult = null,
}) => {
    const { isAuthenticated, hasActiveMembership, user } = useAuth();
    const rooms = useMemo(
        () => (initialRooms?.length ? initialRooms : [{ adults: 1, children: [] }]),
        [initialRooms],
    );
    const selected = useMemo(
        () => findSelectedRate(availabilityResult, rateIndex),
        [availabilityResult, rateIndex],
    );
    const stayTotal = getStayTotal(
        selected.rate,
        selected.roomType?.currency || availabilityResult?.default_currency,
        requestedCurrency,
    );
    const currency = stayTotal?.currency ?? null;
    const safeEndDate = ensureMinimumCheckOutDateString(startDate, endDate);
    const totalGuests = rooms.reduce(
        (total, room) => total + room.adults + (room.children?.length || 0),
        0,
    );
    const benefits = Array.from(new Set([
        ...(selected.rate?.benefits || []),
        ...(selected.rate?.additional_benefits || []),
    ].filter((item): item is string => typeof item === "string" && Boolean(item.trim()))));
    const footnotes = (selected.rate?.benefits_footnotes || []).filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
    );
    const rawStayRequirements = selected.rate?.stay_requirements;
    const stayRequirements = Array.isArray(rawStayRequirements)
        ? rawStayRequirements.filter((item: unknown): item is string => typeof item === "string")
        : [];

    const [guestName, setGuestName] = useState(
        user ? `${user.firstName} ${user.lastName}`.trim() : "",
    );
    const [guestEmail, setGuestEmail] = useState(user?.email || "");
    const [eta, setEta] = useState("");
    const [cardStored, setCardStored] = useState(false);
    const [cardMessage, setCardMessage] = useState("");
    const [sessionError, setSessionError] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const submittingRef = useRef(false);
    const cardFrameRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        setCardStored(false);
        setCardMessage("");
        setSessionError(false);
        setTermsAccepted(false);
        setStatus("idle");
        setMessage("");
    }, [sessionId, rateIndex]);

    useEffect(() => {
        const expiresAt = availabilityResult?.expiry_date
            ? Date.parse(availabilityResult.expiry_date)
            : NaN;
        if (!Number.isFinite(expiresAt)) return;
        const expire = () => {
            setCardStored(false);
            setSessionError(true);
            setCardMessage("This live rate has expired. Refresh availability to continue safely.");
        };
        const remainingMs = expiresAt - Date.now() - 30_000;
        if (remainingMs <= 0) {
            expire();
            return;
        }
        const timeout = window.setTimeout(expire, remainingMs);
        return () => window.clearTimeout(timeout);
    }, [availabilityResult?.expiry_date, sessionId]);

    useEffect(() => {
        const handleCardMessage = (event: MessageEvent) => {
            if (event.origin !== CARD_WIDGET_ORIGIN ||
                event.source !== cardFrameRef.current?.contentWindow ||
                !event.data || typeof event.data !== "object") return;
            if (event.data.success === true) {
                setCardStored(true);
                setSessionError(false);
                setCardMessage("Card details secured. You can now confirm the booking.");
                return;
            }
            if (event.data.errorMessage) {
                setCardStored(false);
                setCardMessage(String(event.data.errorMessage));
                if (/session/i.test(`${event.data.errorKey || ""} ${event.data.errorMessage}`)) {
                    setSessionError(true);
                }
            }
        };
        window.addEventListener("message", handleCardMessage);
        return () => window.removeEventListener("message", handleCardMessage);
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submittingRef.current) return;
        if (!isAuthenticated || !hasActiveMembership) {
            setStatus("error");
            setMessage("An active Ventus Travel membership is required.");
            return;
        }
        if (!sessionId || !rateIndex || !startDate || !safeEndDate) {
            setStatus("error");
            setMessage("Please check availability and select a room rate again.");
            return;
        }
        if (!guestName.trim() || !guestEmail.trim()) {
            setStatus("error");
            setMessage("Please enter the lead guest's full name and email address.");
            return;
        }
        if (!stayTotal) {
            setStatus("error");
            setMessage("The supplier has not confirmed a total for this stay. Refresh availability and select a rate again before booking.");
            return;
        }
        if (!cardStored) {
            setStatus("error");
            setMessage("Please submit your card details securely above before confirming.");
            return;
        }
        if (!termsAccepted) {
            setStatus("error");
            setMessage("Please confirm that you accept the selected rate and cancellation terms.");
            return;
        }

        submittingRef.current = true;
        setIsSubmitting(true);
        setStatus("idle");
        setMessage("");
        try {
            const response = await submitBooking({
                hotelId,
                sessionId,
                rateIndex,
                startDate,
                endDate: safeEndDate,
                guestName: guestName.trim(),
                guestEmail: guestEmail.trim(),
                eta: eta || undefined,
                rooms,
            });
            setStatus("success");
            setMessage(response.message);
            onBookingSuccess?.(response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unable to confirm this booking.";
            setStatus("error");
            setMessage(errorMessage);
            if (/session|rate.*expir/i.test(errorMessage)) {
                setCardStored(false);
                setSessionError(true);
            }
            onBookingError?.(errorMessage);
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated || !hasActiveMembership) {
        return (
            <div className={`global-form ${className}`}>
                <h2>Book this room</h2>
                <p>Sign in with an active membership to see the full rate details and complete your booking.</p>
                <Link className="btn btn-primary" to={isAuthenticated ? "/subscription" : "/login"}>
                    {isAuthenticated ? "Complete membership" : "Login to continue"}
                </Link>
            </div>
        );
    }

    return (
        <div className={`global-form ${className}`}>
            <div className="booking-request-heading">
                <h2>Complete your booking</h2>
                <p>Review the selected live rate, enter the lead guest details and confirm securely with Little Emperors.</p>
            </div>

            <div className="booking-request-summary">
                <div><span>Hotel</span><strong>{hotelName}</strong></div>
                <div><span>Stay</span><strong>{startDate} to {safeEndDate}</strong></div>
                <div><span>Guests</span><strong>{totalGuests} guest{totalGuests === 1 ? "" : "s"}, {rooms.length} room{rooms.length === 1 ? "" : "s"}</strong></div>
                <div><span>Selected room</span><strong>{selected.roomType?.name || "Selected room"}</strong></div>
                <div><span>Rate</span><strong>{selected.rate?.title || "Selected rate"}</strong></div>
                <div><span>Total</span><strong>{stayTotal
                    ? `${currency} ${stayTotal.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "Not provided by supplier"}</strong></div>
            </div>

            <div className="booking-rate-details">
                {selected.rate?.description && <p>{selected.rate.description}</p>}
                {selected.rate?.payment_description && <p><strong>Payment:</strong> {selected.rate.payment_description}</p>}
                {selected.rate?.cancellation_policy && <p><strong>Cancellation:</strong> {selected.rate.cancellation_policy}</p>}
                {selected.rate?.cancellation_deadline && <p><strong>Cancellation deadline:</strong> {selected.rate.cancellation_deadline}</p>}
                {typeof selected.rate?.is_tax_included === "boolean" && (
                    <p><strong>Taxes:</strong> {selected.rate.is_tax_included ? "Included in the total" : "Not included in the total"}</p>
                )}
                {benefits.length > 0 && (
                    <div>
                        <strong>Included benefits</strong>
                        <ul>{benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
                        {footnotes.map((footnote) => <small key={footnote}>{footnote}</small>)}
                    </div>
                )}
                {stayRequirements.length > 0 && (
                    <div>
                        <strong>Stay requirements</strong>
                        <ul>{stayRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
                    </div>
                )}
            </div>

            {status === "success" ? (
                <div className="alert alert-success booking-confirmation" role="status">
                    <h3>Booking confirmed</h3>
                    <p>{message}</p>
                    <p>A confirmation email will be sent to {guestEmail}.</p>
                </div>
            ) : (
                <form className="form booking-request-form" onSubmit={handleSubmit}>
                    <div className="form-column">
                        <label htmlFor="bookingGuestName" className="form-label">Lead guest full name *</label>
                        <input id="bookingGuestName" className="form-control" type="text" value={guestName} onChange={(event) => setGuestName(event.target.value)} autoComplete="name" required />
                        <label htmlFor="bookingGuestEmail" className="form-label">Email *</label>
                        <input id="bookingGuestEmail" className="form-control" type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} autoComplete="email" required />
                        <label htmlFor="bookingEta" className="form-label">Estimated arrival time</label>
                        <select id="bookingEta" className="form-control" value={eta} onChange={(event) => setEta(event.target.value)}>
                            <option value="">Select an hour (optional)</option>
                            {Array.from({ length: 24 }, (_, hour) => (
                                <option key={hour} value={String(hour)}>{String(hour).padStart(2, "0")}:00</option>
                            ))}
                        </select>
                    </div>

                    <div className="booking-secure-card">
                        <h3>Secure card details</h3>
                        <p>Your card details are entered directly into Little Emperors’ secure form. Ventus never receives or stores them.</p>
                        {sessionId && stayTotal ? (
                            <iframe
                                ref={cardFrameRef}
                                key={sessionId}
                                title="Secure card details"
                                src={`${CARD_WIDGET_ORIGIN}/widgets/credit-card?session_id=${encodeURIComponent(sessionId)}`}
                                className="booking-card-widget"
                                allow="payment"
                            />
                        ) : (
                            <p className="booking-card-error">{!stayTotal
                                ? "The supplier has not confirmed the stay total. Refresh availability and select a rate again."
                                : "No valid booking session was returned for this rate."}</p>
                        )}
                        {cardMessage && (
                            <p className={cardStored ? "booking-card-success" : "booking-card-error"} role="status">
                                {cardMessage}
                            </p>
                        )}
                        {(!sessionId || sessionError || !stayTotal) && onRefreshAvailability && (
                            <button type="button" className="btn btn-outline-primary booking-refresh-rate" onClick={onRefreshAvailability}>
                                Refresh availability and select a room again
                            </button>
                        )}
                    </div>

                    <label className="booking-terms-confirmation">
                        <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                        <span>I accept this rate, its payment and cancellation terms, and the <Link to="/terms-of-service">Ventus terms of service</Link>.</span>
                    </label>

                    <div className="d-grid submit-section">
                        {status === "error" && <div className="alert alert-danger" role="alert">{message}</div>}
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting || !sessionId || sessionError || !cardStored || !termsAccepted || !stayTotal}>
                            {isSubmitting ? "Confirming booking…" : stayTotal ? `Confirm booking — ${currency} ${stayTotal.rate.toLocaleString()}` : "Total unavailable"}
                        </button>
                        <small>Only click confirm once. The hotel booking will be submitted immediately.</small>
                    </div>
                </form>
            )}
        </div>
    );
};

export default BookingForm;
