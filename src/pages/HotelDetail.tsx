import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getHotelDetails, searchHotelsByQuery, getHotelDetailsBatch } from "../utils/api";
import { Hotel, HotelImage, AvailabilityResponse } from "../types/search";
import Breadcrumb from "../components/shared/Breadcrumb";
import BookingForm from "../components/shared/BookingForm";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { useAuth } from "../contexts/AuthContext";
import SearchBarNew from "../components/shared/SearchBarNew";
import { isFavourite, toggleFavourite } from "../utils/favouritesService";
import { getLiveNightlyPrice } from "../utils/livePricing";

import QuoteForm from "../components/shared/QuoteForm";
import BannerCTA from "../components/shared/BannerCTA";
import CheckAvailability from "../components/shared/CheckAvailability";
import SubscriptionModal from "../components/shared/SubscriptionModal";

interface Room {
    id: number;
    name: string;
    type: string;
    price: number;
    capacity: number;
    image: string;
    available: boolean;
    amenities: string[];
}

interface Review {
    id: number;
    author: string;
    rating: number;
    date: string;
    comment: string;
    helpful: number;
}

interface SimilarHotel {
    id: number;
    name: string;
    location: string;
    rating: number;
    price: number;
    image: string;
}

const getLiveHotelBenefits = (result: AvailabilityResponse | null) => {
    if (!result?.is_available) return null;
    const benefits = new Set<string>();
    const footnotes = new Set<string>();
    for (const value of Array.isArray(result.hotel_info?.benefits) ? result.hotel_info.benefits : []) {
        if (typeof value === "string" && value.trim()) benefits.add(value.trim());
    }
    for (const value of Array.isArray(result.hotel_info?.benefits_footnotes) ? result.hotel_info.benefits_footnotes : []) {
        if (typeof value === "string" && value.trim()) footnotes.add(value.trim());
    }
    for (const room of Array.isArray(result.room_types) ? result.room_types : []) {
        for (const rate of Array.isArray(room.rates) ? room.rates : []) {
            for (const value of [...(rate.benefits || []), ...(rate.additional_benefits || [])]) {
                if (typeof value === "string" && value.trim()) benefits.add(value.trim());
            }
            for (const value of rate.benefits_footnotes || []) {
                if (typeof value === "string" && value.trim()) footnotes.add(value.trim());
            }
        }
    }
    return { benefits: Array.from(benefits), footnotes: Array.from(footnotes) };
};

declare const $: any;

