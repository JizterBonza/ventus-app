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
import React, { useState, useEffect, useRef } from "react";
import { BookingResponse, AvailabilityResponse } from "../../types/search";
import { submitBooking } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";

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
    initialRooms?: Array<{ adults: number; children: Array<{ age: number }> }>;
    availabilityResult?: AvailabilityResponse | null;
}

interface RoomData {
    adults: number;
    children: Array<{ age: number }>;
}

interface PayPalPaymentData {
    orderId?: string;
    payerId?: string;
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
    initialRooms,
    availabilityResult = null,
}) => {
    const { isAuthenticated } = useAuth();
    const [formData, setFormData] = useState({
        startDate: startDate || "",
        endDate: endDate || "",
        sessionId: sessionId || "",
        rateIndex: rateIndex || "",
        guestName: "",
        guestEmail: "",
        paypalPayment: {
            orderId: undefined,
            payerId: undefined,
        } as PayPalPaymentData,
        rooms: initialRooms && initialRooms.length > 0 
            ? initialRooms.map(room => ({
                adults: room.adults,
                children: room.children && room.children.length > 0 ? room.children : []
            }))
            : [{ adults: 1, children: [] }] as RoomData[],
    });
    
    const [paypalApproved, setPaypalApproved] = useState(false);
    const paypalContainerRef = useRef<HTMLDivElement | null>(null);
    const paypalButtonsRef = useRef<any>(null);
    const isInitializingRef = useRef(false);

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
        // Update rooms if initialRooms is provided
        if (initialRooms && initialRooms.length > 0) {
            setFormData(prev => ({
                ...prev,
                rooms: initialRooms.map(room => ({
                    adults: room.adults,
                    children: room.children && room.children.length > 0 ? room.children : []
                }))
            }));
        }
    }, [sessionId, rateIndex, startDate, endDate, initialRooms, availabilityResult]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
    const [submitMessage, setSubmitMessage] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };
    
    // Calculate booking total from availability result
    const calculateBookingTotal = (): number => {
        if (!availabilityResult || !formData.rateIndex) {
            return 0;
        }
        
        // Find the selected rate
        for (const roomType of availabilityResult.room_types || []) {
            if (roomType.rates && roomType.rates.length > 0) {
                const selectedRate = roomType.rates.find(rate => String(rate.rate_index) === formData.rateIndex);
                if (selectedRate) {
                    const amount = selectedRate.total_to_book_in_requested_currency 
                        ?? selectedRate.total_to_book 
                        ?? selectedRate.rate_in_requested_currency 
                        ?? selectedRate.rate 
                        ?? 0;
                    return typeof amount === 'number' ? amount : 0;
                }
            }
            // Fallback to legacy rate_index
            if (String(roomType.rate_index) === formData.rateIndex) {
                const rateValue = typeof roomType.rate === 'object' 
                    ? roomType.rate?.total_to_book_in_requested_currency ?? roomType.rate?.total_to_book ?? roomType.rate?.rate ?? 0
                    : roomType.rate ?? 0;
                return typeof rateValue === 'number' ? rateValue : 0;
            }
        }
        return 0;
    };
    
    // PayPal button handlers
    useEffect(() => {
        const currency = availabilityResult?.default_currency || 'USD';
        
        // Only initialize if we have a rate selected and total > 0
        if (!formData.rateIndex || paypalApproved) {
            // Clear container safely
            if (paypalContainerRef.current) {
                paypalContainerRef.current.innerHTML = '';
            }
            // Clean up PayPal buttons instance
            if (paypalButtonsRef.current) {
                try {
                    paypalButtonsRef.current.close();
                } catch (e) {
                    // Ignore errors during cleanup
                }
                paypalButtonsRef.current = null;
            }
            isInitializingRef.current = false;
            return;
        }

        // Prevent multiple simultaneous initializations
        if (isInitializingRef.current) {
            return;
        }

        // Clean up any existing PayPal scripts to avoid conflicts
        const existingScripts = document.querySelectorAll('script[src*="paypal.com/sdk"]');
        existingScripts.forEach(script => {
            // Remove old scripts that don't match current currency
            const scriptSrc = (script as HTMLScriptElement).src;
            if (!scriptSrc.includes(`currency=${currency}`)) {
                script.remove();
                // Clear PayPal from window if it exists
                if ((window as any).paypal) {
                    delete (window as any).paypal;
                }
            }
        });

        // Check if PayPal SDK is already loaded with correct currency
        const checkPayPalLoaded = () => {
            if ((window as any).paypal) {
                // Small delay to ensure SDK is fully ready
                setTimeout(() => {
                    if (!isInitializingRef.current && paypalContainerRef.current) {
                        initializePayPalButton();
                    }
                }, 100);
                return true;
            }
            return false;
        };

        if (typeof window !== 'undefined') {
            // First check if already loaded
            if (checkPayPalLoaded()) {
                return;
            }

            // Check if script with correct currency is already in the DOM
            const existingScript = document.querySelector(`script[src*="paypal.com/sdk"][src*="currency=${currency}"]`);
            if (existingScript) {
                // Wait for it to load
                let attempts = 0;
                const maxAttempts = 50; // 5 seconds max
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (checkPayPalLoaded()) {
                        clearInterval(checkInterval);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        console.warn('PayPal SDK did not load, attempting dynamic load');
                        loadPayPalScript(currency);
                    }
                }, 100);
            } else {
                // No script found, load it dynamically
                loadPayPalScript(currency);
            }
        }

        // Cleanup function
        return () => {
            isInitializingRef.current = false;
            // Clean up PayPal buttons instance
            if (paypalButtonsRef.current) {
                try {
                    paypalButtonsRef.current.close();
                } catch (e) {
                    // Ignore errors during cleanup
                }
                paypalButtonsRef.current = null;
            }
            // Clear container safely
            if (paypalContainerRef.current) {
                paypalContainerRef.current.innerHTML = '';
            }
        };
    }, [formData.rateIndex, availabilityResult, paypalApproved]);

    const loadPayPalScript = (currency: string = 'USD') => {
        // Check again if PayPal is already loaded
        if ((window as any).paypal) {
            setTimeout(() => {
                if (!isInitializingRef.current && paypalContainerRef.current) {
                    initializePayPalButton();
                }
            }, 100);
            return;
        }

        // Remove any existing PayPal scripts first
        const existingScripts = document.querySelectorAll('script[src*="paypal.com/sdk"]');
        existingScripts.forEach(script => script.remove());

        const script = document.createElement('script');
        script.id = 'paypal-sdk-script-booking';
        script.src = `https://www.paypal.com/sdk/js?client-id=AfaoowvVXx5dXMEisezXWp4ZQpQm_3lRs-7YmDJc4-dDTFb529Tso9nmdCEF6P6Yn_wwnSpP_z0w10dk&currency=${currency}`;
        script.async = true;
        script.onload = () => {
            // Wait a bit for PayPal to fully initialize
            setTimeout(() => {
                if ((window as any).paypal && !isInitializingRef.current && paypalContainerRef.current) {
                    initializePayPalButton();
                } else if (!(window as any).paypal) {
                    console.error('PayPal SDK loaded but paypal object not available');
                    isInitializingRef.current = false;
                    showPayPalError('PayPal SDK failed to initialize. Please try again.');
                }
            }, 200);
        };
        script.onerror = (error) => {
            console.error('Failed to load PayPal SDK:', error);
            isInitializingRef.current = false;
            showPayPalError('Failed to load PayPal. Please check your internet connection and try again.');
        };
        document.body.appendChild(script);
    };

    const showPayPalError = (message: string) => {
        const container = paypalContainerRef.current;
        if (container && document.body.contains(container)) {
            container.innerHTML = `
                <div style="padding: 12px; background-color: #ffebee; border-radius: 6px; color: #c62828; font-size: 14px; font-family: 'Lato', sans-serif; margin-bottom: 10px;">
                    ${message}
                </div>
                <button 
                    type="button"
                    onclick="window.location.reload()"
                    style="
                        padding: 10px 20px;
                        background-color: #c4b896;
                        color: #fff;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-family: 'Lato', sans-serif;
                    "
                >
                    Retry
                </button>
            `;
        }
    };
    
    const initializePayPalButton = () => {
        if (paypalApproved || !formData.rateIndex || isInitializingRef.current) {
            return;
        }
        
        // Check if container exists and is in the DOM
        const container = paypalContainerRef.current;
        if (!container) {
            console.warn('PayPal container ref not found');
            return;
        }

        // Verify container is still in the DOM
        if (!document.body.contains(container)) {
            console.warn('PayPal container removed from DOM');
            isInitializingRef.current = false;
            return;
        }

        if (!(window as any).paypal) {
            console.warn('PayPal SDK not available');
            isInitializingRef.current = false;
            showPayPalError('PayPal SDK not loaded. Please try again.');
            return;
        }
        
        // Clean up previous buttons instance
        if (paypalButtonsRef.current) {
            try {
                paypalButtonsRef.current.close();
            } catch (e) {
                // Ignore errors during cleanup
            }
            paypalButtonsRef.current = null;
        }
        
        // Clear existing buttons
        container.innerHTML = '';
        
        const totalAmount = calculateBookingTotal();
        if (totalAmount <= 0) {
            container.innerHTML = '<p class="text-muted">Please select a room type and rate to see payment options.</p>';
            isInitializingRef.current = false;
            return;
        }

        const currency = availabilityResult?.default_currency || 'USD';
        
        // Set initialization flag
        isInitializingRef.current = true;
        
        try {
            // Double-check container is still in DOM before rendering
            if (!document.body.contains(container)) {
                console.warn('PayPal container removed from DOM before render');
                isInitializingRef.current = false;
                return;
            }

            const buttons = (window as any).paypal.Buttons({
                createOrder: (data: any, actions: any) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: totalAmount.toFixed(2),
                                currency_code: currency
                            },
                            description: `Booking for ${hotelName}`
                        }]
                    });
                },
                onApprove: (data: any, actions: any) => {
                    return actions.order.capture().then((details: any) => {
                        console.log('PayPal payment approved:', details);
                        setFormData((prev) => ({
                            ...prev,
                            paypalPayment: {
                                orderId: details.id,
                                payerId: details.payer.payer_id,
                            },
                        }));
                        setPaypalApproved(true);
                    }).catch((error: any) => {
                        console.error('PayPal capture error:', error);
                        setSubmitStatus("error");
                        setSubmitMessage("PayPal payment capture failed. Please try again.");
                        setPaypalApproved(false);
                    });
                },
                onError: (err: any) => {
                    console.error('PayPal error:', err);
                    setSubmitStatus("error");
                    setSubmitMessage("PayPal payment failed. Please try again.");
                    setPaypalApproved(false);
                    isInitializingRef.current = false;
                },
                onCancel: () => {
                    console.log('PayPal payment cancelled');
                    setPaypalApproved(false);
                    setFormData((prev) => ({
                        ...prev,
                        paypalPayment: {
                            orderId: undefined,
                            payerId: undefined,
                        },
                    }));
                }
            });

            // Store buttons instance
            paypalButtonsRef.current = buttons;

            // Render with error handling
            buttons.render(container).then(() => {
                // Successfully rendered
                isInitializingRef.current = false;
            }).catch((error: any) => {
                console.error('PayPal button render error:', error);
                isInitializingRef.current = false;
                paypalButtonsRef.current = null;
                
                // Only show error if container still exists
                if (document.body.contains(container)) {
                    showPayPalError('Failed to load PayPal payment button. Please try again.');
                }
            });
        } catch (error) {
            console.error('Error initializing PayPal button:', error);
            isInitializingRef.current = false;
            paypalButtonsRef.current = null;
            
            // Only show error if container still exists
            if (document.body.contains(container)) {
                showPayPalError('Failed to initialize PayPal payment. Please try again.');
            }
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
        if (!paypalApproved || !formData.paypalPayment.orderId) {
            setSubmitMessage("Please complete PayPal payment");
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

        // Check if user is authenticated
        if (!isAuthenticated) {
            setSubmitStatus("error");
            setSubmitMessage("You must be logged in to make a booking. Please log in and try again.");
            return;
        }

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
                paymentMethod: {
                    type: 'paypal',
                    orderId: formData.paypalPayment.orderId,
                    payerId: formData.paypalPayment.payerId,
                },
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
                    paypalPayment: {
                        orderId: undefined,
                        payerId: undefined,
                    },
                    rooms: [{ adults: 1, children: [] }],
                });
                setPaypalApproved(false);
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
            <form className="form slim" onSubmit={handleSubmit}>
                <div className="d-grid form-row">
                    <div className="form-column">
                        <div className="form-column-inner">
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
                        </div>
                        <div className="form-column-inner">
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
                        </div>
                    </div>
                </div>

                <div className="d-grid form-row">
                    <div className="form-column">
                        <div className="form-column-inner">
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
                        </div>
                        <div className="form-column-inner">
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
                                                    const rateDisplay = isAuthenticated && rateValue !== undefined && rateValue !== null 
                                                        ? `${currency} ${typeof rateValue === 'number' ? rateValue.toLocaleString() : rateValue}` 
                                                        : isAuthenticated ? 'Price not available' : 'Login to view price';
                                                    const rateTitle = rate.title || 'Standard Rate';
                                                    const optionLabel = isAuthenticated 
                                                        ? `${roomName} - ${rateTitle} (${rateDisplay})`
                                                        : `${roomName} - ${rateTitle}`;
                                                    
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
                                        const rateDisplay = isAuthenticated && rateValue 
                                            ? `${currency} ${rateValue}` 
                                            : isAuthenticated ? 'Price not available' : 'Login to view price';
                                        
                                        // Use rate_index from roomType (already validated above)
                                        const rateIndexValue = String(roomType.rate_index);
                                        
                                        return (
                                            <option key={roomIndex} value={rateIndexValue}>
                                                {isAuthenticated ? `${roomName} - ${rateDisplay}` : `${roomName}`}
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
                    </div>
                </div>

                <div className="d-grid form-row">
                    <div className="form-column">
                        <div className="form-column-inner">
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
                        </div>
                        <div className="form-column-inner">
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
                    </div>
                </div>
                <h5 className="mt-5">Payment Method *</h5>
                <div className="d-grid form-row">
                    <div className="form-column">
                        <div className="form-column-inner">
                            <label className="form-label">PayPal Payment *</label>
                            {paypalApproved ? (
                                <div className="alert alert-success">
                                    <i className="fa fa-check-circle me-2"></i>
                                    PayPal payment approved. Order ID: {formData.paypalPayment.orderId}
                                </div>
                            ) : (
                                <div 
                                    id="paypal-button-container" 
                                    ref={paypalContainerRef}
                                    style={{ minHeight: '50px' }}
                                ></div>
                            )}
                            <small className="text-muted d-block mt-2">
                                You will be redirected to PayPal to complete your payment.
                            </small>
                        </div>
                    </div>
                </div>

                <div className="d-grid form-row rooms-section">
                    <div className="form-column">
                        <div className="form-column-inner">
                            <div className="d-flex justify-content-between align-items-center mb-3 flex-dir-col">
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
                                        <label className="form-label mb-0" style={{ minWidth: '150px' }}>Children (Age)</label>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary"
                                            onClick={() => addChild(roomIndex)}
                                            style={{ fontSize: '14px', padding: '0.25rem 0.75rem' }}
                                        >
                                         Add Child
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
                                              
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="d-grid submit-section" style={{ marginTop: '2rem' }}>
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
                    <small className="privacy text-muted mt-2">
                        By submitting this form, you agree to our terms and conditions. Your booking will be processed
                        immediately.
                    </small>
                </div>
            </form>
        </div>
    );
};

export default BookingForm;
