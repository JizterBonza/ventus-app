import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";
import { Hotel, RateInfo } from "../types/search";
import { getHotelDetails, searchHotelsByInspiration, checkHotelAvailability } from "../utils/api";
import { getVisitorCurrency } from "../utils/currency";
import {
    SEARCH_SESSION_COOKIES,
    getCookie,
    getDefaultSearchDateStrings,
    parseSearchDate,
    dateToStorageString,
    ensureMinimumCheckOutDateString,
    resolveSearchRoomSlots,
    searchRoomSlotsToAvailabilityRooms,
} from "../utils/searchSession";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SearchBarNew from "../components/shared/SearchBarNew";
import ProgressiveImage from "../components/shared/ProgressiveImage";
import Membership from "../components/shared/Membership";
import QuoteForm from "../components/shared/QuoteForm";
import BannerCTA from "../components/shared/BannerCTA";

async function settleWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let nextIndex = 0;

    const runWorker = async () => {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            try {
                results[index] = { status: "fulfilled", value: await worker(items[index], index) };
            } catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    };

    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
    );
    return results;
}

type FilterOption = {
    key: string;
    label: string;
    count: number;
};

const normaliseFilterValue = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

type HotelFilterDefinition = {
    key: string;
    label: string;
    matches: (hotel: Hotel) => boolean;
};

const getHotelInformationText = (hotel: Hotel, sectionName?: string) =>
    (hotel.hotel_information || [])
        .filter((section) => !sectionName || normaliseFilterValue(section.title) === normaliseFilterValue(sectionName))
        .flatMap((section) => [section.title, ...(section.description || [])])
        .join(" ")
        .toLowerCase();

const getAllHotelFilterText = (hotel: Hotel) => [
    ...(hotel.amenities || []),
    ...(hotel.hotel_information || []).flatMap((section) => [section.title, ...(section.description || [])]),
].join(" ").toLowerCase();

const includesPattern = (hotel: Hotel, pattern: RegExp, sectionName?: string) =>
    pattern.test(sectionName ? getHotelInformationText(hotel, sectionName) : getAllHotelFilterText(hotel));

const FACILITY_FILTERS: HotelFilterDefinition[] = [
    { key: "bar", label: "Bar", matches: (hotel) => includesPattern(hotel, /\bbars?\b/) },
    { key: "cinema", label: "Cinema", matches: (hotel) => includesPattern(hotel, /\bcinema\b/) },
    { key: "gym", label: "Gym", matches: (hotel) => includesPattern(hotel, /\bgym\b|fitness (?:centre|center)/) },
    {
        key: "pet-friendly",
        label: "Pet friendly",
        matches: (hotel) => includesPattern(hotel, /pet[ -]?friendly|pets? allowed|welcomes? (?:dogs|pets)|dogs? (?:are )?welcome/),
    },
    {
        key: "room-service-24-hours",
        label: "Room service (24 hours)",
        matches: (hotel) => includesPattern(hotel, /(?:24\s*[- ]?\s*(?:hour|hr)s?\s+room service|room service[^.]*24\s*[- ]?\s*(?:hour|hr)s?)/),
    },
    { key: "spa", label: "Spa", matches: (hotel) => includesPattern(hotel, /\bspa\b/, "Wellness") },
    { key: "swimming-pool", label: "Swimming pool", matches: (hotel) => includesPattern(hotel, /swimming pool|spa pool|\bpools?\b/) },
];

const HEALTH_WELLNESS_FILTERS: HotelFilterDefinition[] = [
    { key: "gym", label: "Gym", matches: (hotel) => includesPattern(hotel, /\bgym\b|fitness (?:centre|center)/, "Wellness") },
    {
        key: "24-hour-gym",
        label: "24 hour gym",
        matches: (hotel) => (hotel.hotel_information || []).some((section) =>
            normaliseFilterValue(section.title) === "wellness" &&
            (section.description || []).some((detail) =>
                /\bgym\b|fitness (?:centre|center)/i.test(detail) &&
                /open 24 hours|24\s*[- ]?\s*(?:hour|hr)s?/i.test(detail)
            )
        ),
    },
    { key: "hammam", label: "Hammam", matches: (hotel) => includesPattern(hotel, /\bhammam\b/, "Wellness") },
    { key: "jacuzzi", label: "Jacuzzi", matches: (hotel) => includesPattern(hotel, /\bjacuzzi\b|hot tub/, "Wellness") },
    { key: "massage", label: "Massage", matches: (hotel) => includesPattern(hotel, /\bmassage\b/, "Wellness") },
    { key: "personal-training", label: "Personal training", matches: (hotel) => includesPattern(hotel, /personal training/, "Wellness") },
    { key: "pilates", label: "Pilates", matches: (hotel) => includesPattern(hotel, /\bpilates\b/, "Wellness") },
    { key: "sauna", label: "Sauna", matches: (hotel) => includesPattern(hotel, /\bsauna\b/, "Wellness") },
    { key: "spa", label: "Spa", matches: (hotel) => includesPattern(hotel, /\bspa\b/, "Wellness") },
    { key: "steam-room", label: "Steam room", matches: (hotel) => includesPattern(hotel, /steam room/, "Wellness") },
    { key: "yoga", label: "Yoga", matches: (hotel) => includesPattern(hotel, /\byoga\b/, "Wellness") },
];

