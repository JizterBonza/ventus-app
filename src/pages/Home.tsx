import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";
import { Hotel } from "../types/search";
import { getHotelDetailsBatch } from "../utils/api";
import { interestCategories } from "../utils/interestCategories";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SearchBarNew from "../components/shared/SearchBarNew";
import PageHeader from "../components/shared/PageHeader";

import Membership from "../components/shared/Membership";
import QuoteForm from "../components/shared/QuoteForm";
import BannerCTA from "../components/shared/BannerCTA";

declare const $: any;

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { hotels, loading, error, clearError, searchByQuery } = useSearch();
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
    const [sliderReady, setSliderReady] = useState(false);
    const sliderInitializedRef = useRef(false);
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const [sliderHotels, setSliderHotels] = useState<Hotel[]>([]);
    const [loadingSliderHotels, setLoadingSliderHotels] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isNavigating, setIsNavigating] = useState(false);

    // Interest categories filter state
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>("all");
    const [filteredInterests, setFilteredInterests] = useState(interestCategories);

    // Extract unique categories and locations
    const allCategories = Array.from(new Set(interestCategories.flatMap((interest) => interest.categories))).sort();
    const allLocations = Array.from(new Set(interestCategories.map((interest) => interest.location))).sort();

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

    // Fetch slider hotels on component mount
    useEffect(() => {
        const fetchSliderHotels = async () => {
            const hotelIds = [8161, 8131, 7190, 10858, 6106, 10506, 89, 10907, 831, 9433, 508, 11063];
            setLoadingSliderHotels(true);
            try {
                const hotels = await getHotelDetailsBatch(hotelIds);
                setSliderHotels(hotels);
                console.log("Slider hotels fetched:", hotels);
            } catch (error) {
                console.error("Error fetching slider hotels:", error);
            } finally {
                setLoadingSliderHotels(false);
            }
        };

        fetchSliderHotels();
    }, []);
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
            // If detailed fetch fails, we'll still show the basic hotel information
            // Clear any partial data to avoid confusion
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

    // Interest category filter handlers
    const toggleCategory = (category: string) => {
        setSelectedCategories((prev) =>
            prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
        );
    };

    const handleLocationChange = (location: string) => {
        setSelectedLocation(location);
    };

    // Filter interests based on selected categories and location
    useEffect(() => {
        let filtered = interestCategories;

        // Filter by location
        if (selectedLocation !== "all") {
            filtered = filtered.filter((interest) => interest.location === selectedLocation);
        }

        // Filter by categories (show if ANY selected category matches)
        if (selectedCategories.length > 0) {
            filtered = filtered.filter((interest) =>
                interest.categories.some((cat) => selectedCategories.includes(cat))
            );
        }

        setFilteredInterests(filtered);
    }, [selectedCategories, selectedLocation]);


    // Cleanup slider before React updates DOM - use useLayoutEffect for synchronous cleanup
    useLayoutEffect(() => {
        return () => {
            // Destroy slider synchronously before React removes the DOM
            if (typeof $ !== "undefined" && $.fn.slick && sliderContainerRef.current) {
                try {
                    const $hotelHeaderGallery = $(sliderContainerRef.current);
                    
                    // Check if element still exists and is initialized
                    if ($hotelHeaderGallery.length > 0 && $hotelHeaderGallery.hasClass("slick-initialized")) {
                        // Remove event listener first
                        $hotelHeaderGallery.off("beforeChange");
                        
                        // Get the slick instance and destroy it properly
                        const slickInstance = $hotelHeaderGallery[0]?.slick;
                        if (slickInstance) {
                            // Destroy slider - wrap in try-catch to handle DOM errors
                            try {
                                $hotelHeaderGallery.slick("unslick");
                            } catch (slickError) {
                                // If unslick fails, try to clean up manually
                                try {
                                    // Remove slick classes and restore original structure
                                    $hotelHeaderGallery.removeClass("slick-initialized slick-slider");
                                    const $slides = $hotelHeaderGallery.find(".slick-slide");
                                    $slides.each(function(this: HTMLElement) {
                                        const $slide = $(this);
                                        const $content = $slide.contents();
                                        if ($content.length > 0) {
                                            $slide.replaceWith($content);
                                        }
                                    });
                                    // Remove slick track and list
                                    $hotelHeaderGallery.find(".slick-track, .slick-list").remove();
                                } catch (cleanupError) {
                                    // Final fallback - just remove classes
                                    console.warn("Slider cleanup failed, removing classes only");
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Silently handle errors during cleanup - element may already be removed
                    // This is expected when React unmounts the component
                } finally {
                    sliderInitializedRef.current = false;
                }
            } else {
                sliderInitializedRef.current = false;
            }
        };
    }, []); // Only cleanup on unmount

    // Slider initialization - reinitialize when hotels are loaded
    useEffect(() => {
        // Don't initialize if hotels are still loading
        if (loadingSliderHotels) {
            return;
        }

        const initSlider = () => {
            if (typeof $ !== "undefined" && $.fn.slick && sliderContainerRef.current) {
                const $hotelHeaderGallery = $(sliderContainerRef.current);
                
                // Destroy existing slider if it exists
                if ($hotelHeaderGallery.hasClass("slick-initialized")) {
                    try {
                        $hotelHeaderGallery.slick("unslick");
                    } catch (error) {
                        console.error("Error destroying existing slider:", error);
                    }
                }
                
                // Check if slider exists and is not already initialized
                if ($hotelHeaderGallery.length > 0 && !$hotelHeaderGallery.hasClass("slick-initialized")) {
                    try {
                        // Set margin immediately when Slick initializes - register BEFORE .slick() call
                        $hotelHeaderGallery.on("init", function(event: any, slick: any) {
                            const containerWidth = $hotelHeaderGallery.width() || 0;
                            if (containerWidth > 0) {
                                const track = $hotelHeaderGallery.find(".slick-track");
                                if (track.length > 0) {
                                    const isMobile = window.innerWidth <= 768;
                                    const negativeMargin = isMobile ? -52 : -(containerWidth * 0.16);
                                    track.css({
                                        marginLeft: `${negativeMargin}px`
                                    });
                                }
                            }
                        });
                        
                        $hotelHeaderGallery.slick({
                            dots: false,
                            infinite: true,
                            slidesToShow: 1,
                            slidesToScroll: 1,
                            autoplay: false,
                            arrows: false,
                            adaptiveHeight: false,
                            centerMode: true,
                            centerPadding: "0",
                            variableWidth: true,
                            speed: 600,
                            cssEase: "ease-in-out",
                        });
                        
                        // Hide default Slick arrows if they exist
                        $hotelHeaderGallery.siblings(".slick-arrow").hide();
                        $hotelHeaderGallery.find(".slick-arrow").hide();
                        
                        // Set slide widths after initialization - current slide 70%, next shows 30%
                        setTimeout(() => {
                            const containerWidth = $hotelHeaderGallery.width() || 0;
                            if (containerWidth > 0) {
                                const isMobile = window.innerWidth <= 768;
                                // Current slide: 70% (or 87.5% on mobile to show 1/8 of next)
                                // Next slide will show 30% (or 12.5% on mobile)
                                // Add gap between slides (30px to match CSS)
                                const gap = 30;
                                const availableWidth = containerWidth - gap;
                                const currentSlideRatio = isMobile ? 0.875 : 0.70; // 70% desktop, 87.5% mobile
                                const slideWidth = availableWidth * currentSlideRatio;
                                
                                // Apply width to all slides (non-cloned)
                                const slickSlides = $hotelHeaderGallery.find(".slick-slide:not(.slick-cloned)");
                                slickSlides.each(function(this: HTMLElement, index: number) {
                                    const $slide = $(this);
                                    const isFirstSlide = index === 0;
                                    const minWidthValue = isFirstSlide ? slideWidth * 1.1 : slideWidth; // 10% larger minWidth for first slide
                                    
                                    $slide.css({
                                        width: `${slideWidth}px`,
                                        minWidth: `${minWidthValue}px`,
                                        maxWidth: `${slideWidth}px`,
                                        marginRight: `${gap}px`
                                    });
                                });
                                
                                // Also apply to cloned slides for infinite mode
                                $hotelHeaderGallery.find(".slick-slide.slick-cloned").each(function(this: HTMLElement, index: number) {
                                    const $slide = $(this);
                                    const slideWidth = availableWidth * currentSlideRatio;
                                    $slide.css({
                                        width: `${slideWidth}px`,
                                        minWidth: `${slideWidth}px`,
                                        maxWidth: `${slideWidth}px`,
                                        marginRight: `${gap}px`
                                    });
                                });
                                
                                // Add negative margin-left to track immediately on first load
                                const track = $hotelHeaderGallery.find(".slick-track");
                                if (track.length > 0) {
                                    const isMobile = window.innerWidth <= 768;
                                    const negativeMargin = isMobile ? -43 : -(containerWidth * 0.16); // -16% desktop, -52px mobile
                                    track.css({
                                        marginLeft: `${negativeMargin}px`
                                    });
                                }
                                
                                // Ensure overflow is hidden
                                $hotelHeaderGallery.css({
                                    overflow: "hidden"
                                });
                                
                                // Force Slick to recalculate
                                const slickInstance = $hotelHeaderGallery[0]?.slick;
                                if (slickInstance && slickInstance.setPosition) {
                                    slickInstance.setPosition();
                                }
                            }
                        }, 100);
                        
                        // Also set margin immediately after Slick initializes (backup to ensure it's applied)
                        setTimeout(() => {
                            const containerWidth = $hotelHeaderGallery.width() || 0;
                            if (containerWidth > 0) {
                                const track = $hotelHeaderGallery.find(".slick-track");
                                if (track.length > 0) {
                                    const isMobile = window.innerWidth <= 768;
                                    const negativeMargin = isMobile ? -52 : -(containerWidth * 0.16);
                                    track.css({
                                        marginLeft: `${negativeMargin}px`
                                    });
                                }
                            }
                        }, 50);
                        
                        // Update on resize
                        let resizeTimer: NodeJS.Timeout;
                        $(window).on("resize.sliderWidths", () => {
                            clearTimeout(resizeTimer);
                            resizeTimer = setTimeout(() => {
                                const containerWidth = $hotelHeaderGallery.width() || 0;
                                if (containerWidth > 0) {
                                    const isMobile = window.innerWidth <= 768;
                                    const gap = 30; // Match CSS gap
                                    const availableWidth = containerWidth - gap;
                                    const currentSlideRatio = isMobile ? 0.875 : 0.70; // 70% desktop
                                    const slideWidth = availableWidth * currentSlideRatio;
                                    
                                    // Apply width to all slides (non-cloned)
                                    const slickSlides = $hotelHeaderGallery.find(".slick-slide:not(.slick-cloned)");
                                    slickSlides.each(function(this: HTMLElement, index: number) {
                                        const $slide = $(this);
                                        const isFirstSlide = index === 0;
                                        const minWidthValue = isFirstSlide ? slideWidth * 1.1 : slideWidth; // 10% larger minWidth for first slide
                                        
                                        $slide.css({
                                            width: `${slideWidth}px`,
                                            minWidth: `${minWidthValue}px`,
                                            maxWidth: `${slideWidth}px`,
                                            marginRight: `${gap}px`
                                        });
                                    });
                                    
                                    // Also apply to cloned slides for infinite mode
                                    $hotelHeaderGallery.find(".slick-slide.slick-cloned").each(function(this: HTMLElement) {
                                        const $slide = $(this);
                                        $slide.css({
                                            width: `${slideWidth}px`,
                                            minWidth: `${slideWidth}px`,
                                            maxWidth: `${slideWidth}px`,
                                            marginRight: `${gap}px`
                                        });
                                    });
                                    
                                    // Add negative margin-left to track to ensure only 2 images show
                                    const track = $hotelHeaderGallery.find(".slick-track");
                                    if (track.length > 0) {
                                        const isMobile = window.innerWidth <= 768;
                                        const negativeMargin = isMobile ? -52 : -(containerWidth * 0.16); // -16% desktop, -52px mobile
                                        track.css({
                                            marginLeft: `${negativeMargin}px`
                                        });
                                    }
                                    
                                    // Ensure overflow is hidden
                                    $hotelHeaderGallery.css({
                                        overflow: "hidden"
                                    });
                                    
                                    const slickInstance = $hotelHeaderGallery[0]?.slick;
                                    if (slickInstance && slickInstance.setPosition) {
                                        slickInstance.setPosition();
                                    }
                                }
                            }, 150);
                        });
                        
                        // Update on slide change
                        $hotelHeaderGallery.on("afterChange", function(event: any, slick: any, currentSlideIndex: number) {
                            const totalSlides = sliderHotels.length || 12;
                            const realSlideIndex = currentSlideIndex % totalSlides;
                            setCurrentSlide(realSlideIndex);
                            
                            // Update track margin on slide change to ensure only 2 images show and prevent left edge from showing
                            const containerWidth = $hotelHeaderGallery.width() || 0;
                            if (containerWidth > 0) {
                                const track = $hotelHeaderGallery.find(".slick-track");
                                if (track.length > 0) {
                                    // Use -16% desktop, -52px mobile
                                    const isMobile = window.innerWidth <= 768;
                                    const negativeMargin = isMobile ? -52 : -(containerWidth * 0.16); // -16% desktop, -52px mobile
                                    setTimeout(() => {
                                        track.css({
                                            marginLeft: `${negativeMargin}px`
                                        });
                                    }, 50);
                                    
                                    // Also ensure overflow is hidden on the container
                                    $hotelHeaderGallery.css({
                                        overflow: "hidden"
                                    });
                                }
                            }
                        });
                        
                        // Also update on beforeChange to prevent flicker and left edge showing
                        $hotelHeaderGallery.on("beforeChange", function(event: any, slick: any, currentSlide: number, nextSlide: number) {
                            const containerWidth = $hotelHeaderGallery.width() || 0;
                            if (containerWidth > 0) {
                                const track = $hotelHeaderGallery.find(".slick-track");
                                if (track.length > 0) {
                                    // Set margin immediately before transition to prevent left edge from showing
                                    const isMobile = window.innerWidth <= 768;
                                    const negativeMargin = isMobile ? -52 : -(containerWidth * 0.16); // -16% desktop, -52px mobile
                                    // Apply immediately to prevent left edge from showing
                                    track.css({
                                        marginLeft: `${negativeMargin}px`
                                    });
                                }
                                
                                // Ensure overflow is hidden
                                $hotelHeaderGallery.css({
                                    overflow: "hidden"
                                });
                            }
                        });

                        setSliderReady(true);
                        sliderInitializedRef.current = true;
                    } catch (error) {
                        console.error("Error initializing slider:", error);
                        sliderInitializedRef.current = false;
                    }
                }
            } else {
                console.warn("Slick slider library not loaded");
            }
        };

        // Wait for DOM to be ready and images to start loading
        const timer = setTimeout(initSlider, 500);

        // Cleanup function to destroy slider when component unmounts or hotels change
        return () => {
            clearTimeout(timer);
            // Remove resize event listener
            if (typeof $ !== "undefined") {
                $(window).off("resize.sliderWidths");
            }
        };
    }, [sliderHotels, loadingSliderHotels]);

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <i key={i} className={`star-rating ${i < rating ? "active" : ""}`}></i>
        ));
    };

    return (
        <div className="search-page">
            <Header />
            {/* <PageHeader
                title="Discover Your Dream Destinations"
                text="Browse some of our favourite destinations below. If you don't see the place you have in mind, just get in touch. We work with an extensive collection of handpicked luxury hotels across the globe, in the most extraordinary and sought after locations."
                backgroundImage="/assets/img/slider/1.jpg"
            /> */}
            {/* Search Form */}
            <SearchBarNew />
            <br />
            <div className="container">
                <div className="page-header-content" style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ color: "#000" }}>VENTUS' PICKS</h2>
                    <div className="slider-controls" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button 
                            className="slick-prev-custom" 
                            onClick={() => {
                                if (isNavigating || !sliderContainerRef.current || typeof $ === "undefined") return;
                                setIsNavigating(true);
                                try {
                                    $(sliderContainerRef.current).slick("slickPrev");
                                } catch (error) {
                                    console.error("Error navigating:", error);
                                }
                                setTimeout(() => setIsNavigating(false), 300);
                            }}
                            disabled={isNavigating}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: isNavigating ? "not-allowed" : "pointer",
                                padding: "5px",
                                fontSize: "20px",
                                color: isNavigating ? "#ccc" : "#000",
                                opacity: isNavigating ? 0.5 : 1
                            }}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="5" height="9" viewBox="0 0 5 9" fill="none">
