import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";
import { Hotel } from "../types/search";
import { getHotelDetailsBatch } from "../utils/api";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SearchBarNew from "../components/shared/SearchBarNew";

const SearchResults: React.FC = () => {
    const [urlSearchParams] = useSearchParams();
    const { hotels, loading, error, searchAdvanced, clearError } = useSearch();
    
    const [searchParams, setSearchParams] = useState({
        location: "",
        priceRange: "all",
        rating: "all",
        sortBy: "recommended",
    });
    const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
    const [detailedHotels, setDetailedHotels] = useState<Hotel[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Fallback hotel images for when API doesn't provide images
    const fallbackImages = [
        "/assets/img/rooms/1.jpg",
        "/assets/img/rooms/2.jpg",
        "/assets/img/rooms/3.jpg",
        "/assets/img/rooms/4.jpg",
        "/assets/img/rooms/5.jpg",
        "/assets/img/rooms/6.jpg",
        "/assets/img/rooms/7.jpg",
        "/assets/img/rooms/8.jpg",
    ];

    // Handle URL parameters and perform search
    useEffect(() => {
        const location = urlSearchParams.get("location");
        const priceRange = urlSearchParams.get("priceRange") || "all";
        const rating = urlSearchParams.get("rating") || "all";
        const sortBy = urlSearchParams.get("sortBy") || "recommended";

        setSearchParams({
            location: location || "",
            priceRange,
            rating,
            sortBy,
        });

        if (location) {
            const searchParamsForAPI = {
                query: location,
                limit: 20,
                location: location || undefined,
                priceRange: priceRange !== "all" ? priceRange : undefined,
                rating: rating !== "all" ? rating : undefined,
                sortBy: sortBy !== "recommended" ? sortBy : undefined,
            };
            searchAdvanced(searchParamsForAPI);
        }
    }, [urlSearchParams, searchAdvanced]);

    // Function to fetch detailed hotel information
    const fetchHotelDetails = async (hotelIds: number[]) => {
        if (hotelIds.length === 0) return;

        setLoadingDetails(true);
        try {
            console.log("Fetching detailed information for hotels:", hotelIds);
            const detailedHotelsData = await getHotelDetailsBatch(hotelIds);
            setDetailedHotels(detailedHotelsData);
            console.log("Successfully fetched detailed hotel information:", detailedHotelsData);
        } catch (error) {
            console.error("Error fetching hotel details:", error);
            setDetailedHotels([]);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Apply client-side filtering and sorting to API results
    useEffect(() => {
        let filtered = hotels;

        // Apply price filter
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

        // Apply rating filter
        if (searchParams.rating !== "all") {
            const minRating = parseInt(searchParams.rating);
            filtered = filtered.filter((hotel) => (hotel.rating || 0) >= minRating);
        }

        // Apply sorting
        switch (searchParams.sortBy) {
            case "price-low":
                filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case "price-high":
                filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case "rating":
                filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case "distance":
                filtered = [...filtered].sort((a, b) => {
                    const aDist = parseFloat(a.distance?.split(" ")[0] || "0");
                    const bDist = parseFloat(b.distance?.split(" ")[0] || "0");
                    return aDist - bDist;
                });
                break;
            default:
                break;
        }

        setFilteredHotels(filtered);

        // Fetch detailed information for the filtered hotels
        if (filtered.length > 0) {
            const hotelIds = filtered.map((hotel) => hotel.id);
            fetchHotelDetails(hotelIds);
        } else {
            setDetailedHotels([]);
        }
    }, [hotels, searchParams.priceRange, searchParams.rating, searchParams.sortBy]);

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
                                <h3>Found {filteredHotels.length} hotels</h3>
                                {searchParams.location && (
                                    <p>
                                        Searching for hotels in: <strong>{searchParams.location}</strong>
                                    </p>
                                )}
                            </div>
                            {loadingDetails && (
                                <div className="alert alert-info alert-loading " role="alert">
                                    <div className="spinner-border" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </div>{" "}
                                    Loading detailed hotel information...
                                </div>
                            )}
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    <strong>Search Error:</strong> {error}
                                    <button
                                        type="button"
                                        className="btn-close float-end"
                                        onClick={clearError}
                                        aria-label="Close"
                                    ></button>
                                </div>
                            )}

                            {loading ? (
                                <div className="text-center">
                                    <div className="spinner-border" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </div>
                                    <p className="mt-2">Searching for hotels...</p>
                                </div>
                            ) : (
                                <div className={`hotels-container ${viewMode === "grid" ? "row" : ""}`}>
                                    {filteredHotels.map((hotel) => {
                                        // Use detailed hotel information if available, otherwise fall back to basic info
                                        const detailedHotel = detailedHotels.find((dh) => dh.id === hotel.id);
                                        const displayHotel = detailedHotel || hotel;

                                        return (
                                            <div
                                                key={hotel.id}
                                                className={viewMode === "grid" ? "col-md-4 mb-4" : "mb-5"}
                                            >
                                                <Link
                                                    to={`/hotel/${hotel.id}`}
                                                    title="Explore {room.name}"
                                                    className="card hotel-card"
                                                >
                                                    <div className="card-image">
                                                        <img
                                                            src={
                                                                displayHotel.images && displayHotel.images.length > 0
                                                                    ? displayHotel.images[0].url
                                                                    : displayHotel.image ||
                                                                      fallbackImages[hotel.id % fallbackImages.length]
                                                            }
                                                            alt={displayHotel.name}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src =
                                                                    fallbackImages[hotel.id % fallbackImages.length];
                                                            }}
                                                        />
                                                        {loadingDetails && !detailedHotel && (
                                                            <div className="loading-overlay">
                                                                <div
                                                                    className="spinner-border spinner-border-sm"
                                                                    role="status"
                                                                >
                                                                    <span className="sr-only">Loading details...</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="card-content">
                                                        <h4>{displayHotel.name}</h4>
                                                        <div className="card-description">
                                                            <a>View Hotels <svg xmlns="http://www.w3.org/2000/svg" width="5" height="9" viewBox="0 0 5 9" fill="none">
<path d="M0.275377 8.58105L4.42822 4.42821L0.275378 0.275363" stroke="white" strokeWidth="0.778659"/>
</svg></a>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!loading && filteredHotels.length === 0 && (
                                <div className="text-center">
                                    <h4>No hotels found</h4>
                                    <p>Try adjusting your search criteria</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default SearchResults;

