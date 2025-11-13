import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hotel } from '../types/search';
import { getFavourites, removeFavourite } from '../utils/favouritesService';
import { getHotelDetailsBatch } from '../utils/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SearchBarNew from '../components/shared/SearchBarNew';
import BannerCTA from '../components/shared/BannerCTA';

// Component to handle hotel image with fallback
const HotelImage: React.FC<{ hotel: Hotel; displayHotel: Hotel }> = ({ hotel, displayHotel }) => {
    const [imageError, setImageError] = useState(false);
    
    // Get image URL - prioritize images array, then image property
    const imageUrl = displayHotel.images && displayHotel.images.length > 0
        ? displayHotel.images[0].url
        : displayHotel.image || null;
    
    // Fallback images
    const fallbackImages = [
        "/assets/img/rooms/1.jpg",
        "/assets/img/rooms/2.jpg",
        "/assets/img/rooms/3.jpg",
        "/assets/img/rooms/4.jpg",
        "/assets/img/rooms/5.jpg",
    ];
    
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
                <img 
                    src={fallbackImages[hotel.id % fallbackImages.length]} 
                    alt={displayHotel.name}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        minHeight: "200px",
                    }}
                />
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

const Favourites: React.FC = () => {
    const [favouriteHotels, setFavouriteHotels] = useState<Hotel[]>([]);
    const [detailedHotels, setDetailedHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);

    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Load favourites and fetch detailed information
    useEffect(() => {
        const loadFavourites = async () => {
            try {
                setLoading(true);
                const favourites = getFavourites();
                setFavouriteHotels(favourites);

                // Fetch detailed information for all favourites
                if (favourites.length > 0) {
                    const hotelIds = favourites.map(h => h.id);
                    const detailed = await getHotelDetailsBatch(hotelIds);
                    setDetailedHotels(detailed);
                } else {
                    setDetailedHotels([]);
                }
            } catch (error) {
                console.error('Error loading favourites:', error);
            } finally {
                setLoading(false);
            }
        };

        loadFavourites();
    }, []);

    const handleRemoveFavourite = (hotelId: number) => {
        removeFavourite(hotelId);
        // Update the state to remove the hotel
        setFavouriteHotels(prev => prev.filter(h => h.id !== hotelId));
        setDetailedHotels(prev => prev.filter(h => h.id !== hotelId));
    };

    return (
        <div className="favourites-page">
            <Header />
            <SearchBarNew />
            
            <section className="section-padding">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            {!loading && favouriteHotels.length > 0 && (
                                <h1 className="mb-4">My Favourites</h1>
                            )}
                            
                            {loading ? (
                                <div className="text-center" style={{ padding: "50px" }}>
                                    <div className="spinner-border" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </div>
                                    <p className="mt-2">Loading your favourites...</p>
                                </div>
                            ) : favouriteHotels.length === 0 ? (
                                <div className="text-center" style={{ padding: "50px" }}>
                                    <h3>No favourites yet</h3>
                                    <p className="text-muted">Start exploring hotels and add them to your favourites!</p>
                                    <Link to="/#destination" className="btn btn-primary mt-3">
                                        Browse Hotels
                                    </Link>
                                </div>
                            ) : (
                                <div className="hotels-container">
                                    {favouriteHotels.map((hotel) => {
                                        // Use detailed hotel information if available, otherwise fall back to basic info
                                        const detailedHotel = detailedHotels.find((dh) => dh.id === hotel.id);
                                        const displayHotel = detailedHotel || hotel;

                                        return (
                                            <div
                                                key={hotel.id}
                                                className="hotel-result-row"
                                            >
                                                <div className="hotel-card">
                                                    <Link
                                                        to={`/hotel/${hotel.id}`}
                                                        className="card-image"
                                                    >
                                                        <HotelImage hotel={hotel} displayHotel={displayHotel} />
                                                    </Link>
                                                    <div className="card_content">
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
                                                                <h6>{displayHotel.location}</h6>
                                                            )}
                                                            {displayHotel.description && (
                                                                <p>
                                                                    {displayHotel.description.length > 450
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
                                                                View Hotel
                                                            </Link>
                                                            <button
                                                                onClick={() => handleRemoveFavourite(hotel.id)}
                                                                className="btn btn-outline-danger"
                                                                style={{ 
                                                                    border: "1px solid #dc3545",
                                                                    color: "#dc3545",
                                                                    background: "transparent"
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <BannerCTA />
            <Footer />
        </div>
    );
};

export default Favourites;

