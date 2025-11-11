import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSearch } from "../../hooks/useSearch";
import { SearchParams } from "../../types/search";

declare const $: any;

interface SearchBarNewProps {
    onSearch?: () => void; // Optional callback after search completes
}

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 30) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/`;
};

const getCookie = (name: string): string | null => {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
    }
    return null;
};

const COOKIE_KEYS = {
    CHECK_IN: 'ventus_check_in',
    CHECK_OUT: 'ventus_check_out',
    GUESTS: 'ventus_guests'
};

const SearchBarNew: React.FC<SearchBarNewProps> = ({ onSearch }) => {
    const [urlSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { searchByQuery, searchAdvanced, loading } = useSearch();
    
    const [searchParams, setSearchParams] = useState({
        location: "",
        priceRange: "all",
        rating: "all",
        sortBy: "recommended",
    });
    // Load values from cookies on mount
    const [checkInDate, setCheckInDate] = useState(() => getCookie(COOKIE_KEYS.CHECK_IN) || "");
    const [checkOutDate, setCheckOutDate] = useState(() => getCookie(COOKIE_KEYS.CHECK_OUT) || "");
    const [guests, setGuests] = useState(() => getCookie(COOKIE_KEYS.GUESTS) || "2");
    const selectingCheckInRef = useRef(true);
    const checkInDateRef = useRef("");
    const checkOutDateRef = useRef("");

    // Keep refs in sync with state
    useEffect(() => {
        checkInDateRef.current = checkInDate;
    }, [checkInDate]);

    useEffect(() => {
        checkOutDateRef.current = checkOutDate;
    }, [checkOutDate]);

    // Save to cookies when values change
    useEffect(() => {
        if (checkInDate) {
            setCookie(COOKIE_KEYS.CHECK_IN, checkInDate, 30);
        }
    }, [checkInDate]);

    useEffect(() => {
        if (checkOutDate) {
            setCookie(COOKIE_KEYS.CHECK_OUT, checkOutDate, 30);
        }
    }, [checkOutDate]);

    useEffect(() => {
        if (guests) {
            setCookie(COOKIE_KEYS.GUESTS, guests, 30);
        }
    }, [guests]);

    // Handle URL parameters from home page and load from cookies
    useEffect(() => {
        const location = urlSearchParams.get("location");
        const urlCheckIn = urlSearchParams.get("checkIn");
        const urlCheckOut = urlSearchParams.get("checkOut");
        const urlGuests = urlSearchParams.get("guests");

        if (location) {
            setSearchParams((prev) => ({
                ...prev,
                location: location || "",
            }));

            // Auto-search for the location
            searchByQuery(location, 20);
        }

        // Load dates and guests from URL params if available, otherwise use cookies
        if (urlCheckIn) {
            setCheckInDate(urlCheckIn);
        } else {
            const cookieCheckIn = getCookie(COOKIE_KEYS.CHECK_IN);
            if (cookieCheckIn) {
                setCheckInDate(cookieCheckIn);
            }
        }

        if (urlCheckOut) {
            setCheckOutDate(urlCheckOut);
        } else {
            const cookieCheckOut = getCookie(COOKIE_KEYS.CHECK_OUT);
            if (cookieCheckOut) {
                setCheckOutDate(cookieCheckOut);
            }
        }

        if (urlGuests) {
            setGuests(urlGuests);
        } else {
            const cookieGuests = getCookie(COOKIE_KEYS.GUESTS);
            if (cookieGuests) {
                setGuests(cookieGuests);
            }
        }
    }, [urlSearchParams, searchByQuery]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        const searchQuery = searchParams.location || "hotels";

        // Build URL search parameters
        const urlParams = new URLSearchParams();
        if (searchParams.location) {
            urlParams.set("location", searchParams.location);
        }
        if (searchParams.priceRange !== "all") {
            urlParams.set("priceRange", searchParams.priceRange);
        }
        if (searchParams.rating !== "all") {
            urlParams.set("rating", searchParams.rating);
        }
        if (searchParams.sortBy !== "recommended") {
            urlParams.set("sortBy", searchParams.sortBy);
        }
        if (checkInDate) {
            urlParams.set("checkIn", checkInDate);
        }
        if (checkOutDate) {
            urlParams.set("checkOut", checkOutDate);
        }
        if (guests !== "2") {
            urlParams.set("guests", guests);
        }

        // Navigate to search results page with search parameters
        const searchUrl = `/search-results?${urlParams.toString()}`;
        navigate(searchUrl);

        const searchParamsForAPI: SearchParams = {
            query: searchQuery,
            limit: 20,
            location: searchParams.location || undefined,
            priceRange: searchParams.priceRange !== "all" ? searchParams.priceRange : undefined,
            rating: searchParams.rating !== "all" ? searchParams.rating : undefined,
            sortBy: searchParams.sortBy !== "recommended" ? searchParams.sortBy : undefined,
        };

        await searchAdvanced(searchParamsForAPI);
        
        // Call optional callback after search completes
        if (onSearch) {
            onSearch();
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setSearchParams((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Datepicker initialization for date range
    useEffect(() => {
        if (typeof $ !== "undefined" && $.fn.datepicker) {
            const $dateRangeInput = $(".date-range-input");

            if ($dateRangeInput.length > 0 && !$dateRangeInput.hasClass("hasDatepicker")) {
                $dateRangeInput.datepicker({
                    dateFormat: "mm/dd/yy",
                    minDate: 0,
                    beforeShow: function () {
                        // Reset to check-in selection if both dates are cleared
                        if (!checkInDateRef.current && !checkOutDateRef.current) {
                            selectingCheckInRef.current = true;
                            $(this).datepicker("option", "minDate", 0);
                        } else if (checkInDateRef.current && !checkOutDateRef.current) {
                            selectingCheckInRef.current = false;
                            $(this).datepicker("option", "minDate", checkInDateRef.current);
                        } else if (checkInDateRef.current && checkOutDateRef.current) {
                            // Both dates selected, allow reselection
                            selectingCheckInRef.current = true;
                            $(this).datepicker("option", "minDate", 0);
                        }
                    },
                    onSelect: function (dateText: string, inst: any) {
                        if (selectingCheckInRef.current) {
                            setCheckInDate(dateText);
                            setCheckOutDate("");
                            selectingCheckInRef.current = false;
                            // Save to cookie
                            setCookie(COOKIE_KEYS.CHECK_IN, dateText, 30);
                            // Update minDate for check-out selection
                            $(this).datepicker("option", "minDate", dateText);
                            // Reopen datepicker for check-out selection
                            setTimeout(() => {
                                $dateRangeInput.datepicker("show");
                            }, 10);
                        } else {
                            setCheckOutDate(dateText);
                            selectingCheckInRef.current = true;
                            // Save to cookie
                            setCookie(COOKIE_KEYS.CHECK_OUT, dateText, 30);
                            // Close datepicker after both dates are selected
                            $dateRangeInput.datepicker("hide");
                        }
                    },
                });
            }

            return () => {
                if ($dateRangeInput.hasClass("hasDatepicker")) {
                    $dateRangeInput.datepicker("destroy");
                }
            };
        }
    }, []); // Only initialize once

    return (
        <section className="search-form-section">
            <div className="container">
                <div className="booking-inner clearfix">
                    <form onSubmit={handleSearch} className="form1 clearfix modern-search-form">
                        <div className="col1 c1 search-field" style={{ width: "40%" }}>
                            <div className="input1_wrapper">
                                <label>Location</label>
                                <div className="input1_inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
<path d="M17.5824 16.6719L12.6399 11.7294C15.1762 8.67284 14.786 4.18553 11.7294 1.64923C8.67284 -0.887071 4.18553 -0.431837 1.64923 2.5597C-0.887071 5.55124 -0.431837 10.1686 2.5597 12.6399C5.22607 14.851 9.06304 14.851 11.7294 12.6399L16.6719 17.5824L17.5824 16.6719ZM1.32406 7.17707C1.32406 3.9254 3.9254 1.32406 7.17707 1.32406C10.4287 1.32406 13.0301 3.9254 13.0301 7.17707C13.0301 10.4287 10.4287 13.0301 7.17707 13.0301C3.9254 13.0301 1.32406 10.4287 1.32406 7.17707Z" fill="black"/>
</svg>
                                    <input
                                        type="text"
                                        className="form-control input"
                                        placeholder="Search a hotel or destination"
                                        value={searchParams.location}
                                        onChange={(e) => handleInputChange("location", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col2 c2 date-field" style={{ width: "30%" }}>
                            <div className="input1_wrapper">
                                <label>Date</label>
                                <div className="input1_inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="19" viewBox="0 0 21 19" fill="none">
<path d="M16.3194 1.49297H15.8616V0.538078C15.8616 0.362225 15.6909 0.21978 15.4801 0.21978C15.2693 0.21978 15.0986 0.362218 15.0986 0.538078V1.49297H5.94249V0.538078C5.94249 0.362225 5.77176 0.21978 5.56098 0.21978C5.3502 0.21978 5.17948 0.362218 5.17948 0.538078V1.49297H4.34017C3.24716 1.49297 2.19907 1.85504 1.4263 2.49959C0.653746 3.14415 0.219788 4.01867 0.219788 4.93071V15.2436C0.219788 16.1555 0.653746 17.03 1.4263 17.6747C2.19885 18.3193 3.24701 18.6813 4.34017 18.6813H16.3192C17.4122 18.6813 18.4603 18.3193 19.2331 17.6747C20.0056 17.0301 20.4396 16.1556 20.4396 15.2436V4.93071C20.4396 4.01878 20.0056 3.14434 19.2331 2.49959C18.4605 1.85504 17.4123 1.49297 16.3192 1.49297H16.3194ZM4.34037 2.12957H5.17968V3.08446C5.17968 3.26032 5.3504 3.40276 5.56119 3.40276C5.77197 3.40276 5.94269 3.26032 5.94269 3.08446V2.12957H15.0988V3.08446C15.0988 3.26032 15.2695 3.40276 15.4803 3.40276C15.6911 3.40276 15.8618 3.26032 15.8618 3.08446V2.12957H16.3196C17.2133 2.12082 18.0726 2.41364 18.7049 2.94044C19.3362 3.46802 19.6872 4.18498 19.6767 4.93053V5.63078H0.983263V4.93053C0.972772 4.18491 1.32375 3.46795 1.95515 2.94044C2.58749 2.41366 3.44682 2.12083 4.34041 2.12957H4.34037ZM16.3194 18.0445H4.34037C3.4467 18.0532 2.58737 17.7604 1.95511 17.2336C1.32373 16.706 0.972744 15.9891 0.983222 15.2435V6.26768H19.6767V15.2435C19.6872 15.9891 19.3362 16.7061 18.7048 17.2336C18.0725 17.7604 17.2131 18.0532 16.3196 18.0445H16.3194Z" fill="black" stroke="black" stroke-width="0.43956"/>
</svg>
                                    <input
                                        type="text"
                                        className="form-control input date-range-input"
                                        placeholder="Arrival-Departure"
                                        value={checkInDate && checkOutDate ? `${checkInDate} - ${checkOutDate}` : checkInDate || checkOutDate || ""}
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col3 c3 guest-field" style={{ width: "20%" }}>
                            <div className="input1_wrapper">
                                <label>Guests</label>
                                <div className="input1_inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="19" viewBox="0 0 16 19" fill="none">
<path d="M7.91134 0C5.48352 0 3.50717 1.9543 3.50717 4.3486C3.50717 6.74213 5.4843 8.69197 7.91134 8.69197C10.3392 8.69197 12.3208 6.74213 12.3208 4.3486C12.3208 1.95507 10.3392 0 7.91134 0ZM7.91134 1.15384C9.70658 1.15384 11.1508 2.57811 11.1508 4.3486C11.1508 6.11905 9.70661 7.53813 7.91134 7.53813C6.11607 7.53813 4.67342 6.11818 4.67342 4.3486C4.67342 2.57814 6.11616 1.15384 7.91134 1.15384ZM7.91134 9.22504C3.53853 9.22504 0 12.7146 0 17.0272V17.8868C0.000731246 18.0397 0.0628864 18.1861 0.173299 18.2942C0.283717 18.4017 0.432164 18.4623 0.587914 18.4615C0.909662 18.4608 1.16998 18.2041 1.17144 17.8868V17.0272C1.17144 13.3341 4.16663 10.3789 7.91139 10.3789C11.6561 10.3789 14.6527 13.3343 14.6527 17.0272V17.8868C14.6535 18.0397 14.7156 18.1861 14.8253 18.2942C14.9357 18.4017 15.0849 18.4623 15.2399 18.4615C15.5617 18.4608 15.8227 18.2041 15.8242 17.8868V17.0272C15.8242 12.7147 12.285 9.22504 7.91206 9.22504H7.91134Z" fill="black"/>
</svg>
                                    <select
                                        className="form-control input guest-select"
                                        value={guests}
                                        onChange={(e) => {
                                            const newValue = e.target.value;
                                            setGuests(newValue);
                                            setCookie(COOKIE_KEYS.GUESTS, newValue, 30);
                                        }}
                                    >
                                        <option value="1">1 adult</option>
                                        <option value="2">2 adults</option>
                                        <option value="3">3 adults</option>
                                        <option value="4">4 adults</option>
                                        <option value="5">5 adults</option>
                                        <option value="6">6 adults</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="col4 c4 search-button" style={{ width: "20%" }}>
                            <button type="submit" className="btn-form1-submit modern-search-btn">
                                {loading ? "Searching..." : "SEARCH"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default SearchBarNew;
