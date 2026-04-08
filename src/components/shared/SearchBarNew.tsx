import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSearch } from "../../hooks/useSearch";
import { SearchParams } from "../../types/search";
import { searchHotelsByQuery } from "../../utils/api";
import {
    SEARCH_SESSION_COOKIES,
    setCookie,
    getCookie,
    parseSearchDate,
    dateToStorageString,
    parseSearchRoomSlotsJson,
    legacyGuestsAndRoomsToSearchSlots,
    type SearchRoomSlot,
} from "../../utils/searchSession";
import "./SearchBar.css";

interface SearchBarNewProps {
    onSearch?: () => void;
}

interface LocationSuggestion {
    id: string;
    type: "city" | "hotel";
    title: string;
    subtitle?: string;
    value: string;
}

const parseDate = parseSearchDate;

/** Person icon path (viewBox 0 0 16 19) — shared by adults and smaller children indicator */
const GUEST_PERSON_SVG_PATH =
    "M7.91134 0C5.48352 0 3.50717 1.9543 3.50717 4.3486C3.50717 6.74213 5.4843 8.69197 7.91134 8.69197C10.3392 8.69197 12.3208 6.74213 12.3208 4.3486C12.3208 1.95507 10.3392 0 7.91134 0ZM7.91134 1.15384C9.70658 1.15384 11.1508 2.57811 11.1508 4.3486C11.1508 6.11905 9.70661 7.53813 7.91134 7.53813C6.11607 7.53813 4.67342 6.11818 4.67342 4.3486C4.67342 2.57814 6.11616 1.15384 7.91134 1.15384ZM7.91134 9.22504C3.53853 9.22504 0 12.7146 0 17.0272V17.8868C0.000731246 18.0397 0.0628864 18.1861 0.173299 18.2942C0.283717 18.4017 0.432164 18.4623 0.587914 18.4615C0.909662 18.4608 1.16998 18.2041 1.17144 17.8868V17.0272C1.17144 13.3341 4.16663 10.3789 7.91139 10.3789C11.6561 10.3789 14.6527 13.3343 14.6527 17.0272V17.8868C14.6535 18.0397 14.7156 18.1861 14.8253 18.2942C14.9357 18.4017 15.0849 18.4623 15.2399 18.4615C15.5617 18.4608 15.8227 18.2041 15.8242 17.8868V17.0272C15.8242 12.7147 12.285 9.22504 7.91206 9.22504H7.91134Z";

const formatDisplay = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
};

const toStorageStr = dateToStorageString;

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const isInRange = (d: Date, start: Date | null, end: Date | null) => {
    if (!start || !end) return false;
    return d > start && d < end;
};

interface CalendarMonthProps {
    year: number;
    month: number;
    checkIn: Date | null;
    checkOut: Date | null;
    hovered: Date | null;
    onSelect: (d: Date) => void;
    onHover: (d: Date | null) => void;
}