const HotelDetail: React.FC = () => {
    const [sliderReady, setSliderReady] = useState(false);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, hasActiveMembership } = useAuth();
    const [hotel, setHotel] = useState<Hotel | null>(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [bookingData, setBookingData] = useState({
        checkIn: "",
        checkOut: "",
        adults: "1",
        children: "0",
        rooms: "1",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFav, setIsFav] = useState(false);
    const [availabilityResult, setAvailabilityResult] = useState<AvailabilityResponse | null>(null);
    const [availabilityFormData, setAvailabilityFormData] = useState<{
        start_date: string;
        end_date: string;
        adults: number;
        currency: string;
        initialRooms?: Array<{ adults: number; children: Array<{ age: number }> }>;
    } | null>(null);
    const [selectedAvailabilityRateIndex, setSelectedAvailabilityRateIndex] = useState<string | undefined>(undefined);
    const [availabilityRefreshNonce, setAvailabilityRefreshNonce] = useState(0);
    const [availabilityStatus, setAvailabilityStatus] = useState<"checking" | "ready" | "error">("checking");
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const liveHotelBenefits = useMemo(() => getLiveHotelBenefits(availabilityResult), [availabilityResult]);
    const liveNightlyPrice = useMemo(
        () => getLiveNightlyPrice(availabilityResult, availabilityFormData?.currency),
        [availabilityResult, availabilityFormData?.currency],
    );

    // Mock rooms data (since API might not provide room details)
    const mockRooms: Room[] = [
        {
            id: 1,
            name: "Deluxe King Room",
            type: "King Bed",
            price: hotel?.price || 299,
            capacity: 2,
            image: "/assets/img/rooms/1.jpg",
            available: true,
            amenities: ["Free WiFi", "Air Conditioning", "Private Bathroom", "Mini Bar", "Room Service"],
        },
        {
            id: 2,
            name: "Executive Suite",
            type: "King Bed + Living Room",
            price: (hotel?.price || 299) + 200,
            capacity: 3,
            image: "/assets/img/rooms/2.jpg",
            available: true,
            amenities: [
                "Free WiFi",
                "Air Conditioning",
                "Private Bathroom",
                "Mini Bar",
                "Room Service",
                "Living Room",
                "City View",
            ],
        },
        {
            id: 3,
            name: "Presidential Suite",
            type: "King Bed + Living Room + Dining",
            price: (hotel?.price || 299) + 600,
            capacity: 4,
            image: "/assets/img/rooms/3.jpg",
            available: true,
            amenities: [
                "Free WiFi",
                "Air Conditioning",
                "Private Bathroom",
                "Mini Bar",
                "Room Service",
                "Living Room",
                "Dining Room",
                "City View",
                "Butler Service",
            ],
        },
    ];

    // Mock reviews data
    const mockReviews: Review[] = [
        {
            id: 1,
            author: "Sarah Johnson",
            rating: 5,
            date: "2024-01-15",
            comment:
                "Absolutely amazing experience! The service was impeccable and the rooms were spotless. Will definitely return.",
            helpful: 24,
        },
        {
            id: 2,
            author: "Michael Chen",
            rating: 5,
            date: "2024-01-10",
            comment: "Great location, beautiful hotel, and excellent staff. The spa was a highlight of our stay.",
            helpful: 18,
        },
        {
            id: 3,
            author: "Emily Rodriguez",
            rating: 4,
            date: "2024-01-05",
            comment: "Very nice hotel with good amenities. The only minor issue was the slow WiFi in our room.",
            helpful: 12,
        },
    ];

    // Mock similar hotels data
    const mockSimilarHotels: SimilarHotel[] = [
        {
            id: 2,
            name: "Grand Plaza Hotel",
            location: hotel?.location || "Unknown Location",
            rating: 4,
            price: (hotel?.price || 299) - 100,
            image: "/assets/img/rooms/2.jpg",
        },
        {
            id: 7,
            name: "Luxury Tower Hotel",
            location: hotel?.location || "Unknown Location",
            rating: 5,
            price: (hotel?.price || 299) + 150,
            image: "/assets/img/rooms/7.jpg",
        },
        {
            id: 8,
            name: "Business Center Hotel",
            location: hotel?.location || "Unknown Location",
            rating: 4,
            price: (hotel?.price || 299) - 110,
            image: "/assets/img/rooms/8.jpg",
        },
    ];

    useEffect(() => {
        const fetchHotelDetails = async () => {
            if (!id) {
                setError("Hotel ID is required");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // console.log("Fetching hotel details for ID:", id);
                // console.log("Environment:", process.env.NODE_ENV);
                //
                const hotelData = await getHotelDetails(parseInt(id));
                setHotel(hotelData);
                setIsFav(isFavourite(hotelData.id));
                //
                // console.log("Successfully fetched hotel details:", hotelData);
            } catch (err) {
                // console.error("Error fetching hotel details:", err);

                // Provide more specific error messages for production
                let errorMessage = "Failed to fetch hotel details";

                if (err instanceof Error) {
                    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
                        errorMessage =
                            "Network error: Unable to connect to the server. Please check your internet connection and try again.";
                    } else if (err.message.includes("CORS")) {
                        errorMessage = "Access denied: Unable to load hotel information due to security restrictions.";
                    } else if (err.message.includes("404")) {
                        errorMessage = "Hotel not found: The requested hotel could not be located.";
                    } else if (err.message.includes("403")) {
                        errorMessage = "Access forbidden: You do not have permission to view this hotel.";
                    } else {
                        errorMessage = err.message;
                    }
                }

                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchHotelDetails();
    }, [id]);

    const [showGallery, setShowGallery] = useState(false);

    useEffect(() => {
        if (showGallery) {
            // init slick only when modal becomes visible
            if (typeof $ !== 'undefined' && $.fn.slick) {
                const $el = $('.modal-hotel-gallery');
                if ($el.length && !$el.hasClass('slick-initialized')) {
                    // Check if mobile (640px and below)
                    const isMobile = window.innerWidth <= 640;
                    
                    $el.slick({
                        dots: false,
                        infinite: true,
                        speed: 300,
                        slidesToShow: 1,
                        slidesToScroll: 1,
                        autoplay: false,
                        arrows: !isMobile, // Hide arrows on mobile
                        swipe: true, // Enable swipe on mobile
                        touchMove: true, // Enable touch move
                        draggable: true, // Enable dragging
                        cssEase: "linear",
                        pauseOnHover: true,
                        prevArrow: '<button type="button" class="slick-prev"><svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 8.07107L8.07107 15.1421L8.77817 14.435L2.41421 8.07107L8.77817 1.70711L8.07107 1L1 8.07107Z" fill="#191919"></path></svg></button>',
                        nextArrow: '<button type="button" class="slick-next"><svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.77817 8.07107L1.70711 1L1 1.70711L7.36396 8.07107L1 14.435L1.70711 15.1421L8.77817 8.07107Z" fill="#191919"></path></svg></button>',
                        responsive: [
                            {
                                breakpoint: 640,
                                settings: {
                                    arrows: false, // Hide arrows at 640px and below
                                    swipe: true,
                                    touchMove: true,
                                    draggable: true
                                }
                            }
                        ]
                    });

                    // Handle window resize to update arrows
                    const handleResize = () => {
                        const isMobileNow = window.innerWidth <= 640;
                        if ($el.hasClass('slick-initialized')) {
                            $el.slick('slickSetOption', 'arrows', !isMobileNow, true);
                        }
                    };

                    window.addEventListener('resize', handleResize);

                    return () => {
                        window.removeEventListener('resize', handleResize);
                    };
                }
            }
        }
    }, [showGallery]);


      // Slider initialization
      useEffect(() => {
        const initSlider = () => {
            if (typeof $ !== "undefined" && $.fn.slick) {
                const $hotelHeaderGallery = $(".modal-hotel-gallery");
                // Check if slider exists and is not already initialized
                if ($hotelHeaderGallery.length > 0 && !$hotelHeaderGallery.hasClass("slick-initialized")) {
                    try {
                        $hotelHeaderGallery.slick({
                            dots: false,
                            infinite: true,
                            speed: 1000,
                            slidesToShow: 1,
                            slidesToScroll: 1,
                            autoplay: false,
                            arrows: true,
                            cssEase: "linear",
                        });

                      

                        setSliderReady(true);
                    } catch (error) {
                        console.error("Error initializing slider:", error);
                    }
                }
            } else {
                console.warn("Slick slider library not loaded");
            }
        };

        // Wait for DOM to be ready and images to start loading
        const timer = setTimeout(initSlider, 300);

        // Cleanup function to destroy slider when component unmounts
        return () => {
            clearTimeout(timer);
            setSliderReady(false);
            if (typeof $ !== "undefined" && $.fn.slick) {
                const $hotelHeaderGallery = $(".modal-hotel-gallery");

                // Remove event listener
                $hotelHeaderGallery.off("beforeChange");

                if ($hotelHeaderGallery.hasClass("slick-initialized")) {
                    try {
                        $hotelHeaderGallery.slick("unslick");
                        // console.log("Slider destroyed");
                    } catch (error) {
                        console.error("Error destroying slider:", error);
                    }
                }
            }
        };
    }, []);

    const [relatedHotels, setRelatedHotels] = useState<Hotel[]>([]);

    // Fetch related hotels based on location
    useEffect(() => {
        const fetchRelatedHotels = async () => {
            if (!hotel || !hotel.location) return;
            
            try {
                // console.log('Fetching related hotels for location:', hotel.location);
                //
                // Search for hotels in the same location
                const searchResults = await searchHotelsByQuery(hotel.location, 10);
                
                // Filter out the current hotel and limit to 3 results
                const filteredHotels = searchResults
                    .filter(h => h.id !== hotel.id)
                    .slice(0, 3);
                
                // Fetch detailed information for related hotels to get full image data
                if (filteredHotels.length > 0) {
                    const hotelIds = filteredHotels.map(h => h.id);
                    const detailedHotels = await getHotelDetailsBatch(hotelIds);
                    setRelatedHotels(detailedHotels);
                    // console.log('Related hotels with details fetched:', detailedHotels);
                } else {
                    setRelatedHotels([]);
                }
            } catch (error) {
                console.error('Error fetching related hotels:', error);
                // Keep empty array on error
                setRelatedHotels([]);
            }
        };

        fetchRelatedHotels();
    }, [hotel]);

    const handleAvailabilityResult = (result: any) => {
        // console.log('Availability result received:', result);
        setAvailabilityResult(result);
        setAvailabilityStatus("ready");
        setSelectedAvailabilityRateIndex(result?.selectedRateIndex || undefined);
        //
        // Extract and store form data if available
        if (result.formData) {
            setAvailabilityFormData(result.formData);
        }
        //
        // Warn if session_id is missing
        if (!result.session_id) {
            // console.warn('Availability check returned no session_id. Booking may fail.');
        }
    };

    const handleAvailabilityStart = () => {
        setAvailabilityResult(null);
        setSelectedAvailabilityRateIndex(undefined);
        setAvailabilityStatus("checking");
    };

    const handleAvailabilityError = () => {
        setAvailabilityStatus("error");
    };

    const refreshBookingAvailability = () => {
        handleAvailabilityStart();
        setAvailabilityRefreshNonce((nonce) => nonce + 1);
        document.getElementById("check-availability")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleAvailabilityRateSelected = () => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    };

    const handleBookingSuccess = (response: any) => {
        // console.log("Booking successful:", response);
        // You can add additional success handling here
        // For example, redirect to a confirmation page
    };

    const handleBookingError = (error: string) => {
        // console.error("Booking error:", error);
        // You can add additional error handling here
    };

    const handleBookingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // console.log("Booking submitted:", bookingData);
        // Handle booking logic here
    };

    const handleInputChange = (field: string, value: string) => {
        setBookingData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <i key={i} className={`star-rating ${i < rating ? "active" : ""}`}></i>
        ));
    };

    const calculateAverageRating = () => {
        if (!mockReviews) return "0";
        const total = mockReviews.reduce((sum, review) => sum + review.rating, 0);
        return (total / mockReviews.length).toFixed(1);
    };

    // Only display supplier-provided hotel images. A neutral placeholder is used
    // when an image is unavailable so unrelated stock photos never flicker in.
    const getHotelImages = (): string[] => {
        if (hotel?.images && hotel.images.length > 0) {
            return hotel.images.map((img) => img.url).filter(Boolean);
        }
        if (hotel?.image) {
            return [hotel.image];
        }
        return [];
    };

    if (loading) {
        return (
            <div className="text-center" style={{ padding: "50px" }}>
                <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
                <p className="mt-2">Loading hotel details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center" style={{ padding: "50px" }}>
                <div className="alert alert-danger" role="alert">
                    <h4>
                        <i className="fa fa-exclamation-triangle"></i> Error Loading Hotel
                    </h4>
                    <p>{error}</p>
                    <div className="mt-3">
                        <button className="btn btn-primary me-2" onClick={() => window.location.reload()}>
                            <i className="fa fa-refresh"></i> Try Again
                        </button>
                        <Link to="/search" className="btn btn-outline-primary">
                            <i className="fa fa-arrow-left"></i> Back to Search
                        </Link>
                    </div>
                    {process.env.NODE_ENV === "production" && (
                        <div className="mt-3">
                            <small className="text-muted">
                                If this problem persists, please contact support or try again later.
                            </small>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!hotel) {
        return (
            <div className="text-center" style={{ padding: "50px" }}>
                <h2>Hotel not found</h2>
                <Link to="/search" className="btn btn-primary">
                    Back to Search
                </Link>
            </div>
        );
    }

    const hotelImages = getHotelImages();

    return (
  
        <div className="hotel-detail-page">
            <Header />
            {/* Hero Section */}
        <SearchBarNew prefillLocation={hotel.name} hotelId={hotel.id} />
            
            <section className="header-image-container" onClick={() => hotelImages.length > 0 && setShowGallery(true)}>
                    {hotelImages[0] ? (
                        <img
                            src={hotelImages[0]}
                            alt={`${hotel.name}`}
                            style={{ width: '100%', height: '500px', objectFit: 'cover' }}
                            decoding="async"
                            fetchPriority="high"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : <span className="hotel-hero-image-placeholder" role="img" aria-label={`${hotel.name} image unavailable`} />}
                    <div className="view-btn">
                        <span>{hotelImages.length > 0 ? `View all ${hotelImages.length} photos` : 'Photos unavailable'}</span>
                    </div>
                </section>


            {/* Image Gallery */}
            <div className={`gallery-modal ${showGallery ? 'open' : ''}`}>
                 <button className="close-modal" onClick={() => setShowGallery(false)}>×</button>
                 
                    <div className="modal-hotel-gallery">
                        {hotelImages.slice(0, 7).map((image, index) => (
                            <div key={index} className="thumbnail-image" onClick={() => setSelectedImage(index)}>
                                <img
                                    src={image}
                                    alt={`${hotel.name} ${index + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            </div>
                        ))}
                  
                </div>
            </div>
           

            <section className="section-hotel-content">
                <div className="container">
                <div
                className={`hotel-content_left ${
                    !hotel.benefits || hotel.benefits.length === 0 ? "no-benefits" : ""
                }`}
                >

                            <div className="hotel-content_heading">
                                <h1>
                                    {hotel.name?.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ')}
                                    {isAuthenticated && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (hotel) {
                                                    if (isFav) {
                                                        // Redirect to favourites page if already in favourites
                                                        navigate('/favorites');
                                                    } else {
                                                        // Add to favourites if not already added
                                                        const newFavState = toggleFavourite(hotel);
                                                        setIsFav(newFavState);
                                                    }
                                                }
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0',
                                                marginLeft: '10px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                verticalAlign: 'middle'
                                            }}
                                            title={isFav ? "View in favourites" : "Add to favourites"}
                                        >
                                            <svg 
                                                xmlns="http://www.w3.org/2000/svg" 
                                                width="20" 
                                                height="20" 
                                                version="1.1" 
                                                viewBox="300 300 600 600"
                                                style={{
                                                    transition: 'all 0.3s ease',
                                                    overflow: 'visible'
                                                }}
                                            >
                                                {isFav ? (
                                                    // Filled heart
                                                    <path 
                                                        d="m380.26 405.68c-49.625 53.266-49.574 138.98 0 192.3l219.61 236.29c73.289-78.672 146.57-157.34 219.86-236.02 49.625-53.266 49.625-139.04 0-192.3s-129.52-53.27-179.15 0l-40.461 43.434-40.715-43.707c-49.625-53.27-129.52-53.27-179.15 0z"
                                                        fill="#d4af37"
                                                        stroke="none"
                                                    />
                                                ) : (
                                                    // Outline heart
                                                    <path d="m462.07 335.77c-40.383 0-80.762 15.816-111.23 47.703-60.941 63.773-60.863 165.97 0 229.79l232.62 243.95c4.2773 4.4922 10.211 7.0312 16.414 7.0312 6.1992 0 12.133-2.5391 16.41-7.0312 77.598-81.207 155.25-162.51 232.86-243.72 60.938-63.777 60.938-166.01 0-229.79-60.941-63.773-161.52-63.777-222.46 0l-26.688 27.629-26.688-27.867c-30.469-31.887-70.852-47.703-111.23-47.703zm0 44.398c28.188 0 56.57 11.617 78.641 34.715l42.98 45.105c4.2812 4.4922 10.211 7.0312 16.414 7.0312s12.133-2.5391 16.414-7.0312l42.746-44.871c44.145-46.199 112.9-46.199 157.05 0s44.145 121 0 167.2c-72.098 75.453-144.23 150.79-216.32 226.24l-216.32-226.48c-44.121-46.266-44.145-121 0-167.2 22.07-23.098 50.215-34.715 78.406-34.715z"/>
                                                )}
                                            </svg>
                                        </button>
                                    )}
                                </h1>
                                <span className="text">{hotel.location}</span>
                                <p>{hotel.description || "No description available for this hotel."}</p>
                            </div>
                            <div className="hotel-content_details">
                                
                                {hotel.hotel_groups && hotel.hotel_groups.length > 0 && (
                                <div className="hotel-group-logo">
                                   {hotel.hotel_groups.map((group) => (
                                                group.logo && group.logo.url && (
                                        <div className="hotel-groups-logos">
                                            
                                            
                                                    
                                                    <div key={group.id} className="hotel-group-logo-item">
                                                     
                                                        <img 
                                                            src={group.logo.thumbnail_url || group.logo.url} 
                                                            alt={group.logo.description || `${group.name} logo`}
                                                            title={group.name}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                             
                                        </div>
                                     )
                                    ))}
                                </div>
                                  )}
                                <div className="hotel-details">
                                {typeof hotel.rating === "number" && Number.isFinite(hotel.rating) && hotel.rating > 0 && <div> <strong>Rating</strong>
                                        <div className="hotel-rating">
                                           
                                            {renderStars(hotel.rating)}
                                            <span className="rating-text">{hotel.rating}/5</span>
                                            {hotel.reviewCount && <span className="review-count">({hotel.reviewCount} reviews)</span>}
                                        </div>
                                        </div>}
                                    {/* Hotel Groups/Brands 
                                    {hotel.hotel_groups && hotel.hotel_groups.length > 0 && (
                                        <div className="hotel-groups mb-2">
                                            {hotel.hotel_groups.map((group, index) => (
                                                <span key={group.id} className="badge bg-primary me-2"></span>
                                            ))}
                                        </div>
                                    )}
                                    */}
                                    {typeof hotel.address === "string" && hotel.address.trim() && <div><strong>Address</strong><p className="hotel-address">{hotel.address}</p></div>}
                                   
                                    {typeof hotel.distance === "string" && hotel.distance.trim() && <div><strong>Distance</strong><p className="hotel-distance">{hotel.distance}</p></div>}
                                     
                                    {/* Amenities */}
                                    {Array.isArray(hotel.amenities) && hotel.amenities.some((amenity) => typeof amenity === "string" && amenity.trim()) && <div>
                                        <strong>Hotel Amenities</strong> {hotel.amenities.filter((amenity) => typeof amenity === "string" && amenity.trim()).join(", ")}
                                    </div>}
                                    {hasActiveMembership && (() => {
                                        if (availabilityStatus === "checking") {
                                            return (
                                                <div>
                                                    <strong>Rate for your dates</strong>{" "}
                                                    <span className="text-muted" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                                        Checking…
                                                    </span>
                                                </div>
                                            );
                                        }
                                        if (liveNightlyPrice) {
                                            return (
                                                <div>
                                                    <strong>From</strong> {liveNightlyPrice.currency} {liveNightlyPrice.rate.toLocaleString()}/night for your dates
                                                </div>
                                            );
                                        }
                                        return (
                                            <div>
                                                <strong>Rate for your dates</strong> {availabilityResult?.is_available === false
                                                    ? "No rooms available"
                                                    : "Not available — check availability below"}
                                            </div>
                                        );
                                    })()}

                                </div>

                            </div>
                        
                            
                          
                            <div className="header-hotel-details">
                              
                            </div>
                        </div>
                        {/* Sidebar - Show benefits if logged in, membership if logged out */}
                    <div className="hotel-content_sidebar">
                        {hasActiveMembership ? (
                            <>
                                <div className="hotel-benefits">
                                    <div className="hotel-benefits_heading">
                                        <h3>Your Benefits</h3>
                                        <img src="/assets/img/ventus-logo.png" alt="Ventus Travel" />
                                    </div>
                                    <div className="hotel-benefits_cont">
                                        {availabilityStatus === "checking" ? (
                                            <p role="status">Checking live benefits and hotel credit for your dates…</p>
                                        ) : availabilityStatus === "error" ? (
                                            <p>Live benefits could not be confirmed. Check availability again below.</p>
                                        ) : (
                                            <>
                                                {!liveHotelBenefits?.benefits.length && (
                                                    <p>{hotel.benefits?.length
                                                        ? "Indicative hotel benefits; confirm the selected rate below."
                                                        : "No benefits supplied for these dates. Check the selected rate below."}</p>
                                                )}
                                                {(liveHotelBenefits?.benefits.length || hotel.benefits?.length) ? (
                                                    <ul>
                                                        {(liveHotelBenefits?.benefits.length
                                                            ? liveHotelBenefits.benefits
                                                            : hotel.benefits || []).filter((benefit) => typeof benefit === "string" && benefit.trim()).map((benefit, index) => (
                                                            <li key={index}>{benefit}</li>
                                                        ))}
                                                    </ul>
                                                ) : null}
                                            </>
                                        )}
                                        {availabilityStatus === "ready" && (liveHotelBenefits?.footnotes.length
                                            ? liveHotelBenefits.footnotes
                                            : hotel.benefits_footnotes || []).length > 0 && (
                                            <div className="benefits-footnotes">
                                                {(liveHotelBenefits?.footnotes.length
                                                    ? liveHotelBenefits.footnotes
                                                    : hotel.benefits_footnotes || []).map((footnote, index) => (
                                                    <p key={index} className="footnote-text">{footnote}</p>
                                                ))}
                                            </div>
                                        )}
                                        <a href="#check-availability" className="btn btn-primary">Book Now</a>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // Show membership section if logged out
                            <div className="section-membership">
                                <div className="section-membership-content text-center">
                                    <div className="membership-content_heading">
                                        <img src="/assets/img/ventus-logo.png" alt="Ventus Travel" />
                                        <h3>{isAuthenticated ? 'Complete membership to unlock exclusive member benefits' : 'Join now to unlock exclusive member benefits'}</h3>
                                        <button 
                                            onClick={() => setIsSubscriptionModalOpen(true)}
                                            className="btn btn-primary btn-lg"
                                        >
                                            {isAuthenticated ? 'Complete Membership' : 'Join Now'}
                                        </button>
                                    </div>
                                    <div className="membership-content_foot">
                                        <p>{isAuthenticated ? <Link to="/subscription">Continue to secure membership payment</Link> : <>Already have an account? Sign in <Link to="/login">here</Link></>}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section id="check-availability" className="section-padding availability-section">
                <div className="container">
                    <CheckAvailability
                        hotelId={hotel.id}
                        hotelName={hotel.name}
                        refreshNonce={availabilityRefreshNonce}
                        onAvailabilityStart={handleAvailabilityStart}
                        onAvailabilityError={handleAvailabilityError}
                        onAvailabilityResult={handleAvailabilityResult}
                        onRateSelected={handleAvailabilityRateSelected}
                    />
                </div>
            </section>

            {hasActiveMembership && availabilityResult?.is_available && availabilityResult.room_types?.length > 0 && selectedAvailabilityRateIndex && (
                <section id="booking" className="section-padding booking-section" style={{ paddingTop: 0 }}>
                    <div className="container">
                        <BookingForm
                            hotelId={hotel.id}
                            hotelName={hotel.name}
                            onBookingSuccess={handleBookingSuccess}
                            onBookingError={handleBookingError}
                            onRefreshAvailability={refreshBookingAvailability}
                            sessionId={availabilityResult.session_id?.trim() || undefined}
                            startDate={availabilityFormData?.start_date || ""}
                            endDate={availabilityFormData?.end_date || ""}
                            requestedCurrency={availabilityFormData?.currency}
                            initialRooms={
                                availabilityFormData
                                    ? availabilityFormData.initialRooms ?? [
                                          { adults: availabilityFormData.adults, children: [] },
                                      ]
                                    : undefined
                            }
                            rateIndex={selectedAvailabilityRateIndex}
                            availabilityResult={availabilityResult}
                        />
                    </div>
                </section>
            )}

            {hotel.hotel_information && hotel.hotel_information.length > 0 && (
                <section className="section-hotel-info">
                    <div className="container">
                        <h3 className="text-center mb-5">Hotel Information</h3>

                        {/* Hotel Information */}
                        <div className="hotel-info-list">
                            {/*
                            {hotel.fun_fact && (
                                <div className="info-card">
                                    <h5>Fun Fact</h5>
                                    <p>{hotel.fun_fact}</p>
                                </div>
                            )}

                            {hotel.unique_experiences && (
                                <div className="info-card">
                                    <h5>Unique Experiences</h5>
                                    <p>{hotel.unique_experiences}</p>
                                </div>
                            )}
                                */}
                            {hotel.hotel_information.map((info, index) => {
                                let iconSrc = '/images/info-icon.png'; // default icon
                                
                                const title = info.title.toLowerCase();
                                if (title.includes('dining')) {
                                    iconSrc = '/assets/img/hotelInfo/dining.svg';
                                } else if (title.includes('family')) {
                                    iconSrc = '/assets/img/hotelInfo/family.svg';
                                } else if (title.includes('wellness')) {
                                    iconSrc = '/assets/img/hotelInfo/wellness.svg';
                                } else if (title.includes('transport')) {
                                    iconSrc = '/assets/img/hotelInfo/transport.svg';
                                } else if (title.includes('positive impact')) {
                                    iconSrc = '/assets/img/hotelInfo/positive_impact.svg';
                                } else if (title.includes('pool')) {
                                    iconSrc = '/assets/img/hotelInfo/pool.svg';
                                } else if (title.includes('pet') && title.includes('friend')) {
                                    iconSrc = '/assets/img/hotelInfo/pet_friendly.svg';
                                } else if (title.includes('activities')) {
                                    iconSrc = '/assets/img/hotelInfo/activity.svg';
                                } 
                                
                                return (
                                    <div className="info-card" key={index}>
                                        <div className="info-card_icon">
                                            <img src={iconSrc} alt={info.title} />
                                        </div>
                                        <div className="info-card_cont">
                                            <h5>{info.title}</h5>
                                            <ul className="list-unstyled">
                                                {info.description.map((item, itemIndex) => {
                                                    const truncatedItem = item.length > 60 
                                                        ? `${item.substring(0, 60)}...` 
                                                        : item;
                                                    return (
                                                        <li key={itemIndex}>{truncatedItem}</li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
            {/* Related Hotels Section */}
            {relatedHotels.length > 0 && (
                <section className="section-related-hotels">
                    <div className="container">
                        <h3>Other Hotels in {hotel.location}</h3>
                        <div className="hotels-grid row">
                            {relatedHotels.map((relatedHotel) => {
                                // Use only the real image returned for this hotel.
                                const getRelatedHotelImage = () => {
                                    if (relatedHotel.images && relatedHotel.images.length > 0) {
                                        return relatedHotel.images[0].url;
                                    }
                                    if (relatedHotel.image) {
                                        return relatedHotel.image;
                                    }
                                    return undefined;
                                };

                                return (
                                    <div key={relatedHotel.id} className="col-md-4 mb-4">
                                        <Link className="card interest-card" to={`/hotel/${relatedHotel.id}`}>
                                            <div className="card-image">
                                                {getRelatedHotelImage() ? (
                                                    <img
                                                        src={getRelatedHotelImage()}
                                                        alt={relatedHotel.name}
                                                        loading="lazy"
                                                        decoding="async"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : <span className="related-hotel-image-placeholder" role="img" aria-label={`${relatedHotel.name} image unavailable`} />}
                                            </div>
                                        <div className="card-content">
                                            <h4>{relatedHotel.name}</h4>
                                            <div className="card-description">
                                                {relatedHotel.address || relatedHotel.location}
                                            </div>
                                        
                                            <div>
                                                View Hotel 
                                                <svg xmlns="http://www.w3.org/2000/svg" width="5" height="9" viewBox="0 0 5 9" fill="none">
                                                    <path d="M0.275377 8.58105L4.42822 4.42821L0.275378 0.275363" stroke="white" strokeWidth="0.778659"/>
                                                </svg>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
         
              <BannerCTA />
              <QuoteForm />
            <Footer />
            <SubscriptionModal 
                isOpen={isSubscriptionModalOpen} 
                onClose={() => setIsSubscriptionModalOpen(false)} 
            />
        </div>
    );
};

export default HotelDetail;