const FAMILY_FILTERS: HotelFilterDefinition[] = [
    {
        key: "babysitting-available",
        label: "Babysitting available",
        matches: (hotel) => includesPattern(hotel, /baby[ -]?sitting available|babysitting available/, "Family"),
    },
    {
        key: "childrens-activities",
        label: "Children’s activities",
        matches: (hotel) => includesPattern(
            hotel,
            /(?:kids?|children(?:’s|'s)?) (?:club|activities|activity|programme|program)|activities (?:for|tailored to) (?:kids?|children)/,
            "Family"
        ),
    },
    { key: "playground", label: "Playground", matches: (hotel) => includesPattern(hotel, /\bplayground\b|\bplay area\b/, "Family") },
];

const buildFilterOptions = (hotels: Hotel[], definitions: HotelFilterDefinition[]): FilterOption[] =>
    definitions.map((definition) => ({
        key: definition.key,
        label: definition.label,
        count: hotels.filter(definition.matches).length,
    }));

const matchesSelectedFilters = (
    hotel: Hotel,
    selected: string[],
    definitions: HotelFilterDefinition[]
) => selected.every((key) => definitions.find((definition) => definition.key === key)?.matches(hotel));

const getHotelOpeningTimestamp = (hotel: Hotel): number | null => {
    const shortInfo = hotel.short_info;
    const opened = typeof shortInfo === "object" && shortInfo !== null ? shortInfo.opened : null;
    if (!opened) return null;

    const timestamp = Date.parse(`1 ${opened}`);
    return Number.isFinite(timestamp) ? timestamp : null;
};

const SearchResults: React.FC = () => {
    const [urlSearchParams] = useSearchParams();
    const currentSearchKey = urlSearchParams.toString();
    const hasSearchCriteria = urlSearchParams.has("inspirationId") || urlSearchParams.has("location");
    const { hotels, loading, error, searchAdvanced, clearResults } = useSearch();
    const { isAuthenticated } = useAuth();
    
    const [searchParams, setSearchParams] = useState({
        location: "",
        priceRange: "all",
        rating: "all",
        sortBy: "recommended",
    });
    const [detailedHotels, setDetailedHotels] = useState<Hotel[]>([]);
    const [loadingInspiration, setLoadingInspiration] = useState(false);
    const [inspirationResults, setInspirationResults] = useState<Hotel[]>([]);
    const [completedSearchKey, setCompletedSearchKey] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const detailsRequestRef = useRef(0);
    /** Starting-from price per hotel id (search dates, visitor currency). Only when authenticated. */
    const [startingFromPrices, setStartingFromPrices] = useState<Record<number, { rate: number; currency: string }>>({});
    const [loadingStartingFromPrices, setLoadingStartingFromPrices] = useState(false);
    /** Availability per hotel id for the search dates/rooms; false = confirmed not available. */
    const [hotelAvailability, setHotelAvailability] = useState<Record<number, boolean>>({});
    /** How many results are rendered/checked at once; "View More" reveals the next batch of 10. */
    const [visibleCount, setVisibleCount] = useState(10);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
    const [selectedHealthWellness, setSelectedHealthWellness] = useState<string[]>([]);
    const [selectedFamily, setSelectedFamily] = useState<string[]>([]);
    const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);
    const baseHotels = useMemo(
        () => (inspirationResults.length > 0 ? inspirationResults : hotels),
        [hotels, inspirationResults]
    );
    const baseHotelIdsKey = useMemo(() => baseHotels.map((hotel) => hotel.id).join(","), [baseHotels]);
    const detailByHotelId = useMemo(
        () => new Map(detailedHotels.map((hotel) => [hotel.id, hotel])),
        [detailedHotels]
    );
    const enrichedHotels = useMemo(
        () => baseHotels.map((hotel) => detailByHotelId.get(hotel.id) || hotel),
        [baseHotels, detailByHotelId]
    );
    const facilityOptions = useMemo(
        () => buildFilterOptions(enrichedHotels, FACILITY_FILTERS),
        [enrichedHotels]
    );
    const healthWellnessOptions = useMemo(
        () => buildFilterOptions(enrichedHotels, HEALTH_WELLNESS_FILTERS),
        [enrichedHotels]
    );
    const familyOptions = useMemo(
        () => buildFilterOptions(enrichedHotels, FAMILY_FILTERS),
        [enrichedHotels]
    );
    const filteredHotels = useMemo(() => {
        let filtered = enrichedHotels;

        if (searchParams.priceRange !== "all") {
            filtered = filtered.filter((hotel) => {
                const price = hotel.price || 0;
                switch (searchParams.priceRange) {
                    case "low":
                        return price < 200;
                    case "medium":
                        return price >= 200 && price < 300;
                    case "high":
                        return price >= 300;
                    default:
                        return true;
                }
            });
        }

        if (searchParams.rating !== "all") {
            const minRating = parseInt(searchParams.rating);
            filtered = filtered.filter((hotel) => (hotel.rating || 0) >= minRating);
        }

        if (selectedFacilities.length > 0) {
            filtered = filtered.filter((hotel) => matchesSelectedFilters(hotel, selectedFacilities, FACILITY_FILTERS));
        }

        if (selectedHealthWellness.length > 0) {
            filtered = filtered.filter((hotel) => matchesSelectedFilters(hotel, selectedHealthWellness, HEALTH_WELLNESS_FILTERS));
        }

        if (selectedFamily.length > 0) {
            filtered = filtered.filter((hotel) => matchesSelectedFilters(hotel, selectedFamily, FAMILY_FILTERS));
        }

        const getSortPrice = (hotel: Hotel) => startingFromPrices[hotel.id]?.rate ?? hotel.price;
        const sortByPrice = (direction: "ascending" | "descending") => [...filtered].sort((a, b) => {
            const aPrice = getSortPrice(a);
            const bPrice = getSortPrice(b);
            if (aPrice == null && bPrice == null) return 0;
            if (aPrice == null) return 1;
            if (bPrice == null) return -1;
            return direction === "ascending" ? aPrice - bPrice : bPrice - aPrice;
        });

        switch (searchParams.sortBy) {
            case "price-low":
                return sortByPrice("ascending");
            case "price-high":
                return sortByPrice("descending");
            case "opening-date":
                return [...filtered].sort((a, b) => {
                    const aOpened = getHotelOpeningTimestamp(a);
                    const bOpened = getHotelOpeningTimestamp(b);
                    if (aOpened == null && bOpened == null) return 0;
                    if (aOpened == null) return 1;
                    if (bOpened == null) return -1;
                    return bOpened - aOpened;
                });
            case "rating":
                return [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case "distance":
                return [...filtered].sort((a, b) => {
                    const aDist = parseFloat(a.distance?.split(" ")[0] || "0");
                    const bDist = parseFloat(b.distance?.split(" ")[0] || "0");
                    return aDist - bDist;
                });
            default:
                return filtered;
        }
    }, [enrichedHotels, searchParams.priceRange, searchParams.rating, searchParams.sortBy, selectedFacilities, selectedHealthWellness, selectedFamily, startingFromPrices]);
    const hotelIdsKey = useMemo(() => filteredHotels.map((h) => h.id).join(","), [filteredHotels]);
    // Availability is secondary information. Never keep the result cards behind its much
    // slower network calls; tags and member pricing can fill in progressively.
    const isSearching =
        loading ||
        loadingInspiration ||
        (hasSearchCriteria && completedSearchKey !== currentSearchKey);

    // Start over at 10 whenever the result set itself changes (new search or filter/sort change).
    useEffect(() => {
        setVisibleCount(10);
    }, [hotelIdsKey]);

    const visibleHotels = useMemo(() => filteredHotels.slice(0, visibleCount), [filteredHotels, visibleCount]);
    const visibleHotelIdsKey = useMemo(() => visibleHotels.map((h) => h.id).join(","), [visibleHotels]);

    /** Dates + rooms actually selected in the header search (URL, falling back to cookies), for availability checks and hotel links. */
    const searchDatesAndRooms = useMemo(() => {
        const urlCheckIn = urlSearchParams.get("checkIn");
        const urlCheckOut = urlSearchParams.get("checkOut");

        const defaults = getDefaultSearchDateStrings();
        const ci = parseSearchDate(urlCheckIn || getCookie(SEARCH_SESSION_COOKIES.CHECK_IN) || "");
        const co = parseSearchDate(urlCheckOut || getCookie(SEARCH_SESSION_COOKIES.CHECK_OUT) || "");
        const start_date = ci ? dateToStorageString(ci) : defaults.start_date;
        const requestedEndDate = co ? dateToStorageString(co) : defaults.end_date;
        const end_date = ensureMinimumCheckOutDateString(start_date, requestedEndDate);

        const slots = resolveSearchRoomSlots(urlSearchParams);
        const rooms = searchRoomSlotsToAvailabilityRooms(slots);

        return { start_date, end_date, rooms };
    }, [urlSearchParams]);
    const searchDatesAndRoomsKey = `${searchDatesAndRooms.start_date}|${searchDatesAndRooms.end_date}|${JSON.stringify(searchDatesAndRooms.rooms)}`;
    /**
     * Query string to carry over to the hotel detail page so it uses these exact dates/guests
     * instead of guessing from cookies. Deliberately excludes `location` (and other search-only
     * params like sort/filter) -- carrying the original city/search text over would make the
     * header search bar show "Amalfi" instead of the hotel's own name on the hotel page.
     */
    const hotelLinkQuery = useMemo(() => {
        const params = new URLSearchParams();
        const checkIn = urlSearchParams.get("checkIn");
        const checkOut = urlSearchParams.get("checkOut");
        const roomSlots = urlSearchParams.get("roomSlots");
        const guests = urlSearchParams.get("guests");
        const rooms = urlSearchParams.get("rooms");
        if (checkIn) params.set("checkIn", checkIn);
        if (checkOut) params.set("checkOut", checkOut);
        if (roomSlots) params.set("roomSlots", roomSlots);
        if (guests) params.set("guests", guests);
        if (rooms) params.set("rooms", rooms);
        return params.toString();
    }, [urlSearchParams]);

    // Handle URL parameters and perform search
    useEffect(() => {
        let cancelled = false;
        const inspirationId = urlSearchParams.get("inspirationId");
        const location = urlSearchParams.get("location");
        const title = urlSearchParams.get("title");
        const priceRange = urlSearchParams.get("priceRange") || "all";
        const rating = urlSearchParams.get("rating") || "all";
        const sortBy = urlSearchParams.get("sortBy") || "recommended";

        setSearchParams({
            location: title || location || "",
            priceRange,
            rating,
            sortBy,
        });
        clearResults();
        setInspirationResults([]);

        if (inspirationId) {
            // Use the /hotels?inspiration_id endpoint for category cards,
            // falling back to text search if the ID doesn't exist in this environment
            setLoadingInspiration(true);
            searchHotelsByInspiration(Number(inspirationId), 20)
                .then(async (results) => {
                    if (cancelled) return;
                    if (results.length > 0) {
                        setInspirationResults(results);
                    } else {
                        // Fallback: text search using the title
                        const fallbackQuery = title || "";
                        if (fallbackQuery) {
                            await searchAdvanced({ query: fallbackQuery, limit: 20 });
                        }
                    }
                })
                .catch(async () => {
                    if (cancelled) return;
                    // Fallback on error (e.g. ID invalid in staging)
                    const fallbackQuery = title || "";
                    if (fallbackQuery) {
                        await searchAdvanced({ query: fallbackQuery, limit: 20 });
                    }
                })
                .finally(() => {
                    if (!cancelled) {
                        setLoadingInspiration(false);
                        setCompletedSearchKey(currentSearchKey);
                    }
                });
        } else if (location) {
            setLoadingInspiration(false);
            const searchParamsForAPI = {
                query: location,
                limit: 20,
                location: location || undefined,
                priceRange: priceRange !== "all" ? priceRange : undefined,
                rating: rating !== "all" ? rating : undefined,
                sortBy: sortBy !== "recommended" ? sortBy : undefined,
            };
            void searchAdvanced(searchParamsForAPI).finally(() => {
                if (!cancelled) setCompletedSearchKey(currentSearchKey);
            });
        } else {
            setLoadingInspiration(false);
            setCompletedSearchKey(currentSearchKey);
        }

        return () => {
            cancelled = true;
        };
    }, [urlSearchParams, currentSearchKey, searchAdvanced, clearResults]);

    // Enrich every result in the background. Cards remain visible while these calls complete,
    // while the complete detail set gives the filter counts a reliable source of truth.
    useEffect(() => {
        const requestId = ++detailsRequestRef.current;
        const hotelIds = baseHotels.map((hotel) => hotel.id);
        setDetailedHotels([]);

        if (hotelIds.length === 0) {
            setLoadingFilterOptions(false);
            return;
        }

        setLoadingFilterOptions(true);
        void settleWithConcurrency(hotelIds, 4, async (hotelId) => {
            const detailedHotel = await getHotelDetails(hotelId);
            if (detailsRequestRef.current !== requestId) return;

            setDetailedHotels((current) => {
                const existingIndex = current.findIndex((hotel) => hotel.id === detailedHotel.id);
                if (existingIndex === -1) return [...current, detailedHotel];

                const next = [...current];
                next[existingIndex] = detailedHotel;
                return next;
            });
        }).finally(() => {
            if (detailsRequestRef.current === requestId) setLoadingFilterOptions(false);
        });

        return () => {
            if (detailsRequestRef.current === requestId) detailsRequestRef.current += 1;
        };
    }, [baseHotelIdsKey, baseHotels]);

    useEffect(() => {
        setSelectedFacilities([]);
        setSelectedHealthWellness([]);
        setSelectedFamily([]);
        setFiltersOpen(false);
    }, [currentSearchKey]);

    useEffect(() => {
        if (!isAuthenticated) {
            setSearchParams((current) =>
                current.sortBy === "price-high" || current.sortBy === "price-low"
                    ? { ...current, sortBy: "recommended" }
                    : current
            );
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!filtersOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setFiltersOpen(false);
        };
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [filtersOpen]);

    const toggleFilterValue = (
        value: string,
        setValues: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setValues((current) =>
            current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value]
        );
    };

    const clearFilters = () => {
        setSearchParams((current) => ({ ...current, sortBy: "recommended" }));
        setSelectedFacilities([]);
        setSelectedHealthWellness([]);
        setSelectedFamily([]);
    };

    const activeFilterCount = selectedFacilities.length + selectedHealthWellness.length + selectedFamily.length +
        (searchParams.sortBy !== "recommended" ? 1 : 0);

    // If there are no results, ensure a stale panel cannot obscure the empty state.
    useEffect(() => {
        if (!isSearching && baseHotels.length === 0) {
            setDetailedHotels([]);
            setFiltersOpen(false);
        }
    }, [baseHotels.length, isSearching]);

    // Check real availability (search dates/rooms) and "Starting from" price for the currently visible
    // batch only (max 10 at a time -- "View More" reveals the next batch). Keeping the batch small means
    // every card's tag resolves quickly instead of the whole page waiting on a large city search.
    useEffect(() => {
        if (visibleHotels.length === 0) {
            setStartingFromPrices({});
            setHotelAvailability({});
            setLoadingStartingFromPrices(false);
            return;
        }
        let cancelled = false;
        setLoadingStartingFromPrices(true);
        const { start_date, end_date, rooms } = searchDatesAndRooms;

        (async () => {
            try {
                const currency = await getVisitorCurrency();
                if (cancelled) return;
                const results = await settleWithConcurrency(visibleHotels, 4, (hotel) =>
                    checkHotelAvailability({
                            hotel_id: hotel.id,
                            start_date,
                            end_date,
                            currency,
                            rooms,
                        })
                );
                if (cancelled) return;
                const nextPrices: Record<number, { rate: number; currency: string }> = {};
                const nextAvailability: Record<number, boolean> = {};
                results.forEach((settled, index) => {
                    const hotel = visibleHotels[index];
                    if (!hotel || settled.status !== "fulfilled" || !settled.value?.length) return;
                    const first = settled.value[0];
                    nextAvailability[hotel.id] = !!first?.is_available;
                    if (!isAuthenticated || !first?.is_available || first.lowest_rate == null) return;
                    const lr = first.lowest_rate;
                    const rateValue =
                        typeof lr === "number"
                            ? lr
                            : (lr as RateInfo).rate_in_requested_currency ??
                              (lr as RateInfo).rate ??
                              (lr as RateInfo).total_to_book_in_requested_currency ??
                              (lr as RateInfo).total_to_book;
                    const currencyCode =
                        typeof lr === "object" && lr !== null
                            ? (lr as RateInfo).requested_currency_code ?? (lr as RateInfo).currency_code ?? first.default_currency ?? currency
                            : first.default_currency ?? currency;
                    if (typeof rateValue === "number") {
                        nextPrices[hotel.id] = { rate: rateValue, currency: currencyCode || "USD" };
                    }
                });
                if (!cancelled) {
                    setStartingFromPrices((prev) => ({ ...prev, ...nextPrices }));
                    setHotelAvailability((prev) => ({ ...prev, ...nextAvailability }));
                }
            } catch {
                if (!cancelled) {
                    setStartingFromPrices({});
                    setHotelAvailability({});
                }
            } finally {
                if (!cancelled) setLoadingStartingFromPrices(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, visibleHotelIdsKey, searchDatesAndRoomsKey]);

    return (
        <div className="search-page">
            <Header />
            {/* Search Form */}
            <SearchBarNew isSearching={isSearching} />
            <br />

            {/* Filters and Results */}
            <section className={`results-section ${filteredHotels.length > 0 ? "has-results" : ""} ${!isSearching && visibleHotels.length < filteredHotels.length ? "has-more-results" : ""}`}>
                <div className="container">
                    <div className="row">
                        {/* Results */}
                        <div className="col-md-12">
                            <div className="results-header search-results-toolbar">
                               <p>{isSearching ? "Searching for hotels…" : `${filteredHotels.length} results found`}</p>
                               {!isSearching && baseHotels.length > 0 && (
                                   <button
                                       type="button"
                                       className="search-filter-trigger"
                                       onClick={() => setFiltersOpen(true)}
                                       aria-haspopup="dialog"
                                       aria-expanded={filtersOpen}
                                   >
                                       <svg viewBox="0 0 24 24" aria-hidden="true">
                                           <path d="M4 7h16M7 12h10M10 17h4" />
                                       </svg>
                                       Filters
                                       {activeFilterCount > 0 && (
                                           <span className="search-filter-count">{activeFilterCount}</span>
                                       )}
                                   </button>
                               )}
                            </div>

                            {filtersOpen && (
                                <>
                                    <div
                                        className="search-filter-backdrop"
                                        onClick={() => setFiltersOpen(false)}
                                        aria-hidden="true"
                                    />
                                    <aside
                                        className="search-filter-panel"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="search-filter-title"
                                    >
                                        <header className="search-filter-panel-header">
                                            <h2 id="search-filter-title">Filters</h2>
                                            <button
                                                type="button"
                                                className="search-filter-close"
                                                onClick={() => setFiltersOpen(false)}
                                                aria-label="Close filters"
                                            >
                                                <span aria-hidden="true">×</span>
                                            </button>
                                        </header>

                                        <div className="search-filter-panel-content">
                                            <fieldset className="search-filter-section">
                                                <legend>Sort by</legend>
                                                {[
                                                    { value: "recommended", label: "Recommended", disabled: false },
                                                    { value: "price-high", label: "Price (high to low)", disabled: !isAuthenticated },
                                                    { value: "price-low", label: "Price (low to high)", disabled: !isAuthenticated },
                                                    { value: "opening-date", label: "Opening date", disabled: false },
                                                ].map((option) => (
                                                    <label className="search-filter-option search-filter-radio" key={option.value}>
                                                        <input
                                                            type="radio"
                                                            name="hotel-sort"
                                                            value={option.value}
                                                            checked={searchParams.sortBy === option.value}
                                                            onChange={() => setSearchParams((current) => ({
                                                                ...current,
                                                                sortBy: option.value,
                                                            }))}
                                                            disabled={option.disabled}
                                                        />
                                                        <span className="search-filter-control" aria-hidden="true" />
                                                        <span className="search-filter-label">{option.label}</span>
                                                    </label>
                                                ))}
                                                {!isAuthenticated && (
                                                    <p className="search-filter-section-note">Log in to sort by live member prices.</p>
                                                )}
                                            </fieldset>

                                            <fieldset className="search-filter-section">
                                                <legend>Facilities</legend>
                                                {loadingFilterOptions ? (
                                                    <p className="search-filter-loading">
                                                        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                                                        Loading facility filters…
                                                    </p>
                                                ) : (
                                                    <div className="search-filter-grid">
                                                        {facilityOptions.map((option) => (
                                                            <label className="search-filter-option" key={option.key}>
                                                                <input
                                                                type="checkbox"
                                                                checked={selectedFacilities.includes(option.key)}
                                                                onChange={() => toggleFilterValue(option.key, setSelectedFacilities)}
                                                                disabled={option.count === 0}
                                                            />
                                                            <span className="search-filter-control" aria-hidden="true" />
                                                            <span className="search-filter-label">{option.label}</span>
                                                                <span className="search-filter-option-count">{option.count}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </fieldset>

                                            <fieldset className="search-filter-section">
                                                <legend>Health and wellness</legend>
                                                {loadingFilterOptions ? (
                                                    <p className="search-filter-loading">
                                                        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                                                        Loading health and wellness filters…
                                                    </p>
                                                ) : (
                                                    <div className="search-filter-grid">
                                                        {healthWellnessOptions.map((option) => (
                                                            <label className="search-filter-option" key={option.key}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedHealthWellness.includes(option.key)}
                                                                    onChange={() => toggleFilterValue(option.key, setSelectedHealthWellness)}
                                                                    disabled={option.count === 0}
                                                                />
                                                                <span className="search-filter-control" aria-hidden="true" />
                                                                <span className="search-filter-label">{option.label}</span>
                                                                <span className="search-filter-option-count">{option.count}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </fieldset>

                                            <fieldset className="search-filter-section">
                                                <legend>Family</legend>
                                                {loadingFilterOptions ? (
                                                    <p className="search-filter-loading">
                                                        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                                                        Loading family filters…
                                                    </p>
                                                ) : (
                                                    <div className="search-filter-grid">
                                                        {familyOptions.map((option) => (
                                                            <label className="search-filter-option" key={option.key}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedFamily.includes(option.key)}
                                                                    onChange={() => toggleFilterValue(option.key, setSelectedFamily)}
                                                                    disabled={option.count === 0}
                                                                />
                                                                <span className="search-filter-control" aria-hidden="true" />
                                                                <span className="search-filter-label">{option.label}</span>
                                                                <span className="search-filter-option-count">{option.count}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </fieldset>
                                        </div>

                                        <footer className="search-filter-panel-footer">
                                            <button
                                                type="button"
                                                className="search-filter-clear"
                                                onClick={clearFilters}
                                                disabled={activeFilterCount === 0}
                                            >
                                                Clear all
                                            </button>
                                            <button
                                                type="button"
                                                className="search-filter-show"
                                                onClick={() => setFiltersOpen(false)}
                                            >
                                                Show {filteredHotels.length} {filteredHotels.length === 1 ? "hotel" : "hotels"}
                                            </button>
                                        </footer>
                                    </aside>
                                </>
                            )}

                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    <strong>Error:</strong> {error}
                                </div>
                            )}

                            {isSearching ? (
                                <div className="text-center">
                                    <div className="spinner-border" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </div>
                                    <p className="mt-2">Searching for hotels...</p>
                                </div>
                            ) : (
                                <div className="hotels-container">
                                    {visibleHotels.map((hotel, index) => {
                                        // Use detailed hotel information if available, otherwise fall back to basic info
                                        const detailedHotel = detailedHotels.find((dh) => dh.id === hotel.id);
                                        const displayHotel = detailedHotel || hotel;
                                        const memberBenefits = isAuthenticated
                                            ? Array.from(new Set((displayHotel.benefits || []).filter((benefit) => benefit.trim())))
                                            : [];
                                        const benefitFootnotes = isAuthenticated
                                            ? Array.from(new Set((displayHotel.benefits_footnotes || []).filter((footnote) => footnote.trim())))
                                            : [];

                                        return (
                                            <div
                                                key={hotel.id}
                                                className="hotel-result-row">
                                                <div
                                                    className="hotel-card">
                                                    <Link
                                                        to={`/hotel/${hotel.id}${hotelLinkQuery ? `?${hotelLinkQuery}` : ""}`}
                                                        className="card-image">
                                                        <ProgressiveImage
                                                            src={displayHotel.images?.[0]?.url || displayHotel.image}
                                                            alt={displayHotel.name}
                                                            priority={index < 3}
                                                            style={{ minHeight: "262px" }}
                                                        />
                                                    </Link>
                                                    <div 
                                                        className="card_content">
                                                        <div>
                                                            <h4>
                                                                <Link
                                                                    to={`/hotel/${hotel.id}${hotelLinkQuery ? `?${hotelLinkQuery}` : ""}`}
                                                                    style={{
                                                                        color: "inherit",
                                                                        textDecoration: "none",
                                                                        cursor: "pointer"
                                                                    }}
                                                                >
                                                                    {displayHotel.name}
                                                                </Link>
                                                            </h4>
                                                            {displayHotel.location && (
                                                                <h6>{displayHotel.location}
                                                                </h6>
                                                            )}
                                                            {hotelAvailability[hotel.id] === false && (
                                                                <p className="hotel-not-available-tag" style={{ color: "#b3311f", fontWeight: 600, margin: "4px 0" }}>
                                                                    <i className="fa fa-exclamation-triangle me-2"></i>
                                                                    Not available for these dates — view hotel to check other dates
                                                                </p>
                                                            )}
                                                            {isAuthenticated && (() => {
                                                                const priceInfo = startingFromPrices[hotel.id];
                                                                const isLoading = loadingStartingFromPrices && priceInfo == null;
                                                                if (isLoading) {
                                                                    return (
                                                                        <p className="hotel-price">
                                                                            Starting from{" "}
                                                                            <span className="text-muted" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                                                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                                                                Loading...
                                                                            </span>
                                                                        </p>
                                                                    );
                                                                }
                                                                const rateValue = priceInfo != null ? priceInfo.rate : (displayHotel.price ?? null);
                                                                const currency = priceInfo?.currency ?? "USD";
                                                                const symbol = currency === "USD" ? "$" : `${currency} `;
                                                                if (rateValue != null) {
                                                                    return (
                                                                        <p className="hotel-price">
                                                                            Starting from {symbol}{rateValue.toLocaleString()}/night
                                                                        </p>
                                                                    );
                                                                }
                                                                return (
                                                                    <p className="hotel-price">
                                                                        Starting from /night
                                                                    </p>
                                                                );
                                                            })()}
                                                            {displayHotel.description && (
                                                                <p>{displayHotel.description.length > 450
                                                                        ? `${displayHotel.description.substring(0, 450)}...`
                                                                        : displayHotel.description}
                                                                </p>
                                                            )}
                                                            {memberBenefits.length > 0 && (
                                                                <section
                                                                    className="search-result-benefits"
                                                                    aria-label={`${displayHotel.name} member benefits`}
                                                                >
                                                                    <h5>Ventus Member Benefits</h5>
                                                                    <ul>
                                                                        {memberBenefits.map((benefit) => (
                                                                            <li key={benefit}>{benefit}</li>
                                                                        ))}
                                                                    </ul>
                                                                    {benefitFootnotes.map((footnote) => (
                                                                        <p className="search-result-benefits-footnote" key={footnote}>
                                                                            {footnote}
                                                                        </p>
                                                                    ))}
                                                                </section>
                                                            )}
                                                        </div>
                                                        <div 
                                                            className="card-description" 
                                                            style={{ 
                                                                marginTop: "auto",
                                                                display: "flex",
                                                                gap: "20px",
                                                                alignItems: "center",
                                                            }}
                                                        >
                                                            <Link
                                                            className="btn btn-primary"
                                                                to={`/hotel/${hotel.id}${hotelLinkQuery ? `?${hotelLinkQuery}` : ""}`}
                                                                style={{ color: "#fff", textDecoration: "none" }}
                                                            >
                                                                View Hotel{" "}
                                                               
                                                            </Link>
                                                            {!isAuthenticated && (
                                                                <Link 
                                                                className="text-link"
                                                                    to="/login" >
                                                                    Login to view benefits{" "}
                                                                  
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!isSearching && visibleHotels.length < filteredHotels.length && (
                                <div className="search-results-load-more text-center">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => setVisibleCount((v) => Math.min(v + 10, filteredHotels.length))}
                                    >
                                        View More
                                    </button>
                                </div>
                            )}

                            {!isSearching && filteredHotels.length === 0 && (
                                <div className="text-center">
                                    <h4>No hotels found</h4>
                                    <p>Try adjusting your search criteria</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
            <Membership />
            <QuoteForm />
            <BannerCTA />
            <Footer />
        </div>
    );
};

export default SearchResults;
