import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";
import { Hotel } from "../types/search";
import { getHotelDetailsBatch } from "../utils/api";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SearchBarNew from "../components/shared/SearchBarNew";
import Membership from "../components/shared/Membership";
import QuoteForm from "../components/shared/QuoteForm";
import BannerCTA from "../components/shared/BannerCTA";

// Component to handle hotel image with fallback
const HotelImage: React.FC<{ hotel: Hotel; displayHotel: Hotel }> = ({ hotel, displayHotel }) => {
    const [imageError, setImageError] = useState(false);
    
    // Get image URL - prioritize images array, then image property
    const imageUrl = displayHotel.images && displayHotel.images.length > 0
        ? displayHotel.images[0].url
        : displayHotel.image || null;
    
    // Only show fallback if no image URL or if image failed to load
    if (!imageUrl || imageError) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    minHeight: "200px",
                    backgroundColor: "#28a745",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div className="spinner-border text-white" role="status" style={{ width: "3rem", height: "3rem" }}>
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }
    
    // Always try to render the image if we have a URL
    return (
        <img
            src={imageUrl}
            alt={displayHotel.name}
            style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                minHeight: "200px",
            }}
            onError={() => setImageError(true)}
        />
    );
};

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
                               <p>{filteredHotels.length} results found</p>
                            </div>

                            {loading ? (
                                <div className="text-center">
                                    <div className="spinner-border" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </div>
                                    <p className="mt-2">Searching for hotels...</p>
                                </div>
                            ) : (
                                <div className="hotels-container">
                                    {filteredHotels.map((hotel) => {
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
                                                        <HotelImage hotel={hotel} displayHotel={displayHotel} />
                                                        {loadingDetails && !detailedHotel && (
                                                            <div className="loading-overlay" style={{ backgroundColor: "rgba(219, 226, 214, 1)" }}>
                                                                <div
                                                                    className="spinner-border spinner-border-sm"
                                                                    role="status"
                                                                >
                                                                    <span className="sr-only">Loading details...</span>
                                                                </div>
                                                            </div>
                                                        )}
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
                                                            <Link 
                                                            className="text-link"
                                                                to="/login" >
                                                                Login to view benefits{" "}
                                                              
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
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
            <Membership />
            <QuoteForm />
            <BannerCTA />
            <Footer />
        </div>
    );
};

export default SearchResults;

