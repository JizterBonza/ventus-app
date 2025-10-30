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
