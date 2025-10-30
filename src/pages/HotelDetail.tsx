import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getHotelDetails } from "../utils/api";
import { Hotel, HotelImage } from "../types/search";
import Breadcrumb from "../components/shared/Breadcrumb";
import BookingForm from "../components/shared/BookingForm";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

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

declare const $: any;

const HotelDetail: React.FC = () => {
    const [sliderReady, setSliderReady] = useState(false);
    const { id } = useParams<{ id: string }>();
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

    // Fallback hotel images for when API doesn't provide images
    const fallbackImages = [
        "/assets/img/rooms/1.jpg",
        "/assets/img/rooms/2.jpg",
        "/assets/img/rooms/3.jpg",
        "/assets/img/rooms/4.jpg",
        "/assets/img/rooms/5.jpg",
    ];

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

                console.log("Fetching hotel details for ID:", id);
                console.log("Environment:", process.env.NODE_ENV);

                const hotelData = await getHotelDetails(parseInt(id));
                setHotel(hotelData);

                console.log("Successfully fetched hotel details:", hotelData);
            } catch (err) {
                console.error("Error fetching hotel details:", err);

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

    // Separate useEffect for slider initialization
    useEffect(() => {
        // Don't initialize slider until hotel data is loaded
        if (!hotel || loading) return;

        const initSlider = () => {
            if (typeof $ !== "undefined" && $.fn.slick) {
                const $hotelHeaderGallery = $(".hotel-header-gallery");
                const $hotelGallery = $(".hotel-gallery");
                // Check if slider exists and is not already initialized
                if ($hotelHeaderGallery.length > 0 && !$hotelHeaderGallery.hasClass("slick-initialized")) {
                    try {
                        $hotelHeaderGallery.slick({
                            dots: true,
                            infinite: true,
                            speed: 1000,
                            slidesToShow: 1,
                            slidesToScroll: 1,
                            autoplay: true,
                            autoplaySpeed: 5000,
                            arrows: false,
                            fade: true,
                            cssEase: "linear",
                            pauseOnHover: true,
                        });

                        $hotelGallery.slick({
                            dots: false,
                            infinite: false,
                            speed: 1000,
                            slidesToShow: 3,
                            slidesToScroll: 1,
                            autoplay: false,
                            arrows: false,
                            responsive: [
                                {
                                    breakpoint: 640,
                                    settings: {
                                        slidesToShow: 2,
                                    },
                                },
                            ],
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
                const $slider = $(".hotel-header-gallery, .hotel-gallery");
                if ($slider.hasClass("slick-initialized")) {
                    try {
                        $slider.slick("unslick");
                        console.log("Slider destroyed");
                    } catch (error) {
                        console.error("Error destroying slider:", error);
                    }
                }
            }
        };
    }, [hotel, loading]);

    const handleBookingSuccess = (response: any) => {
        console.log("Booking successful:", response);
        // You can add additional success handling here
        // For example, redirect to a confirmation page
    };

    const handleBookingError = (error: string) => {
        console.error("Booking error:", error);
        // You can add additional error handling here
    };

    const handleBookingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Booking submitted:", bookingData);
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

    // Get hotel images - use API data if available, otherwise fallback
    const getHotelImages = (): string[] => {
        if (hotel?.images && hotel.images.length > 0) {
            return hotel.images.map((img) => img.url);
        }
        if (hotel?.image) {
            return [hotel.image, ...fallbackImages.slice(1)];
        }
        return fallbackImages;
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
            <section className="page-header">
                <div
                    className="hotel-header-gallery"
                    style={{ opacity: sliderReady ? 1 : 0, transition: "opacity 0.3s ease-in-out" }}
                >
                    {hotelImages.map((image, index) => (
                        <div key={index} className="hotel-header-gallery-item">
                            <img
                                src={image}
                                alt={`${hotel.name} ${index + 1}`}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = fallbackImages[index];
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div className="container">
                    <div className="page-header-content text-center">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb">
                                <li>
                                    <Link to="/">Home</Link>
                                </li>
                                <li>&gt;</li>
                                <li>
                                    <Link to="/destinations">Destinations</Link>
                                </li>
                                <li>&gt;</li>
                                <li className="active">Details</li>
                            </ol>
                        </nav>
                        <h1>{hotel.name}</h1>
                        <div className="header-hotel-details">
                            <div className="header-hotel-detail">
                                <span className="label">Location</span>
                                <span className="text">{hotel.location}</span>
                            </div>
                            {/* Amenities */}
                            <div className="header-hotel-detail">
                                <span className="label">Hotel Amenities</span>
                                <span className="text">{hotel.amenities.join(", ")}</span>
                            </div>
                            <div className="header-hotel-detail price-detail">
                                <span className="label">Starting from</span>
                                <span className="text">${hotel.price || "N/A"}/night</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Image Gallery */}
            <section className="hotel-gallery">
                {hotelImages.map((image, index) => (
                    <div key={index} className="thumbnail-image" onClick={() => setSelectedImage(index)}>
                        <img
                            src={image}
                            alt={`${hotel.name} ${index + 1}`}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = fallbackImages[index];
                            }}
                        />
                    </div>
                ))}
            </section>

            <section className="section-text-center text-center">
                <div className="container">
                    <h2>About this hotel</h2>
                    <div className="hotel-rating">
                        {renderStars(hotel.rating || 0)}
                        <span className="rating-text">{hotel.rating || "N/A"}/5</span>
                        {hotel.reviewCount && <span className="review-count">({hotel.reviewCount} reviews)</span>}
                    </div>
                    {/* Hotel Groups/Brands */}
                    {hotel.hotel_groups && hotel.hotel_groups.length > 0 && (
                        <div className="hotel-groups mb-2">
                            {hotel.hotel_groups.map((group, index) => (
                                <span key={group.id} className="badge bg-primary me-2"></span>
                            ))}
                        </div>
                    )}

                    {hotel.address && <p className="hotel-address">{hotel.address}</p>}
                    {hotel.distance && <p className="hotel-distance">{hotel.distance}</p>}
                    <p>{hotel.description || "No description available for this hotel."}</p>
                </div>
            </section>

            {hotel.hotel_information && hotel.hotel_information.length > 0 && (
                <section className="section-hotel-info">
                    <div className="container">
                        <h3 className="text-center mb-5">Hotel Information</h3>

                        {/* Hotel Information */}
                        <div className="hotel-info-list">
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
                            {hotel.hotel_information.map((info, index) => (
                                <div className="info-card">
                                    <h5>{info.title}</h5>
                                    <ul className="list-unstyled">
                                        {info.description.map((item, itemIndex) => (
                                            <li key={itemIndex}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
            <section className="section-padding booking-section">
                <div className="container">
                    <BookingForm
                        hotelId={hotel.id}
                        hotelName={hotel.name}
                        onBookingSuccess={handleBookingSuccess}
                        onBookingError={handleBookingError}
                    />
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default HotelDetail;
