import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getHotelDetails, searchHotelsByQuery } from "../utils/api";
import { Hotel, HotelImage } from "../types/search";
import Breadcrumb from "../components/shared/Breadcrumb";
import BookingForm from "../components/shared/BookingForm";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { useAuth } from "../contexts/AuthContext";
import SearchBarNew from "../components/shared/SearchBarNew";

import QuoteForm from "../components/shared/QuoteForm";
import BannerCTA from "../components/shared/BannerCTA";

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
    const { isAuthenticated } = useAuth();
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

    const [showGallery, setShowGallery] = useState(false);

    useEffect(() => {
    if (showGallery) {
        // init slick only when modal becomes visible
        if (typeof $ !== 'undefined' && $.fn.slick) {
        const $el = $('.modal-hotel-gallery');
        if ($el.length && !$el.hasClass('slick-initialized')) {
            $el.slick({
            dots: false,
            infinite: true,
            speed: 1000,
            slidesToShow: 1,
            slidesToScroll: 1,
            autoplay: false,
            arrows: true,
            cssEase: "linear",
            pauseOnHover: true
            });
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
                        console.log("Slider destroyed");
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
                console.log('Fetching related hotels for location:', hotel.location);
                
                // Search for hotels in the same location
                const searchResults = await searchHotelsByQuery(hotel.location, 10);
                
                // Filter out the current hotel and limit to 3 results
                const filteredHotels = searchResults
                    .filter(h => h.id !== hotel.id)
                    .slice(0, 3);
                
                setRelatedHotels(filteredHotels);
                console.log('Related hotels fetched:', filteredHotels);
            } catch (error) {
                console.error('Error fetching related hotels:', error);
                // Keep empty array on error
                setRelatedHotels([]);
            }
        };

        fetchRelatedHotels();
    }, [hotel]);

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
        <SearchBarNew />
            
            <section className="header-image-container" onClick={() => setShowGallery(true)}>
                    <img
                        src={hotelImages[0]}
                        alt={`${hotel.name}`}
                        style={{ width: '100%', height: '500px', objectFit: 'cover' }}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = fallbackImages[0];
                        }}
                    />
                    <div className="view-btn">
                        <span>View all {hotelImages.length} photos</span>
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
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = fallbackImages[index];
                                    }}
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
                                <h1>{hotel.name}</h1>
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
                                <div> <strong>Rating</strong>
                                        <div className="hotel-rating">
                                           
                                            {renderStars(hotel.rating || 0)}
                                            <span className="rating-text">{hotel.rating || "N/A"}/5</span>
                                            {hotel.reviewCount && <span className="review-count">({hotel.reviewCount} reviews)</span>}
                                        </div>
                                        </div>
                                    {/* Hotel Groups/Brands 
                                    {hotel.hotel_groups && hotel.hotel_groups.length > 0 && (
                                        <div className="hotel-groups mb-2">
                                            {hotel.hotel_groups.map((group, index) => (
                                                <span key={group.id} className="badge bg-primary me-2"></span>
                                            ))}
                                        </div>
                                    )}
                                    */}
                                    <div><strong>Address</strong>  {hotel.address && <p className="hotel-address">{hotel.address}</p>}</div>
                                   
                                    <div><strong>Distance</strong>  {hotel.distance && <p className="hotel-distance">{hotel.distance}</p>}</div>
                                     
                                    {/* Amenities */}
                                    <div>
                                        <strong>Hotel Amenities</strong> {hotel.amenities.join(", ")}
                                    </div>
                                    <div>
                                        <strong>Starting from</strong> ${hotel.price || "N/A"}/night
                                    </div>

                                </div>

                            </div>
                        
                            
                          
                            <div className="header-hotel-details">
                              
                            </div>
                        </div>
                        {/* Sidebar - Show benefits if logged in, membership if logged out */}
                    <div className="hotel-content_sidebar">
                        {isAuthenticated ? (
                            // Show benefits if logged in and benefits exist
                            hotel.benefits && hotel.benefits.length > 0 ? (
                                <div className="hotel-benefits">
                                    <div className="hotel-benefits_heading">
                                        <h3>Your Benefits</h3>
                                        <img src="/assets/img/ventus-logo.png" />
                                    </div>
                                    <div className="hotel-benefits_cont">
                                        <ul>
                                            {hotel.benefits.map((benefit, index) => (
                                                <li key={index}>{benefit}</li>
                                            ))}
                                        </ul>
                                    
                                        {hotel.benefits_footnotes && hotel.benefits_footnotes.length > 0 && (
                                            <div className="benefits-footnotes">
                                                {hotel.benefits_footnotes.map((footnote, index) => (
                                                    <p key={index} className="footnote-text">{footnote}</p>
                                                ))}
                                            </div>
                                        )}
                                        <a href="" className="btn btn-primary">Get a trip quote</a>
                                    </div>
                                </div>
                            ) : null
                        ) : (
                            // Show membership section if logged out
                            <div className="section-membership">
                                <div className="section-membership-content text-center">
                                    <div className="membership-content_heading">
                                        <img src="/assets/img/ventus-logo.png" />
                                        <h3>Join now to unlock exclusive member benefits</h3>
                                        <Link to="/signup" className="btn btn-primary btn-lg">Join Now</Link>
                                    </div>
                                    <div className="membership-content_foot">
                                        <p>Already have an account? Sign in <Link to="/login">here</Link></p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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
                                                {info.description.map((item, itemIndex) => (
                                                    <li key={itemIndex}>{item}</li>
                                                ))}
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
                            {relatedHotels.map((relatedHotel) => (
                                <div key={relatedHotel.id} className="col-md-4 mb-4">
                                    <Link className="card interest-card" to={`/hotel/${relatedHotel.id}`}>
                                        <div className="card-image">
                                            <img 
                                                src={relatedHotel.image || relatedHotel.images?.[0]?.url || fallbackImages[0]} 
                                                alt={relatedHotel.name}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = fallbackImages[0];
                                                }}
                                            />
                                        </div>
                                        <div className="card-content">
                                            <h4>{relatedHotel.name}</h4>
                                            <div className="card-description">
                                                {relatedHotel.address || relatedHotel.location}
                                            </div>
                                        
                                            <a>
                                                View Hotel 
                                                <svg xmlns="http://www.w3.org/2000/svg" width="5" height="9" viewBox="0 0 5 9" fill="none">
                                                    <path d="M0.275377 8.58105L4.42822 4.42821L0.275378 0.275363" stroke="white" strokeWidth="0.778659"/>
                                                </svg>
                                            </a>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
         
            {/* 
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
            */}
              <BannerCTA />
              <QuoteForm />
            <Footer />
        </div>
    );
};

export default HotelDetail;
