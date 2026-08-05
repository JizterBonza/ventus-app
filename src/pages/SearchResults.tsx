import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";
import { Hotel, RateInfo } from "../types/search";
import { getHotelDetails, searchHotelsByInspiration, checkHotelAvailability } from "../utils/api";
import { getVisitorCurrency } from "../utils/currency";
import { getDefaultSearchDateStrings } from "../utils/searchSession";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SearchBarNew from "../components/shared/SearchBarNew";
import ProgressiveImage from "../components/shared/ProgressiveImage";
import Membership from "../components/shared/Membership";
import QuoteForm from "../components/shared/QuoteForm";
import BannerCTA from "../components/shared/BannerCTA";

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
    /** Starting-from price per hotel id (today/tomorrow, visitor currency). Only when authenticated. */
    const [startingFromPrices, setStartingFromPrices] = useState<Record<number, { rate: number; currency: string }>>({});
    const [loadingStartingFromPrices, setLoadingStartingFromPrices] = useState(false);
    const filteredHotels = useMemo(() => {
        let filtered = inspirationResults.length > 0 ? inspirationResults : hotels;

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

        switch (searchParams.sortBy) {
            case "price-low":
                return [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
            case "price-high":
                return [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
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
    }, [hotels, inspirationResults, searchParams.priceRange, searchParams.rating, searchParams.sortBy]);
    const hotelIdsKey = useMemo(() => filteredHotels.map((h) => h.id).join(","), [filteredHotels]);
    const isSearching = loading || loadingInspiration || (hasSearchCriteria && completedSearchKey !== currentSearchKey);

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

    // Function to fetch detailed hotel information
    const fetchHotelDetails = async (hotelIds: number[]) => {
        if (hotelIds.length === 0) return;

        const requestId = ++detailsRequestRef.current;
        setDetailedHotels([]);

        await Promise.allSettled(
            hotelIds.map(async (hotelId) => {
                const detailedHotel = await getHotelDetails(hotelId);
                if (detailsRequestRef.current !== requestId) return;

                setDetailedHotels((current) => {
                    const existingIndex = current.findIndex((hotel) => hotel.id === detailedHotel.id);
                    if (existingIndex === -1) return [...current, detailedHotel];

                    const next = [...current];
                    next[existingIndex] = detailedHotel;
                    return next;
                });
            })
        );
    };

    // Enrich ordinary text-search results progressively. Inspiration responses
    // already contain the card data and do not need 20 immediate detail calls.
    useEffect(() => {
        if (filteredHotels.length > 0 && inspirationResults.length === 0) {
            const hotelIds = filteredHotels.map((hotel) => hotel.id);
            fetchHotelDetails(hotelIds);
        } else {
            detailsRequestRef.current += 1;
            setDetailedHotels([]);
        }
    }, [filteredHotels, inspirationResults]);

    // Fetch "Starting from" prices for each hotel (today/tomorrow, visitor currency). Only when authenticated.
    useEffect(() => {
        if (!isAuthenticated || filteredHotels.length === 0) {
            setStartingFromPrices({});
            setLoadingStartingFromPrices(false);
            return;
        }
        let cancelled = false;
        setLoadingStartingFromPrices(true);
        const { start_date, end_date } = getDefaultSearchDateStrings();

        (async () => {
            try {
                const currency = await getVisitorCurrency();
                if (cancelled) return;
                const results = await Promise.allSettled(
                    filteredHotels.map((hotel) =>
                        checkHotelAvailability({
                            hotel_id: hotel.id,
                            start_date,
                            end_date,
                            currency,
                            rooms: [{ adults: 1, children: [] }],
                        })
                    )
                );
                if (cancelled) return;
                const next: Record<number, { rate: number; currency: string }> = {};
                results.forEach((settled, index) => {
                    const hotel = filteredHotels[index];
                    if (!hotel || settled.status !== "fulfilled" || !settled.value?.length) return;
                    const first = settled.value[0];
                    if (!first?.is_available || first.lowest_rate == null) return;
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
                        next[hotel.id] = { rate: rateValue, currency: currencyCode || "USD" };
                    }
                });
                if (!cancelled) setStartingFromPrices(next);
            } catch {
                if (!cancelled) setStartingFromPrices({});
            } finally {
                if (!cancelled) setLoadingStartingFromPrices(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, hotelIdsKey]);

    return (
        <div className="search-page">
            <Header />
            {/* Search Form */}
            <SearchBarNew />
            <br />

            {/* Filters and Results */}
            <section className={`results-section  ${filteredHotels.length > 0 ? "has-results" : ""}`}>
                <div className="container">
                    <div className="row">
                        {/* Results */}
                        <div className="col-md-12">
                            <div className="results-header">
                               <p>{isSearching ? "Searching for hotels…" : `${filteredHotels.length} results found`}</p>
                            </div>

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
                                    {filteredHotels.map((hotel, index) => {
                                        // Use detailed hotel information if available, otherwise fall back to basic info
                                        const detailedHotel = detailedHotels.find((dh) => dh.id === hotel.id);
                                        const displayHotel = detailedHotel || hotel;

                                        return (
                                            <div
                                                key={hotel.id}
                                                className="hotel-result-row">
                                                <div
                                                    className="hotel-card">
                                                    <Link
                                                        to={`/hotel/${hotel.id}`}
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
                                                                    to={`/hotel/${hotel.id}`}
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
                                                                to={`/hotel/${hotel.id}`}
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
