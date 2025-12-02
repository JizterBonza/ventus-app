/* OLD BOOKING FORM - COMMENTED OUT FOR FUTURE REFERENCE
import React, { useState } from "react";
import { BookingDetails, BookingResponse } from "../../types/search";
import { sendBookingEmail } from "../../utils/api";

interface BookingFormProps {
    hotelId: number;
    hotelName: string;
    onBookingSuccess?: (response: BookingResponse) => void;
    onBookingError?: (error: string) => void;
    className?: string;
}

const BookingForm: React.FC<BookingFormProps> = ({
    hotelId,
    hotelName,
    onBookingSuccess,
    onBookingError,
    className = "",
}) => {
    const [formData, setFormData] = useState<Omit<BookingDetails, "hotelId" | "hotelName">>({
        guestName: "",
        guestEmail: "",
        guestPhone: "",
        checkInDate: "",
        checkOutDate: "",
        numberOfGuests: 1,
        numberOfRooms: 1,
        roomType: "",
        specialRequests: "",
        totalPrice: 0,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
    const [submitMessage, setSubmitMessage] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                name === "numberOfGuests" || name === "numberOfRooms" || name === "totalPrice"
                    ? parseInt(value) || 0
                    : value,
        }));
    };

    const validateForm = (): boolean => {
        if (!formData.guestName.trim()) {
            setSubmitMessage("Please enter your name");
            return false;
        }
        if (!formData.guestEmail.trim()) {
            setSubmitMessage("Please enter your email");
            return false;
        }
        if (!formData.guestPhone.trim()) {
            setSubmitMessage("Please enter your phone number");
            return false;
        }
        if (!formData.checkInDate) {
            setSubmitMessage("Please select check-in date");
            return false;
        }
        if (!formData.checkOutDate) {
            setSubmitMessage("Please select check-out date");
            return false;
        }
        if (formData.checkInDate >= formData.checkOutDate) {
            setSubmitMessage("Check-out date must be after check-in date");
            return false;
        }
        if (formData.numberOfGuests < 1) {
            setSubmitMessage("Number of guests must be at least 1");
            return false;
        }
        if (formData.numberOfRooms < 1) {
            setSubmitMessage("Number of rooms must be at least 1");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            setSubmitStatus("error");
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus("idle");
        setSubmitMessage("");

        try {
            const bookingDetails: BookingDetails = {
                hotelId,
                hotelName,
                ...formData,
            };

            const response = await sendBookingEmail(bookingDetails);

            if (response.success) {
                setSubmitStatus("success");
                setSubmitMessage(response.message);
                onBookingSuccess?.(response);

                // Reset form after successful submission
                setFormData({
                    guestName: "",
                    guestEmail: "",
                    guestPhone: "",
                    checkInDate: "",
                    checkOutDate: "",
                    numberOfGuests: 1,
                    numberOfRooms: 1,
                    roomType: "",
                    specialRequests: "",
                    totalPrice: 0,
                });
            } else {
                setSubmitStatus("error");
                setSubmitMessage(response.message);
                onBookingError?.(response.message);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
            setSubmitStatus("error");
            setSubmitMessage(errorMessage);
            onBookingError?.(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`global-form ${className}`}>
            <div className="text-center">
                <h2>Book Your Stay</h2>
                <p className="text-muted mb-0">Hotel: {hotelName}</p>
            </div>
            <form className="form" onSubmit={handleSubmit}>
                <div className="form-column">
                    <label htmlFor="guestName" className="form-label">
                        Full Name *
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="guestName"
                        name="guestName"
                        value={formData.guestName}
                        onChange={handleInputChange}
                        required
                    />
                    <label htmlFor="guestEmail" className="form-label">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        className="form-control"
                        id="guestEmail"
                        name="guestEmail"
                        value={formData.guestEmail}
                        onChange={handleInputChange}
                        required
                    />
                    <label htmlFor="guestPhone" className="form-label">
                        Phone Number *
                    </label>
                    <input
                        type="tel"
                        className="form-control"
                        id="guestPhone"
                        name="guestPhone"
                        value={formData.guestPhone}
                        onChange={handleInputChange}
                        required
                    />
                    <label htmlFor="checkInDate" className="form-label">
                        Check-in Date *
                    </label>
                    <input
                        type="date"
                        className="form-control"
                        id="checkInDate"
                        name="checkInDate"
                        value={formData.checkInDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split("T")[0]}
                        required
                    />
                    <label htmlFor="checkOutDate" className="form-label">
                        Check-out Date *
                    </label>
                    <input
                        type="date"
                        className="form-control"
                        id="checkOutDate"
                        name="checkOutDate"
                        value={formData.checkOutDate}
                        onChange={handleInputChange}
                        min={formData.checkInDate || new Date().toISOString().split("T")[0]}
                        required
                    />
                </div>

                <div className="form-column">
                    <label htmlFor="roomType" className="form-label">
                        Room Type
                    </label>
                    <select
                        className="form-select"
                        id="roomType"
                        name="roomType"
                        value={formData.roomType}
                        onChange={handleInputChange}
                    >
                        <option value="">Select room type</option>
                        <option value="standard">Standard Room</option>
                        <option value="deluxe">Deluxe Room</option>
                        <option value="suite">Suite</option>
                        <option value="presidential">Presidential Suite</option>
                    </select>
                    <label htmlFor="numberOfGuests" className="form-label">
                        Number of Guests *
                    </label>
                    <input
                        type="number"
                        className="form-control"
                        id="numberOfGuests"
                        name="numberOfGuests"
                        value={formData.numberOfGuests}
                        onChange={handleInputChange}
                        min="1"
                        max="20"
                        required
                    />
                    <label htmlFor="numberOfRooms" className="form-label">
                        Number of Rooms *
                    </label>
                    <input
                        type="number"
                        className="form-control"
                        id="numberOfRooms"
                        name="numberOfRooms"
                        value={formData.numberOfRooms}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        required
                    />
                    <label htmlFor="totalPrice" className="form-label">
                        Estimated Total Price (USD)
                    </label>
                    <input
                        type="number"
                        className="form-control"
                        id="totalPrice"
                        name="totalPrice"
                        value={formData.totalPrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                    />
                    <label htmlFor="specialRequests" className="form-label">
                        Special Requests
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="specialRequests"
                        name="specialRequests"
                        value={formData.specialRequests}
                        onChange={handleInputChange}
                        placeholder="Any special requests or notes..."
                    />
                </div>

                <div className="d-grid">
                    {submitStatus !== "idle" && (
                        <div className={`alert ${submitStatus === "success" ? "alert-success" : "alert-danger"} mb-3`}>
                            {submitMessage}
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                    aria-hidden="true"
                                ></span>
                                Sending Booking Request...
                            </>
                        ) : (
                            "Send Booking Request"
                        )}
                    </button>{" "}
                    <small className="text-muted">
                        By submitting this form, you agree to our terms and conditions. We will contact you within 24
                        hours to confirm your booking.
                    </small>
                </div>
            </form>
        </div>
    );
};

export default BookingForm;
END OF OLD BOOKING FORM */