const CalendarMonth: React.FC<CalendarMonthProps> = ({
    year, month, checkIn, checkOut, hovered, onSelect, onHover,
}) => {
    const monthName = new Date(year, month).toLocaleString("en-GB", {
        month: "long",
        year: "numeric",
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday-first
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: (Date | null)[] = [
        ...Array(startDow).fill(null),
        ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
    ];
    // pad to full rows
    while (cells.length % 7 !== 0) cells.push(null);

    const rangeEnd = checkOut || hovered;

    return (
        <div className="le-calendar-month">
            <div className="le-cal-month-name">{monthName}</div>
            <div className="le-cal-grid">
                {DAYS.map((d) => (
                    <div key={d} className="le-cal-day-name">{d}</div>
                ))}
                {cells.map((d, i) => {
                    if (!d) return <div key={i} className="le-cal-cell empty" />;
                    const isPast = d < today;
                    const isStart = checkIn && isSameDay(d, checkIn);
                    const isEnd = checkOut && isSameDay(d, checkOut);
                    const inRange = isInRange(d, checkIn, rangeEnd);
                    const isHov = hovered && isSameDay(d, hovered);
                    let cls = "le-cal-cell";
                    if (isPast) cls += " past";
                    if (isStart) cls += " start selected";
                    if (isEnd) cls += " end selected";
                    if (inRange) cls += " in-range";
                    if (isHov && !isStart && !isEnd) cls += " hovered";
                    return (
                        <div
                            key={i}
                            className={cls}
                            onClick={() => !isPast && onSelect(d)}
                            onMouseEnter={() => !isPast && onHover(d)}
                            onMouseLeave={() => onHover(null)}
                        >
                            {d.getDate()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SearchBarNew: React.FC<SearchBarNewProps> = ({ onSearch }) => {
    const [urlSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { searchAdvanced, loading } = useSearch();

    const [location, setLocation] = useState("");
    const [checkIn, setCheckIn] = useState<Date | null>(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    });
    const [checkOut, setCheckOut] = useState<Date | null>(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d;
    });
    const [roomSlots, setRoomSlots] = useState<SearchRoomSlot[]>([{ adults: 1, children: 0 }]);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectingCheckIn, setSelectingCheckIn] = useState(true);
    const [calendarBase, setCalendarBase] = useState(() => {
        const n = new Date();
        return { year: n.getFullYear(), month: n.getMonth() };
    });
    const [hovered, setHovered] = useState<Date | null>(null);
    const [showGuestDropdown, setShowGuestDropdown] = useState(false);
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    const calendarRef = useRef<HTMLDivElement>(null);
    const guestRef = useRef<HTMLDivElement>(null);
    const locationRef = useRef<HTMLDivElement>(null);

    // Load from cookies / URL params on mount
    useEffect(() => {
        const urlLoc = urlSearchParams.get("location");
        const urlCheckIn = urlSearchParams.get("checkIn");
        const urlCheckOut = urlSearchParams.get("checkOut");
        const urlGuests = urlSearchParams.get("guests");
        const urlRooms = urlSearchParams.get("rooms");
        const urlRoomSlots = urlSearchParams.get("roomSlots");

        if (urlLoc) setLocation(urlLoc);
        const ci = parseDate(urlCheckIn || getCookie(SEARCH_SESSION_COOKIES.CHECK_IN) || "");
        const co = parseDate(urlCheckOut || getCookie(SEARCH_SESSION_COOKIES.CHECK_OUT) || "");
        if (ci) setCheckIn(ci); // only override default if a saved value exists
        if (co) setCheckOut(co);

        const fromUrl = urlRoomSlots ? parseSearchRoomSlotsJson(urlRoomSlots) : null;
        const fromCookie = parseSearchRoomSlotsJson(getCookie(SEARCH_SESSION_COOKIES.ROOM_SLOTS));
        if (fromUrl && fromUrl.length > 0) {
            setRoomSlots(fromUrl);
        } else if (fromCookie && fromCookie.length > 0) {
            setRoomSlots(fromCookie);
        } else {
            const g = parseInt(urlGuests || getCookie(SEARCH_SESSION_COOKIES.GUESTS) || "1", 10);
            const r = parseInt(urlRooms || getCookie(SEARCH_SESSION_COOKIES.ROOMS) || "1", 10);
            if (!isNaN(g) && !isNaN(r)) {
                setRoomSlots(legacyGuestsAndRoomsToSearchSlots(g, r));
            }
        }
    }, [urlSearchParams]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
                setShowCalendar(false);
            }
            if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
                setShowGuestDropdown(false);
            }
            if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const extractCityName = (hotelLocation?: string): string => {
        if (!hotelLocation) return "";
        const [city = ""] = hotelLocation.split(",");
        return city.trim();
    };

    // Debounced predictive search suggestions
    useEffect(() => {
        const q = location.trim();
        if (!q || q.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        const timer = setTimeout(async () => {
            setSuggestionsLoading(true);
            setShowSuggestions(true);
            try {
                const hotels = await searchHotelsByQuery(q, 5);

                const citySuggestions: LocationSuggestion[] = Array.from(
                    new Map(
                        hotels
                            .map((hotel) => extractCityName(hotel.location))
                            .filter(Boolean)
                            .map((city) => [
                                city.toLowerCase(),
                                {
                                    id: `city-${city.toLowerCase().replace(/\s+/g, "-")}`,
                                    type: "city" as const,
                                    title: city,
                                    subtitle: "City",
                                    value: city,
                                },
                            ])
                    ).values()
                );

                const hotelSuggestions: LocationSuggestion[] = hotels.map((hotel) => ({
                    id: `hotel-${hotel.id}`,
                    type: "hotel",
                    title: hotel.name,
                    subtitle: hotel.location,
                    value: hotel.name,
                }));

                const mergedSuggestions = [...citySuggestions, ...hotelSuggestions];
                setSuggestions(mergedSuggestions);
                setShowSuggestions(mergedSuggestions.length > 0);
            } catch {
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setSuggestionsLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [location]);

    const shiftDate = (date: Date | null, days: number): Date => {
        const d = date ? new Date(date) : new Date();
        d.setDate(d.getDate() + days);
        return d;
    };

    const handleDateSelect = (d: Date) => {
        if (selectingCheckIn) {
            setCheckIn(d);
            setCheckOut(null);
            setSelectingCheckIn(false);
            setCookie(SEARCH_SESSION_COOKIES.CHECK_IN, toStorageStr(d));
        } else {
            if (checkIn && d <= checkIn) {
                setCheckIn(d);
                setCheckOut(null);
                setCookie(SEARCH_SESSION_COOKIES.CHECK_IN, toStorageStr(d));
            } else {
                setCheckOut(d);
                setSelectingCheckIn(true);
                setShowCalendar(false);
                setCookie(SEARCH_SESSION_COOKIES.CHECK_OUT, toStorageStr(d));
            }
        }
    };

    const prevMonth = () =>
        setCalendarBase(({ year, month }) => {
            if (month === 0) return { year: year - 1, month: 11 };
            return { year, month: month - 1 };
        });

    const nextMonth = () =>
        setCalendarBase(({ year, month }) => {
            if (month === 11) return { year: year + 1, month: 0 };
            return { year, month: month + 1 };
        });

    const secondMonth = {
        year: calendarBase.month === 11 ? calendarBase.year + 1 : calendarBase.year,
        month: calendarBase.month === 11 ? 0 : calendarBase.month + 1,
    };

    const totalAdults = roomSlots.reduce((s, r) => s + r.adults, 0);
    const totalChildren = roomSlots.reduce((s, r) => s + r.children, 0);
    const roomCount = roomSlots.length;

    const MAX_SEARCH_ROOMS = 10;

    const bumpRoomAdults = (roomIndex: number, delta: number) => {
        setRoomSlots((prev) =>
            prev.map((r, i) =>
                i === roomIndex
                    ? { ...r, adults: Math.max(1, Math.min(20, r.adults + delta)) }
                    : r
            )
        );
    };

    const bumpRoomChildren = (roomIndex: number, delta: number) => {
        setRoomSlots((prev) =>
            prev.map((r, i) =>
                i === roomIndex
                    ? { ...r, children: Math.max(0, Math.min(10, r.children + delta)) }
                    : r
            )
        );
    };

    const addAnotherRoom = () => {
        setRoomSlots((prev) =>
            prev.length >= MAX_SEARCH_ROOMS ? prev : [...prev, { adults: 1, children: 0 }]
        );
    };

    const removeRoomAt = (index: number) => {
        setRoomSlots((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    };

    const persistGuestSession = () => {
        setCookie(SEARCH_SESSION_COOKIES.GUESTS, String(totalAdults));
        setCookie(SEARCH_SESSION_COOKIES.ROOMS, String(roomCount));
        setCookie(SEARCH_SESSION_COOKIES.ROOM_SLOTS, JSON.stringify(roomSlots));
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = location || "hotels";
        const urlParams = new URLSearchParams();
        if (location) urlParams.set("location", location);
        if (checkIn) urlParams.set("checkIn", toStorageStr(checkIn));
        if (checkOut) urlParams.set("checkOut", toStorageStr(checkOut));
        urlParams.set("roomSlots", JSON.stringify(roomSlots));
        if (totalAdults !== 1) urlParams.set("guests", String(totalAdults));
        if (roomCount !== 1) urlParams.set("rooms", String(roomCount));

        persistGuestSession();
        navigate(`/search-results?${urlParams.toString()}`);

        const params: SearchParams = { query: q, limit: 20 };
        await searchAdvanced(params);
        if (onSearch) onSearch();
    };

    return (
        <section className="search-form-section le-search-section">
            <div className="le-search-bar-wrap">
                <form onSubmit={handleSearch} className="le-search-bar">
                    {/* Location with predictive suggestions */}
                    <div className="le-field le-field-location le-field-location-wrap" ref={locationRef}>
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                            <path d="M17.5824 16.6719L12.6399 11.7294C15.1762 8.67284 14.786 4.18553 11.7294 1.64923C8.67284 -0.887071 4.18553 -0.431837 1.64923 2.5597C-0.887071 5.55124 -0.431837 10.1686 2.5597 12.6399C5.22607 14.851 9.06304 14.851 11.7294 12.6399L16.6719 17.5824L17.5824 16.6719ZM1.32406 7.17707C1.32406 3.9254 3.9254 1.32406 7.17707 1.32406C10.4287 1.32406 13.0301 3.9254 13.0301 7.17707C13.0301 10.4287 10.4287 13.0301 7.17707 13.0301C3.9254 13.0301 1.32406 10.4287 1.32406 7.17707Z" fill="#666" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search a hotel or destination"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            className="le-input"
                            autoComplete="off"
                        />
                        {showSuggestions && (suggestions.length > 0 || suggestionsLoading) && (
                            <div className="search-results-dropdown le-search-suggestions">
                                {suggestionsLoading ? (
                                    <div className="search-result-item search-result-loading" style={{ fontSize: '14px' }}>Searching...</div>
                                ) : (
                                    suggestions.map((suggestion) => (
                                        <div
                                            key={suggestion.id}
                                            className="search-result-item"
                                            onClick={() => {
                                                setLocation(suggestion.value);
                                                setShowSuggestions(false);
                                            }}
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            <div className="result-info">
                                                <h6>
                                                    {suggestion.title}
                                                    <span className={`search-suggestion-type ${suggestion.type}`}>
                                                        {suggestion.type === "city" ? "City" : "Hotel"}
                                                    </span>
                                                </h6>
                                                {suggestion.subtitle && <p>{suggestion.subtitle}</p>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="le-divider" />

                    {/* Date range */}
                    <div className="le-field le-field-dates" ref={calendarRef}>
                        <svg width="18" height="17" viewBox="0 0 21 19" fill="none">
                            <path d="M16.3194 1.49297H15.8616V0.538078C15.8616 0.362225 15.6909 0.21978 15.4801 0.21978C15.2693 0.21978 15.0986 0.362218 15.0986 0.538078V1.49297H5.94249V0.538078C5.94249 0.362225 5.77176 0.21978 5.56098 0.21978C5.3502 0.21978 5.17948 0.362218 5.17948 0.538078V1.49297H4.34017C3.24716 1.49297 2.19907 1.85504 1.4263 2.49959C0.653746 3.14415 0.219788 4.01867 0.219788 4.93071V15.2436C0.219788 16.1555 0.653746 17.03 1.4263 17.6747C2.19885 18.3193 3.24701 18.6813 4.34017 18.6813H16.3192C17.4122 18.6813 18.4603 18.3193 19.2331 17.6747C20.0056 17.0301 20.4396 16.1556 20.4396 15.2436V4.93071C20.4396 4.01878 20.0056 3.14434 19.2331 2.49959C18.4605 1.85504 17.4123 1.49297 16.3192 1.49297H16.3194ZM4.34037 2.12957H5.17968V3.08446C5.17968 3.26032 5.3504 3.40276 5.56119 3.40276C5.77197 3.40276 5.94269 3.26032 5.94269 3.08446V2.12957H15.0988V3.08446C15.0988 3.26032 15.2695 3.40276 15.4803 3.40276C15.6911 3.40276 15.8618 3.26032 15.8618 3.08446V2.12957H16.3196C17.2133 2.12082 18.0726 2.41364 18.7049 2.94044C19.3362 3.46802 19.6872 4.18498 19.6767 4.93053V5.63078H0.983263V4.93053C0.972772 4.18491 1.32375 3.46795 1.95515 2.94044C2.58749 2.41366 3.44682 2.12083 4.34041 2.12957H4.34037ZM16.3194 18.0445H4.34037C3.4467 18.0532 2.58737 17.7604 1.95511 17.2336C1.32373 16.706 0.972744 15.9891 0.983222 15.2435V6.26768H19.6767V15.2435C19.6872 15.9891 19.3362 16.7061 18.7048 17.2336C18.0725 17.7604 17.2131 18.0532 16.3196 18.0445H16.3194Z" fill="#666" stroke="#666" strokeWidth="0.3" />
                        </svg>

                        {/* Check-in */}
                        <div className="le-date-group" onClick={() => { setShowCalendar(true); setSelectingCheckIn(true); }}>
                            <button type="button" className="le-date-arrow" onClick={(e) => { e.stopPropagation(); const d = shiftDate(checkIn, -1); setCheckIn(d); setCookie(SEARCH_SESSION_COOKIES.CHECK_IN, toStorageStr(d)); }}>‹</button>
                            <span className={`le-date-text ${!checkIn ? "placeholder" : ""} ${!checkOut && showCalendar && !selectingCheckIn ? "active" : ""} ${showCalendar && selectingCheckIn ? "active" : ""}`}>
                                {checkIn ? formatDisplay(checkIn) : "Check-in"}
                            </span>
                            <button type="button" className="le-date-arrow" onClick={(e) => { e.stopPropagation(); const d = shiftDate(checkIn, 1); setCheckIn(d); setCookie(SEARCH_SESSION_COOKIES.CHECK_IN, toStorageStr(d)); }}>›</button>
                        </div>

                        <span className="le-date-sep">|</span>

                        {/* Check-out */}
                        <div className="le-date-group" onClick={() => { setShowCalendar(true); setSelectingCheckIn(false); }}>
                            <button type="button" className="le-date-arrow" onClick={(e) => { e.stopPropagation(); if (checkOut) { const d = shiftDate(checkOut, -1); setCheckOut(d); setCookie(SEARCH_SESSION_COOKIES.CHECK_OUT, toStorageStr(d)); } }}>‹</button>
                            <span className={`le-date-text ${!checkOut ? "placeholder" : ""} ${showCalendar && !selectingCheckIn ? "active" : ""}`}>
                                {checkOut ? formatDisplay(checkOut) : "Check-out"}
                            </span>
                            <button type="button" className="le-date-arrow" onClick={(e) => { e.stopPropagation(); if (checkOut) { const d = shiftDate(checkOut, 1); setCheckOut(d); setCookie(SEARCH_SESSION_COOKIES.CHECK_OUT, toStorageStr(d)); } }}>›</button>
                        </div>

                        {/* Calendar dropdown */}
                        {showCalendar && (
                            <div className="le-calendar-dropdown">
                                <div className="le-cal-header">
                                    <button type="button" className="le-cal-nav" onClick={prevMonth}>‹</button>
                                    <div className="le-cal-months">
                                        <CalendarMonth
                                            year={calendarBase.year}
                                            month={calendarBase.month}
                                            checkIn={checkIn}
                                            checkOut={checkOut}
                                            hovered={hovered}
                                            onSelect={handleDateSelect}
                                            onHover={setHovered}
                                        />
                                        <CalendarMonth
                                            year={secondMonth.year}
                                            month={secondMonth.month}
                                            checkIn={checkIn}
                                            checkOut={checkOut}
                                            hovered={hovered}
                                            onSelect={handleDateSelect}
                                            onHover={setHovered}
                                        />
                                    </div>
                                    <button type="button" className="le-cal-nav" onClick={nextMonth}>›</button>
                                </div>
                                {(checkIn || checkOut) && (
                                    <div className="le-cal-footer">
                                        <button type="button" className="le-cal-clear" onClick={() => { setCheckIn(null); setCheckOut(null); setSelectingCheckIn(true); }}>Clear dates</button>
                                        {checkIn && checkOut && (
                                            <button type="button" className="le-cal-done" onClick={() => setShowCalendar(false)}>Done</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="le-divider" />

                    {/* Guests & Rooms (per room: adults, children; add another room) */}
                    <div className="le-field le-field-guests" ref={guestRef}>
                        <div className="le-guest-display" onClick={() => setShowGuestDropdown(!showGuestDropdown)}>
                            <svg width="13" height="16" viewBox="0 0 16 19" fill="none" aria-hidden>
                                <path d={GUEST_PERSON_SVG_PATH} fill="#666" />
                            </svg>
                            <span className="le-guest-num">{totalAdults}</span>
                            {totalChildren > 0 && (
                                <>
                                    <span className="le-guest-inline-sep" aria-hidden>·</span>
                                    <svg
                                        className="le-guest-inline-icon le-guest-inline-icon--child"
                                        width="10"
                                        height="12"
                                        viewBox="0 0 16 19"
                                        fill="none"
                                        aria-hidden
                                    >
                                        <path d={GUEST_PERSON_SVG_PATH} fill="#666" />
                                    </svg>
                                    <span className="le-guest-num">{totalChildren}</span>
                                </>
                            )}
                            <svg width="18" height="14" viewBox="0 0 24 18" fill="none" aria-hidden>
                                <path d="M22 8V2C22 0.9 21.1 0 20 0H4C2.9 0 2 0.9 2 2V8C0.9 8 0 8.9 0 10V16H1.33L2 18H3L3.67 16H20.33L21 18H22L22.67 16H24V10C24 8.9 23.1 8 22 8ZM4 2H20V8H14V6C14 4.9 13.1 4 12 4H8C6.9 4 6 4.9 6 6V8H4V2ZM12 8H8V6H12V8ZM2 14V10H22V14H2Z" fill="#666" />
                            </svg>
                            <span className="le-guest-num">{roomCount}</span>
                        </div>

                        {showGuestDropdown && (
                            <div className="le-guest-dropdown le-guest-dropdown--rooms">
                                {roomSlots.map((slot, roomIndex) => (
                                    <div key={roomIndex} className="le-room-slot">
                                        <div className="le-room-slot-head">
                                            <span className="le-room-slot-title">
                                                Room {roomIndex + 1}
                                            </span>
                                            {roomSlots.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="le-room-remove"
                                                    onClick={() => removeRoomAt(roomIndex)}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <div className="le-guest-row">
                                            <span>Adults</span>
                                            <div className="le-counter">
                                                <button
                                                    type="button"
                                                    onClick={() => bumpRoomAdults(roomIndex, -1)}
                                                >
                                                    −
                                                </button>
                                                <span>{slot.adults}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => bumpRoomAdults(roomIndex, 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div className="le-guest-row">
                                            <span>Children</span>
                                            <div className="le-counter">
                                                <button
                                                    type="button"
                                                    onClick={() => bumpRoomChildren(roomIndex, -1)}
                                                >
                                                    −
                                                </button>
                                                <span>{slot.children}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => bumpRoomChildren(roomIndex, 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="le-add-room"
                                    onClick={addAnotherRoom}
                                    disabled={roomSlots.length >= MAX_SEARCH_ROOMS}
                                >
                                    Add another room
                                </button>
                                <button
                                    type="button"
                                    className="le-guest-done"
                                    onClick={() => {
                                        setShowGuestDropdown(false);
                                        persistGuestSession();
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="le-divider" />

                    {/* Search button */}
                    <button type="submit" className="le-search-btn">
                        {loading ? "..." : "Search"}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default SearchBarNew;
