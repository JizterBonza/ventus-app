import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AvailabilityResponse, BookingResponse, Rate, RoomType } from "../../types/search";
import { submitBookingRequest } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { ensureMinimumCheckOutDateString } from "../../utils/searchSession";

interface BookingFormProps {
    hotelId: number;
    hotelName: string;
    onBookingSuccess?: (response: BookingResponse) => void;
    onBookingError?: (error: string) => void;
    className?: string;
    sessionId?: string;
    rateIndex?: string;
    startDate?: string;
    endDate?: string;
    initialRooms?: Array<{ adults: number; children: Array<{ age: number }> }>;
    availabilityResult?: AvailabilityResponse | null;
}

const readRateAmount = (rate: Rate | undefined): number | null => {
    if (!rate) return null;
    const value = rate.total_to_book_in_requested_currency
        ?? rate.total_to_book
        ?? rate.rate_in_requested_currency
        ?? rate.rate;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
};

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
    className = "",
    sessionId = "",
    rateIndex = "",
    startDate = "",
    endDate = "",
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
    const amount = readRateAmount(selected.rate);
    const currency = selected.rate?.requested_currency_code
        || selected.rate?.currency_code
        || selected.roomType?.currency
        || availabilityResult?.default_currency
        || "GBP";
    const [guestName, setGuestName] = useState(
        user ? `${user.firstName} ${user.lastName}`.trim() : "",
    );
    const [guestEmail, setGuestEmail] = useState(user?.email || "");
    const [guestPhone, setGuestPhone] = useState(user?.phone || "");
    const [specialRequests, setSpecialRequests] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const safeEndDate = ensureMinimumCheckOutDateString(startDate, endDate);
    const totalGuests = rooms.reduce(
        (total, room) => total + room.adults + (room.children?.length || 0),
        0,
    );

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
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
        if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
            setStatus("error");
            setMessage("Please enter your name, email address and phone number.");
            return;
        }

        setIsSubmitting(true);
        setStatus("idle");
        setMessage("");
        try {
            const response = await submitBookingRequest({
                hotelId,
                hotelName,
                sessionId,
                rateIndex,
                startDate,
                endDate: safeEndDate,
                guestName: guestName.trim(),
                guestEmail: guestEmail.trim(),
                guestPhone: guestPhone.trim(),
                specialRequests: specialRequests.trim(),
                rooms,
                quotedAmount: amount,
                quotedCurrency: currency,
                roomType: selected.roomType?.name || selected.rate?.title || "Selected room",
            });
            setStatus("success");
            setMessage(response.message);
            onBookingSuccess?.(response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unable to send this booking request.";
            setStatus("error");
            setMessage(errorMessage);
            onBookingError?.(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated || !hasActiveMembership) {
        return (
            <div className={`global-form ${className}`}>
                <h2>Request this booking</h2>
                <p>Sign in with an active membership to request this room and access Ventus benefits.</p>
                <Link className="btn btn-primary" to={isAuthenticated ? "/subscription" : "/login"}>
                    {isAuthenticated ? "Complete membership" : "Login to continue"}
                </Link>
            </div>
        );
    }

    return (
        <div className={`global-form ${className}`}>
            <div className="booking-request-heading">
                <h2>Request this booking</h2>
                <p>
                    Send your selected stay to Ventus. No payment is taken now; the team will confirm availability,
                    benefits and the final total before booking.
                </p>
            </div>

            <div className="booking-request-summary">
                <div><span>Hotel</span><strong>{hotelName}</strong></div>
                <div><span>Stay</span><strong>{startDate} to {safeEndDate}</strong></div>
                <div><span>Guests</span><strong>{totalGuests} guest{totalGuests === 1 ? "" : "s"}, {rooms.length} room{rooms.length === 1 ? "" : "s"}</strong></div>
                <div><span>Selected rate</span><strong>{selected.roomType?.name || selected.rate?.title || "Selected room"}</strong></div>
                {amount !== null && <div><span>Quoted total</span><strong>{currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>}
            </div>

            <form className="form booking-request-form" onSubmit={handleSubmit}>
                <div className="form-column">
                    <label htmlFor="bookingGuestName" className="form-label">Full name *</label>
                    <input id="bookingGuestName" className="form-control" value={guestName} onChange={(event) => setGuestName(event.target.value)} autoComplete="name" required />
                    <label htmlFor="bookingGuestEmail" className="form-label">Email *</label>
                    <input id="bookingGuestEmail" className="form-control" type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} autoComplete="email" required />
                    <label htmlFor="bookingGuestPhone" className="form-label">Phone *</label>
                    <input id="bookingGuestPhone" className="form-control" type="tel" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} autoComplete="tel" required />
                </div>
                <div className="form-column">
                    <label htmlFor="bookingSpecialRequests" className="form-label">Special requests</label>
                    <textarea id="bookingSpecialRequests" className="form-control" rows={7} value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} placeholder="Airport transfers, bedding preferences, celebrations or anything else we should know" />
                </div>

                <div className="d-grid submit-section">
                    {status !== "idle" && (
                        <div className={`alert ${status === "success" ? "alert-success" : "alert-danger"}`} role="status">
                            {message}
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting || status === "success"}>
                        {isSubmitting ? "Sending request…" : status === "success" ? "Request sent" : "Send booking request"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BookingForm;