<path d="M4.53027 0.265167L0.530273 4.26517L4.53027 8.26517" stroke="black" stroke-width="0.75"/>
</svg>
                        </button>
                        <span className="slider-counter" style={{ fontSize: "14px", color: "#000", minWidth: "40px", textAlign: "center" }}>
                            {sliderHotels.length > 0 ? `${currentSlide + 1}/${sliderHotels.length}` : "1/12"}
                        </span>
                        <button 
                            className="slick-next-custom" 
                            onClick={() => {
                                if (isNavigating || !sliderContainerRef.current || typeof $ === "undefined") return;
                                setIsNavigating(true);
                                try {
                                    $(sliderContainerRef.current).slick("slickNext");
                                } catch (error) {
                                    console.error("Error navigating:", error);
                                }
                                setTimeout(() => setIsNavigating(false), 300);
                            }}
                            disabled={isNavigating}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: isNavigating ? "not-allowed" : "pointer",
                                padding: "5px",
                                fontSize: "20px",
                                color: isNavigating ? "#ccc" : "#000",
                                opacity: isNavigating ? 0.5 : 1
                            }}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="5" height="9" viewBox="0 0 5 9" fill="none">
<path d="M0.265137 8.26517L4.26514 4.26517L0.265137 0.265167" stroke="black" stroke-width="0.75"/>
</svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Hero Slider Section */}
            <section className="page-header" style={{  overflow: "hidden", position: "relative" }}>
                {(!sliderReady || loadingSliderHotels) && (
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10
                    }}>
                        <div className="spinner-border" role="status" style={{ width: "2rem", height: "2rem" }}>
                            <span className="sr-only">Loading...</span>
                        </div>
                    </div>
                )}
                <div
                    ref={sliderContainerRef}
                    className="hotel-header-gallery"
                    style={{ 
                        opacity: sliderReady ? 1 : 0, 
                        transition: "opacity 0.3s ease-in-out", 
                        position: "relative", 
                        overflow: "hidden",
                        width: "100%",
                        height: "100%"
                    }}
                >
                    {loadingSliderHotels ? (
                        <div className="hotel-header-gallery-item" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <div className="spinner-border text-light" role="status">
                                <span className="sr-only">Loading...</span>
                            </div>
                        </div>
                    ) : sliderHotels.length > 0 ? (
                        sliderHotels.map((hotel, index) => {
                            const imageUrl = hotel.images && hotel.images.length > 0 
                                ? hotel.images[0].url 
                                : hotel.image || fallbackImages[index % fallbackImages.length];
                            
                            return (
                                <Link
                                    key={hotel.id || index}
                                    to={`/hotel/${hotel.id}`}
                                    className="hotel-header-gallery-item"
                                    style={{ 
                                        width: "100%", 
                                        height: "100%", 
                                        overflow: "hidden",
                                        display: "block",
                                        textDecoration: "none",
                                        cursor: "pointer"
                                    }}
                                >
                                    <img
                                        src={imageUrl}
                                        alt={hotel.name || `Hotel ${index + 1}`}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block"
                                        }}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = fallbackImages[index % fallbackImages.length];
                                        }}
                                    />
                                    <div className="slider-overlay">
                                        <div className="slider-content">
                                            <h2>{hotel.name || "Luxury Hotel"}</h2>
                                            <p>{hotel.location || "Premium Destination"}</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    ) : (
                        // Fallback to static images if no hotels loaded
                        [
                            "/assets/img/slider/1.jpg",
                            "/assets/img/slider/2.jpg",
                            "/assets/img/slider/3.jpg",
                            "/assets/img/slider/4.jpg",
                            "/assets/img/slider/5.jpg",
                            "/assets/img/slider/6.jpg",
                            "/assets/img/slider/7.jpg",
                        ].map((image, index) => (
                            <div key={index} className="hotel-header-gallery-item" style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                                <img
                                    src={image}
                                    alt={`Slider ${index + 1}`}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: "block"
                                    }}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = fallbackImages[index % fallbackImages.length];
                                    }}
                                />
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Filters and Results */}
            <section className={`results-section  ${filteredHotels.length > 0 ? "has-results" : ""}`}>
                <div className="container">
                    <div className="row">
                        {/* Filters Sidebar */}
                        {/* <div className="col-md-3">
              <div className="filters-sidebar">
                <h4>Filters</h4>
                
                <div className="filter-group">
                  <h5>Price Range</h5>
                  <select
                    className="form-control"
                    value={searchParams.priceRange}
                    onChange={(e) => handleInputChange('priceRange', e.target.value)}
                  >
                    <option value="all">All Prices</option>
                    <option value="low">Under $200</option>
                    <option value="medium">$200 - $300</option>
                    <option value="high">Over $300</option>
                  </select>
                </div>

                <div className="filter-group">
                  <h5>Rating</h5>
                  <select
                    className="form-control"
                    value={searchParams.rating}
                    onChange={(e) => handleInputChange('rating', e.target.value)}
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="3">3+ Stars</option>
                  </select>
                </div>

                <div className="filter-group">
                  <h5>Sort By</h5>
                  <select
                    className="form-control"
                    value={searchParams.sortBy}
                    onChange={(e) => handleInputChange('sortBy', e.target.value)}
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="distance">Distance</option>
                  </select>
                </div>

                <div className="filter-group">
                  <h5>View Mode</h5>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setViewMode('grid')}
                    >
                      <i className="fa fa-th"></i> Grid
                    </button>
                    <button
                      type="button"
                      className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setViewMode('list')}
                    >
                      <i className="fa fa-list"></i> List
                    </button>
                  </div>
                </div>
              </div>
            </div> */}

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
                                                   {/* <div className="card-overlay">Find out more</div> */} 
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
<path d="M0.275377 8.58105L4.42822 4.42821L0.275378 0.275363" stroke="white" stroke-width="0.778659"/>
</svg></a>
                                                            {/* 
                                                            {displayHotel.description
                                                                ? displayHotel.description.length > 150
                                                                    ? `${displayHotel.description.substring(0, 150)}...`
                                                                    : displayHotel.description
                                                                : "No description available"}

                                                                */}
                                                        </div>
                                                        {/* 
                                                        <div className="card-info has-border">
                                                            <ul className="card-amenities">
                                                                {(displayHotel.amenities || [])
                                                                    .slice(0, 3)
                                                                    .map((amenity, index) => (
                                                                        <li key={index} className="amenity-tag">
                                                                            {amenity}
                                                                        </li>
                                                                    ))}
                                                                {(displayHotel.amenities || []).length > 3 && (
                                                                    <li className="amenity-tag">
                                                                        +{(displayHotel.amenities || []).length - 3}
                                                                        &nbsp; more
                                                                    </li>
                                                                )}
                                                                {(!displayHotel.amenities ||
                                                                    displayHotel.amenities.length === 0) && (
                                                                    <li className="amenity-tag">
                                                                        Amenities not available
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                        <div className="card-actions">
                                                            <div className="card-price">
                                                                <span className="price-label">from</span>
                                                                <span className="price-amount">
                                                                    ${displayHotel.price}/night
                                                                </span>
                                                            </div>
                                                        </div>
                                                        */}
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

            <section className="interests-section">
                <div className="container">
                    {/* Filters */}
                    <div className="interests-filters">
                        <div className="filter-row">
                            {/* <div className="filter-group">
                                <label className="filter-label">Filter by Interest:</label>
                                <div className="category-filters">
                                    {allCategories.map((category) => (
                                        <button
                                            key={category}
                                            className={`category-filter-btn ${
                                                selectedCategories.includes(category) ? "active" : ""
                                            }`}
                                            onClick={() => toggleCategory(category)}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div> */}
                            {/* <div className="filter-group">
                                <label className="filter-label">Location:</label>
                                <select
                                    className="location-filter-dropdown form-select"
                                    value={selectedLocation}
                                    onChange={(e) => handleLocationChange(e.target.value)}
                                >
                                    <option value="all">All Locations</option>
                                    {allLocations.map((location) => (
                                        <option key={location} value={location}>
                                            {location}
                                        </option>
                                    ))}
                                </select>
                            </div> */}
                        </div>
                        {(selectedCategories.length > 0 || selectedLocation !== "all") && (
                            <div className="filter-summary">
                                Showing {filteredInterests.length} of {interestCategories.length} interests
                                <button
                                    className="clear-filters-btn"
                                    onClick={() => {
                                        setSelectedCategories([]);
                                        setSelectedLocation("all");
                                    }}
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>


                    
                    <div className="col-md-12">
                        <div className="results-header">
                            <h3>INSPIRATION</h3>
                        </div>
                    </div>
                    {/* Interest Cards */}
                    <div className="row">
                        {filteredInterests.map((interest) => {
                            const handleInterestClick = () => {
                                const query = interest.query;
                                if (query) {
                                    // Navigate to search results page with the query, just like the Search Button does
                                    const urlParams = new URLSearchParams();
                                    urlParams.set("location", query);
                                    const searchUrl = `/search-results?${urlParams.toString()}`;
                                    navigate(searchUrl);
                                }
                            };

                            return (
                                <div key={interest.id} className="col-md-4 mb-4">
                                    <div className="card interest-card">
                                    {/* 
                                        <div className="card-overlay">Find out more</div>
                                        <div className="card-categories">
                                            {interest.categories.map((category, index) => (
                                                <span key={index} className="category-tag">
                                                    {category}
                                                </span>
                                            ))}
                                        </div>
                                        */}
                                        <div 
                                            className="card-image"
                                            onClick={handleInterestClick}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <img src={interest.image} alt={interest.title} />
                                        </div>
                                        <div className="card-content">
                                            <h4 
                                                onClick={handleInterestClick}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {interest.title}
                                            </h4>
                                            <div className="card-description">{interest.description}</div>
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleInterestClick();
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                View Hotels <svg xmlns="http://www.w3.org/2000/svg" width="5" height="9" viewBox="0 0 5 9" fill="none">
<path d="M0.275377 8.58105L4.42822 4.42821L0.275378 0.275363" stroke="white" stroke-width="0.778659"/>
</svg></a>
                                        </div>
                                        
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* No results message */}
                    {filteredInterests.length === 0 && (
                        <div className="text-center no-results">
                            <h4>No interests match your filters</h4>
                            <p>Try adjusting your filter criteria</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setSelectedCategories([]);
                                    setSelectedLocation("all");
                                }}
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            </section>
            <Membership />
            <QuoteForm />
            <BannerCTA />
            <Footer />
        </div>
    );
};

export default Home;
