import React, { useState } from "react";
import { AvailabilityParams, AvailabilityResponse, RateInfo } from "../../types/search";
import { checkHotelAvailability } from "../../utils/api";

interface AvailabilityResultWithFormData extends AvailabilityResponse {
    formData?: {
        start_date: string;
        end_date: string;
        adults: number;
        children: Array<{ age: number }>;
    };
}

interface CheckAvailabilityProps {
    hotelId: number;
    hotelName: string;
    className?: string;
    onAvailabilityResult?: (result: AvailabilityResultWithFormData) => void;
}

interface ChildAge {
    age: number;
}

const CheckAvailability: React.FC<CheckAvailabilityProps> = ({
    hotelId,
    hotelName,
    className = "",
    onAvailabilityResult,
}) => {
    const [formData, setFormData] = useState({
        start_date: "",
        end_date: "",
        currency: "PHP",
        adults: 2,
        children: [] as ChildAge[],
    });

    const [isChecking, setIsChecking] = useState(false);
    const [availabilityResult, setAvailabilityResult] = useState<AvailabilityResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "adults" ? parseInt(value) || 0 : value,
        }));
    };

    const handleChildAgeChange = (index: number, age: number) => {
        setFormData((prev) => {
            const newChildren = [...prev.children];
            newChildren[index] = { age };
            return {
                ...prev,
                children: newChildren,
            };
        });
    };

    const addChild = () => {
        setFormData((prev) => ({
            ...prev,
            children: [...prev.children, { age: 5 }],
        }));
    };

    const removeChild = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            children: prev.children.filter((_, i) => i !== index),
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

        try {
            const params: AvailabilityParams = {
                hotel_id: hotelId,
                start_date: formData.start_date,
                end_date: formData.end_date,
                currency: formData.currency,
                rooms: [
                    {
                        adults: formData.adults,
                        children: formData.children.length > 0 ? formData.children : undefined,
                    },
                ],
            };

            const results = await checkHotelAvailability(params);
            
            if (results && results.length > 0) {
                const result = results[0];
                setAvailabilityResult(result);
                // Pass the result with form data to parent component
                const resultWithFormData: AvailabilityResultWithFormData = {
                    ...result,
                    formData: {
                        start_date: formData.start_date,
                        end_date: formData.end_date,
                        adults: formData.adults,
                        children: formData.children,
                    },
                };
                onAvailabilityResult?.(resultWithFormData);
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

    const getMinDate = () => {
        return new Date().toISOString().split("T")[0];
    };

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
                        <div className="form-column-inner">
                        <label className="form-label">
                            Children (Optional)
                        </label>
                        <div className="children-inputs">
                            {formData.children.map((child, index) => (
                                <div key={index} className="d-flex align-items-center mb-2">
                                    <label className="me-2" style={{ minWidth: "80px" }}>
                                        Child {index + 1} Age:
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control me-2"
                                        value={child.age}
                                        onChange={(e) => handleChildAgeChange(index, parseInt(e.target.value) || 0)}
                                        min="0"
                                        max="17"
                                        style={{ maxWidth: "100px" }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => removeChild(index)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={addChild}
                            >
                                + Add Child
                            </button>
                        </div>
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

                    {availabilityResult.lowest_rate !== null && (
                        <div className="card mt-3">
                            <div className="card-body" style={{ color: '#fff' }}>
                                <h5 className="card-title" style={{ color: '#fff' }}>Pricing</h5>
                                <p className="card-text" style={{ color: '#fff' }}>
                                    <strong>Lowest Rate:</strong> {formatRate(availabilityResult.lowest_rate, availabilityResult.default_currency || undefined, formData.currency) || 'N/A'}
                                </p>
                            </div>
                        </div>
                    )}

                    {availabilityResult.room_types && availabilityResult.room_types.length > 0 && (
                        <div className="card mt-3">
                            <div className="card-body" style={{ color: '#fff' }}>
                                <h5 className="card-title" style={{ color: '#fff' }}>Available Room Types</h5>
                                <div className="room-types-list">
                                    {availabilityResult.room_types.map((roomType, index) => {
                                        const formattedRate = formatRate(roomType.rate, roomType.currency, formData.currency);
                                        return (
                                            <div key={index} className="room-type-item mb-3 p-3 border rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}>
                                                {roomType.name && (
                                                    <h6 className="mb-2" style={{ color: '#fff' }}>{roomType.name}</h6>
                                                )}
                                                {roomType.description && (
                                                    <p className="small mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{roomType.description}</p>
                                                )}
                                                <div className="d-flex justify-content-between align-items-center">
                                                    {roomType.max_occupancy && (
                                                        <span className="badge bg-secondary me-2">
                                                            Max Occupancy: {roomType.max_occupancy}
                                                        </span>
                                                    )}
                                                    {formattedRate && (
                                                        <strong style={{ color: '#fff' }}>
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