// NEW BOOKING FORM - Compatible with POST API
import React, { useState, useEffect } from "react";
import { BookingResponse, AvailabilityResponse } from "../../types/search";
import { submitBooking } from "../../utils/api";

interface BookingFormProps {
    hotelId: number;
    hotelName: string;
    onBookingSuccess?: (response: BookingResponse) => void;
    onBookingError?: (error: string) => void;
    className?: string;
    // Optional props that might come from availability check
    sessionId?: string;
    rateIndex?: string;
    startDate?: string;
    endDate?: string;
    availabilityResult?: AvailabilityResponse | null;
}

interface RoomData {
    adults: number;
    children: Array<{ age: number }>;
}

interface CreditCardData {
    number: string;
    name: string;
    cvc: string;
    brand_name: string;
    exp_month: string;
    exp_year: string;
}

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
    availabilityResult = null,
}) => {
    const [formData, setFormData] = useState({
        startDate: startDate || "",
        endDate: endDate || "",
        sessionId: sessionId || "",
        rateIndex: rateIndex || "",
        guestName: "",
        guestEmail: "",
        creditCard: {
            number: "",
            name: "",
            cvc: "",
            brand_name: "VISA",
            exp_month: "",
            exp_year: "",
        },
        rooms: [{ adults: 1, children: [{ age: 0 }] }] as RoomData[],
    });

    // Update form data when props change (e.g., after availability check)
    useEffect(() => {
        if (sessionId) {
            setFormData(prev => ({ ...prev, sessionId }));
        }
        if (availabilityResult?.session_id) {
            setFormData(prev => ({ ...prev, sessionId: availabilityResult.session_id || "" }));
        }
        // Set rateIndex from availability result if available, otherwise use prop
        if (availabilityResult?.room_types && availabilityResult.room_types.length > 0) {
            // Use rate_index from the first room type's first rate if available
            const firstRoomType = availabilityResult.room_types[0];
            let defaultRateIndex = rateIndex;
            
            // Only set default if we don't already have a valid rateIndex
            if (!defaultRateIndex || defaultRateIndex.trim() === "") {
                // Try to get rate_index from first rate in first room type
                if (firstRoomType?.rates && firstRoomType.rates.length > 0) {
                    const firstRate = firstRoomType.rates[0];
                    // Ensure rate_index exists and is valid (including 0, which is a valid rate_index)
                    if (firstRate.rate_index !== undefined && firstRate.rate_index !== null) {
                        // Handle both string and number types, including 0
                        const rateIndexValue = firstRate.rate_index;
                        if (typeof rateIndexValue === 'number' || (typeof rateIndexValue === 'string' && rateIndexValue.trim() !== '')) {
                            defaultRateIndex = String(rateIndexValue);
                        }
                    }
                }
                
                // Fallback to legacy rate_index field if still not set
                if ((!defaultRateIndex || defaultRateIndex.trim() === "") && firstRoomType?.rate_index !== undefined && firstRoomType?.rate_index !== null) {
                    const rateIndexValue = firstRoomType.rate_index;
                    if (typeof rateIndexValue === 'number' || (typeof rateIndexValue === 'string' && rateIndexValue.trim() !== '')) {
                        defaultRateIndex = String(rateIndexValue);
                    }
                }
            }
            
            // Only update if we have a valid rateIndex (including "0")
            if (defaultRateIndex !== null && defaultRateIndex !== undefined && defaultRateIndex.trim() !== "") {
                setFormData(prev => ({ ...prev, rateIndex: defaultRateIndex }));
            }
        } else if (rateIndex && rateIndex.trim() !== "") {
            setFormData(prev => ({ ...prev, rateIndex }));
        }
        if (startDate) {
            setFormData(prev => ({ ...prev, startDate }));
        }
        if (endDate) {
            setFormData(prev => ({ ...prev, endDate }));
        }
    }, [sessionId, rateIndex, startDate, endDate, availabilityResult]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
    const [submitMessage, setSubmitMessage] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name.startsWith("creditCard.")) {
            const field = name.split(".")[1];
            setFormData((prev) => ({
                ...prev,
                creditCard: {
                    ...prev.creditCard,
                    [field]: value,
                },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleRoomChange = (
        roomIndex: number,
        field: "adults" | "children",
        value: number | Array<{ age: number }>
    ) => {
        setFormData((prev) => {
            const newRooms = [...prev.rooms];
            if (field === "adults") {
                newRooms[roomIndex] = {
                    ...newRooms[roomIndex],
                    adults: value as number,
                };
            } else {
                newRooms[roomIndex] = {
                    ...newRooms[roomIndex],
                    children: value as Array<{ age: number }>,
                };
            }
            return {
                ...prev,
                rooms: newRooms,
            };
        });
    };

    const addChild = (roomIndex: number) => {
        setFormData((prev) => {
            const newRooms = [...prev.rooms];
            newRooms[roomIndex] = {
                ...newRooms[roomIndex],
                children: [...newRooms[roomIndex].children, { age: 0 }],
            };
            return {
                ...prev,
                rooms: newRooms,
            };
        });
    };

    const removeChild = (roomIndex: number, childIndex: number) => {
        setFormData((prev) => {
            const newRooms = [...prev.rooms];
            newRooms[roomIndex] = {
                ...newRooms[roomIndex],
                children: newRooms[roomIndex].children.filter((_, idx) => idx !== childIndex),
            };
            return {
                ...prev,
                rooms: newRooms,
            };
        });
    };

    const updateChildAge = (roomIndex: number, childIndex: number, age: number) => {
        setFormData((prev) => {
            const newRooms = [...prev.rooms];
            newRooms[roomIndex] = {
                ...newRooms[roomIndex],
                children: newRooms[roomIndex].children.map((child, idx) =>
                    idx === childIndex ? { age } : child
                ),
            };
            return {
                ...prev,
                rooms: newRooms,
            };
        });
    };

    const addRoom = () => {
        setFormData((prev) => ({
            ...prev,
            rooms: [...prev.rooms, { adults: 1, children: [] }],
        }));
    };

    const removeRoom = (roomIndex: number) => {
        if (formData.rooms.length > 1) {
            setFormData((prev) => ({
                ...prev,
                rooms: prev.rooms.filter((_, idx) => idx !== roomIndex),
            }));
        }
    };

    const validateForm = (): boolean => {
        if (!formData.startDate) {
            setSubmitMessage("Please select check-in date");
            return false;
        }
        if (!formData.endDate) {
            setSubmitMessage("Please select check-out date");
            return false;
        }
        if (formData.startDate >= formData.endDate) {
            setSubmitMessage("Check-out date must be after check-in date");
            return false;
        }
        if (!formData.sessionId || !formData.sessionId.trim()) {
            setSubmitMessage("Session ID is required. Please check availability first to get a valid session ID.");
            return false;
        }
        if (!formData.rateIndex || !formData.rateIndex.trim()) {
            setSubmitMessage("Rate Index is required. Please select a valid room type and rate from the availability check.");
            return false;
        }
        
        // Validate that the selected rateIndex exists in the availability result
        if (availabilityResult?.room_types && availabilityResult.room_types.length > 0) {
            const validRateIndexes: string[] = [];
            
            availabilityResult.room_types.forEach(roomType => {
                if (roomType.rates && roomType.rates.length > 0) {
                    roomType.rates.forEach(rate => {
                        // Handle both number and string types, including 0
                        if (rate.rate_index !== undefined && rate.rate_index !== null) {
                            const rateIndexValue = rate.rate_index;
                            if (typeof rateIndexValue === 'number' || (typeof rateIndexValue === 'string' && rateIndexValue.trim() !== '')) {
                                validRateIndexes.push(String(rateIndexValue));
                            }
                        }
                    });
                } else if (roomType.rate_index !== undefined && roomType.rate_index !== null) {
                    const rateIndexValue = roomType.rate_index;
                    if (typeof rateIndexValue === 'number' || (typeof rateIndexValue === 'string' && rateIndexValue.trim() !== '')) {
                        validRateIndexes.push(String(rateIndexValue));
                    }
                }
            });
            
            if (validRateIndexes.length > 0 && !validRateIndexes.includes(formData.rateIndex.trim())) {
                setSubmitMessage("The selected rate index is not valid for this session. Please check availability again and select a valid rate.");
                return false;
            }
        }
        if (!formData.guestName.trim()) {
            setSubmitMessage("Please enter your name");
            return false;
        }
        if (!formData.guestEmail.trim()) {
            setSubmitMessage("Please enter your email");
            return false;
        }
        if (!formData.creditCard.number.trim()) {
            setSubmitMessage("Please enter credit card number");
            return false;
        }
        if (!formData.creditCard.name.trim()) {
            setSubmitMessage("Please enter cardholder name");
            return false;
        }
        if (!formData.creditCard.cvc.trim()) {
            setSubmitMessage("Please enter CVC");
            return false;
        }
        if (!formData.creditCard.exp_month) {
            setSubmitMessage("Please select expiration month");
            return false;
        }
        if (!formData.creditCard.exp_year) {
            setSubmitMessage("Please enter expiration year");
            return false;
        }
        if (formData.rooms.length === 0) {
            setSubmitMessage("At least one room is required");
            return false;
        }
        for (let i = 0; i < formData.rooms.length; i++) {
            if (formData.rooms[i].adults < 1) {
                setSubmitMessage(`Room ${i + 1} must have at least 1 adult`);
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            setSubmitStatus("error");
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus("idle");
        setSubmitMessage("");

        try {
            const response = await submitBooking({
                hotelId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                sessionId: formData.sessionId,
                rateIndex: formData.rateIndex,
                guestName: formData.guestName,
                guestEmail: formData.guestEmail,
                creditCard: formData.creditCard,
                rooms: formData.rooms,
            });

            if (response.success) {
                setSubmitStatus("success");
                setSubmitMessage(response.message || "Booking submitted successfully!");
                onBookingSuccess?.(response);

                // Reset form after successful submission
                setFormData({
                    startDate: "",
                    endDate: "",
                    sessionId: "",
                    rateIndex: "",
                    guestName: "",
                    guestEmail: "",
                    creditCard: {
                        number: "",
                        name: "",
                        cvc: "",
                        brand_name: "VISA",
                        exp_month: "",
                        exp_year: "",
                    },
                    rooms: [{ adults: 1, children: [] }],
                });
            } else {
                setSubmitStatus("error");
                setSubmitMessage(response.message || "Booking failed. Please try again.");
                onBookingError?.(response.message || "Booking failed");
            }
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
            
            // Check if it's a session-related error
            if (errorMessage.includes('session') && (errorMessage.includes('expired') || errorMessage.includes('invalid'))) {
                // Clear the session ID to force user to check availability again
                setFormData(prev => ({ ...prev, sessionId: "", rateIndex: "" }));
                errorMessage = "The session has expired. Please check availability again above to get a new session ID, then try submitting your booking again.";
            }
            
            // Check if it's a rate_index validation error
            if (errorMessage.includes('rate_index') || errorMessage.includes('rateIndex') || errorMessage.includes('rate index')) {
                // Clear the rateIndex to force user to check availability again
                setFormData(prev => ({ ...prev, rateIndex: "", sessionId: "" }));
                errorMessage = "The rate index is invalid or the session has expired. Please check availability again above to get a new session ID and select a valid rate, then try submitting your booking again.";
            }
            
            setSubmitStatus("error");
            setSubmitMessage(errorMessage);
            onBookingError?.(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`global-form ${className}`}>
            <div className="text-center">
                <h2>Book Your Stay</h2>
                <p className="text-muted mb-0">Hotel: {hotelName}</p>
            </div>
            <form className="form" onSubmit={handleSubmit}>
                <div className="form-column">
                    <label htmlFor="startDate" className="form-label">
                        Check-in Date *
                    </label>
                    <input
                        type="date"
                        className="form-control"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split("T")[0]}
                        required
                    />
                    <label htmlFor="endDate" className="form-label">
                        Check-out Date *
                    </label>
                    <input
                        type="date"
                        className="form-control"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        min={formData.startDate || new Date().toISOString().split("T")[0]}
                        required
                    />
                    <label htmlFor="sessionId" className="form-label">
                        Session ID *
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="sessionId"
                        name="sessionId"
                        value={formData.sessionId}
                        onChange={handleInputChange}
                        placeholder={formData.sessionId ? "Session ID from availability check" : "Please check availability first to get a session ID"}
                        required
                    />
                    {!formData.sessionId && (
                        <div className="alert alert-warning mt-2">
                            <i className="fa fa-exclamation-triangle me-1"></i>
                            <strong>Session ID required:</strong> Please check availability above first. The session ID will be automatically filled. If your session has expired, please check availability again.
                        </div>
                    )}
                    <label htmlFor="rateIndex" className="form-label">
                        Room Type / Rate Index *
                    </label>
                    {availabilityResult?.room_types && availabilityResult.room_types.length > 0 ? (
                        <select
                            className="form-select"
                            id="rateIndex"
                            name="rateIndex"
                            value={formData.rateIndex}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select a room type and rate</option>
                            {availabilityResult.room_types.flatMap((roomType, roomIndex) => {
                                const roomName = roomType.name || `Room Type ${roomIndex + 1}`;
                                
                                // If room type has rates array, show each rate as an option
                                if (roomType.rates && roomType.rates.length > 0) {
                                    return roomType.rates
                                        .filter(rate => {
                                            // Allow rate_index to be 0 (which is a valid rate_index)
                                            if (rate.rate_index === undefined || rate.rate_index === null) {
                                                return false;
                                            }
                                            // Allow numbers (including 0) and non-empty strings
                                            if (typeof rate.rate_index === 'number') {
                                                return true; // 0 is valid
                                            }
                                            if (typeof rate.rate_index === 'string') {
                                                return rate.rate_index.trim() !== '';
                                            }
                                            return false;
                                        })
                                        .map((rate, rateIndex) => {
                                            const rateValue = rate.rate_in_requested_currency ?? rate.rate ?? rate.total_to_book_in_requested_currency ?? rate.total_to_book;
                                            const currency = rate.requested_currency_code ?? rate.currency_code ?? availabilityResult.default_currency ?? '';
                                            const rateDisplay = rateValue !== undefined && rateValue !== null 
                                                ? `${currency} ${typeof rateValue === 'number' ? rateValue.toLocaleString() : rateValue}` 
                                                : 'Price not available';
                                            const rateTitle = rate.title || 'Standard Rate';
                                            const optionLabel = `${roomName} - ${rateTitle} (${rateDisplay})`;
                                            
                                            return (
                                                <option key={`${roomIndex}-${rateIndex}`} value={String(rate.rate_index)}>
                                                    {optionLabel}
                                                </option>
                                            );
                                        });
                                }
                                
                                // Fallback: if no rates array, use legacy rate field or rate_index
                                // Only include if rate_index is valid (including 0)
                                if (roomType.rate_index === undefined || roomType.rate_index === null) {
                                    return []; // Don't show invalid options
                                }
                                // Allow 0 as a valid rate_index
                                if (typeof roomType.rate_index === 'string' && roomType.rate_index.trim() === '') {
                                    return []; // Don't show empty string options
                                }
                                
                                const rateValue = typeof roomType.rate === 'object' 
                                    ? roomType.rate?.rate_in_requested_currency ?? roomType.rate?.rate ?? roomType.rate?.total_to_book_in_requested_currency ?? roomType.rate?.total_to_book
                                    : roomType.rate;
                                const currency = typeof roomType.rate === 'object'
                                    ? roomType.rate?.requested_currency_code ?? roomType.rate?.currency_code ?? roomType.currency
                                    : roomType.currency ?? availabilityResult.default_currency ?? '';
                                const rateDisplay = rateValue ? `${currency} ${rateValue}` : 'Price not available';
                                
                                // Use rate_index from roomType (already validated above)
                                const rateIndexValue = String(roomType.rate_index);
                                
                                return (
                                    <option key={roomIndex} value={rateIndexValue}>
                                        {roomName} - {rateDisplay}
                                    </option>
                                );
                            })}
                        </select>
                    ) : (
                        <input
                            type="text"
                            className="form-control"
                            id="rateIndex"
                            name="rateIndex"
                            value={formData.rateIndex}
                            onChange={handleInputChange}
                            placeholder="Enter rate index (check availability first)"
                            required
                        />
                    )}
                    {!availabilityResult && (
                        <div className="alert alert-warning mt-2">
                            <i className="fa fa-exclamation-triangle me-1"></i>
                            <strong>Rate Index required:</strong> Please check availability above first to see available room types and rates.
                        </div>
                    )}
                </div>

                <div className="form-column">
                    <label htmlFor="guestName" className="form-label">
                        Guest Name *
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="guestName"
                        name="guestName"
                        value={formData.guestName}
                        onChange={handleInputChange}
                        required
                    />
                    <label htmlFor="guestEmail" className="form-label">
                        Guest Email *
                    </label>
                    <input
                        type="email"
                        className="form-control"
                        id="guestEmail"
                        name="guestEmail"
                        value={formData.guestEmail}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-column">
                    <h5 className="mt-3 mb-3">Credit Card Information *</h5>
                    <label htmlFor="creditCard.number" className="form-label">
                        Card Number *
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="creditCard.number"
                        name="creditCard.number"
                        value={formData.creditCard.number}
                        onChange={handleInputChange}
                        placeholder="1234 1234 1234 1234"
                        maxLength={19}
                        required
                    />
                    <label htmlFor="creditCard.name" className="form-label">
                        Cardholder Name *
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="creditCard.name"
                        name="creditCard.name"
                        value={formData.creditCard.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        required
                    />
                    <div className="row">
                        <div className="col-md-4">
                            <label htmlFor="creditCard.cvc" className="form-label">
                                CVC *
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="creditCard.cvc"
                                name="creditCard.cvc"
                                value={formData.creditCard.cvc}
                                onChange={handleInputChange}
                                placeholder="123"
                                maxLength={4}
                                required
                            />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="creditCard.brand_name" className="form-label">
                                Card Brand *
                            </label>
                            <select
                                className="form-select"
                                id="creditCard.brand_name"
                                name="creditCard.brand_name"
                                value={formData.creditCard.brand_name}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="VISA">VISA</option>
                                <option value="MASTERCARD">MASTERCARD</option>
                                <option value="AMEX">AMEX</option>
                                <option value="DISCOVER">DISCOVER</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label htmlFor="creditCard.exp_month" className="form-label">
                                Month *
                            </label>
                            <select
                                className="form-select"
                                id="creditCard.exp_month"
                                name="creditCard.exp_month"
                                value={formData.creditCard.exp_month}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">MM</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                    <option key={month} value={month.toString().padStart(2, "0")}>
                                        {month.toString().padStart(2, "0")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label htmlFor="creditCard.exp_year" className="form-label">
                                Year *
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="creditCard.exp_year"
                                name="creditCard.exp_year"
                                value={formData.creditCard.exp_year}
                                onChange={handleInputChange}
                                placeholder="2030"
                                maxLength={4}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="form-column" style={{ gridColumn: 'span 2' }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mt-3 mb-0">Rooms *</h5>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={addRoom}
                        >
                            + Add Room
                        </button>
                    </div>
                    {formData.rooms.map((room, roomIndex) => (
                        <div key={roomIndex} style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid rgba(0, 0, 0, 0.1)', backgroundColor: '#fff' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                {roomIndex === 0 ? (
                                    <h6 className="mb-0" style={{ fontSize: '18px', fontWeight: '500' }}>Room {roomIndex + 1}</h6>
                                ) : (
                                    <h6 className="mb-0" style={{ fontSize: '18px', fontWeight: '500', color: '#666' }}>ROOM {roomIndex + 1}</h6>
                                )}
                                {formData.rooms.length > 1 && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => removeRoom(roomIndex)}
                                        style={{ fontSize: '14px', padding: '0.25rem 0.75rem' }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <label className="form-label" style={{ marginTop: '0' }}>Adults *</label>
                            <input
                                type="number"
                                className="form-control mb-3"
                                value={room.adults}
                                onChange={(e) =>
                                    handleRoomChange(roomIndex, "adults", parseInt(e.target.value) || 1)
                                }
                                min="1"
                                required
                            />
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label mb-0">Children</label>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => addChild(roomIndex)}
                                    style={{ fontSize: '14px', padding: '0.25rem 0.75rem' }}
                                >
                                    + Add Child
                                </button>
                            </div>
                            {room.children.map((child, childIndex) => (
                                <div key={childIndex} className="d-flex align-items-center mb-2">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Age"
                                        value={child.age || ""}
                                        onChange={(e) =>
                                            updateChildAge(roomIndex, childIndex, parseInt(e.target.value) || 0)
                                        }
                                        min="0"
                                        max="17"
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => removeChild(roomIndex, childIndex)}
                                        style={{ fontSize: '14px', padding: '0.25rem 0.75rem' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="d-grid" style={{ marginTop: '2rem' }}>
                    {submitStatus !== "idle" && (
                        <div className={`alert ${submitStatus === "success" ? "alert-success" : "alert-danger"} mb-3`}>
                            {submitMessage}
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                    aria-hidden="true"
                                ></span>
                                Submitting Booking...
                            </>
                        ) : (
                            "Submit Booking"
                        )}
                    </button>
                    <small className="text-muted mt-2">
                        By submitting this form, you agree to our terms and conditions. Your booking will be processed
                        immediately.
                    </small>
                </div>
            </form>
        </div>
    );
};

export default BookingForm;
