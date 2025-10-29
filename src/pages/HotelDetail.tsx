import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getHotelDetails } from '../utils/api';
import { Hotel, HotelImage } from '../types/search';
import BookingForm from '../components/shared/BookingForm';

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

const HotelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    adults: '1',
    children: '0',
    rooms: '1'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback hotel images for when API doesn't provide images
  const fallbackImages = [
    "/assets/img/rooms/1.jpg",
    "/assets/img/rooms/2.jpg",
    "/assets/img/rooms/3.jpg",
    "/assets/img/rooms/4.jpg",
    "/assets/img/rooms/5.jpg"
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
      amenities: ["Free WiFi", "Air Conditioning", "Private Bathroom", "Mini Bar", "Room Service"]
    },
    {
      id: 2,
      name: "Executive Suite",
      type: "King Bed + Living Room",
      price: (hotel?.price || 299) + 200,
      capacity: 3,
      image: "/assets/img/rooms/2.jpg",
      available: true,
      amenities: ["Free WiFi", "Air Conditioning", "Private Bathroom", "Mini Bar", "Room Service", "Living Room", "City View"]
    },
    {
      id: 3,
      name: "Presidential Suite",
      type: "King Bed + Living Room + Dining",
      price: (hotel?.price || 299) + 600,
      capacity: 4,
      image: "/assets/img/rooms/3.jpg",
      available: true,
      amenities: ["Free WiFi", "Air Conditioning", "Private Bathroom", "Mini Bar", "Room Service", "Living Room", "Dining Room", "City View", "Butler Service"]
    }
  ];

  // Mock reviews data
  const mockReviews: Review[] = [
    {
      id: 1,
      author: "Sarah Johnson",
      rating: 5,
      date: "2024-01-15",
      comment: "Absolutely amazing experience! The service was impeccable and the rooms were spotless. Will definitely return.",
      helpful: 24
    },
    {
      id: 2,
      author: "Michael Chen",
      rating: 5,
      date: "2024-01-10",
      comment: "Great location, beautiful hotel, and excellent staff. The spa was a highlight of our stay.",
      helpful: 18
    },
    {
      id: 3,
      author: "Emily Rodriguez",
      rating: 4,
      date: "2024-01-05",
      comment: "Very nice hotel with good amenities. The only minor issue was the slow WiFi in our room.",
      helpful: 12
    }
  ];

  // Mock similar hotels data
  const mockSimilarHotels: SimilarHotel[] = [
    {
      id: 2,
      name: "Grand Plaza Hotel",
      location: hotel?.location || "Unknown Location",
      rating: 4,
      price: (hotel?.price || 299) - 100,
      image: "/assets/img/rooms/2.jpg"
    },
    {
      id: 7,
      name: "Luxury Tower Hotel",
      location: hotel?.location || "Unknown Location",
      rating: 5,
      price: (hotel?.price || 299) + 150,
      image: "/assets/img/rooms/7.jpg"
    },
    {
      id: 8,
      name: "Business Center Hotel",
      location: hotel?.location || "Unknown Location",
      rating: 4,
      price: (hotel?.price || 299) - 110,
      image: "/assets/img/rooms/8.jpg"
    }
  ];

  useEffect(() => {
    const fetchHotelDetails = async () => {
      if (!id) {
        setError('Hotel ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching hotel details for ID:', id);
        console.log('Environment:', process.env.NODE_ENV);
        
        const hotelData = await getHotelDetails(parseInt(id));
        setHotel(hotelData);
        
        console.log('Successfully fetched hotel details:', hotelData);
      } catch (err) {
        console.error('Error fetching hotel details:', err);
        
        // Provide more specific error messages for production
        let errorMessage = 'Failed to fetch hotel details';
        
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
          } else if (err.message.includes('CORS')) {
            errorMessage = 'Access denied: Unable to load hotel information due to security restrictions.';
          } else if (err.message.includes('404')) {
            errorMessage = 'Hotel not found: The requested hotel could not be located.';
          } else if (err.message.includes('403')) {
            errorMessage = 'Access forbidden: You do not have permission to view this hotel.';
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

  const handleBookingSuccess = (response: any) => {
    console.log('Booking successful:', response);
    // You can add additional success handling here
    // For example, redirect to a confirmation page
  };

  const handleBookingError = (error: string) => {
    console.error('Booking error:', error);
    // You can add additional error handling here
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Booking submitted:', bookingData);
    // Handle booking logic here
  };

  const handleInputChange = (field: string, value: string) => {
    setBookingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i key={i} className={`star-rating ${i < rating ? 'active' : ''}`}></i>
    ));
  };

  const calculateAverageRating = () => {
    if (!mockReviews) return '0';
    const total = mockReviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / mockReviews.length).toFixed(1);
  };

  // Get hotel images - use API data if available, otherwise fallback
  const getHotelImages = (): string[] => {
    if (hotel?.images && hotel.images.length > 0) {
      return hotel.images.map(img => img.url);
    }
    if (hotel?.image) {
      return [hotel.image, ...fallbackImages.slice(1)];
    }
    return fallbackImages;
  };

  if (loading) {
    return (
      <div className="text-center" style={{ padding: '50px' }}>
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-2">Loading hotel details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center" style={{ padding: '50px' }}>
        <div className="alert alert-danger" role="alert">
          <h4><i className="fa fa-exclamation-triangle"></i> Error Loading Hotel</h4>
          <p>{error}</p>
          <div className="mt-3">
            <button 
              className="btn btn-primary me-2" 
              onClick={() => window.location.reload()}
            >
              <i className="fa fa-refresh"></i> Try Again
            </button>
            <Link to="/search" className="btn btn-outline-primary">
              <i className="fa fa-arrow-left"></i> Back to Search
            </Link>
          </div>
          {process.env.NODE_ENV === 'production' && (
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
      <div className="text-center" style={{ padding: '50px' }}>
        <h2>Hotel not found</h2>
        <Link to="/search" className="btn btn-primary">Back to Search</Link>
      </div>
    );
  }

  const hotelImages = getHotelImages();

  return (
    <div className="hotel-detail-page">
      {/* Breadcrumb */}
      <section className="breadcrumb-section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item"><Link to="/search">Search</Link></li>
              <li className="breadcrumb-item active">{hotel.name}</li>
            </ol>
          </nav>
        </div>
      </section>

      {/* Hotel Header */}
      <section className="hotel-header">
        <div className="container">
          <div className="row">
            <div className="col-md-8">
              <h1>{hotel.name}</h1>
              
              {/* Hotel Groups/Brands */}
              {hotel.hotel_groups && hotel.hotel_groups.length > 0 && (
                <div className="hotel-groups mb-2">
                  {hotel.hotel_groups.map((group, index) => (
                    <span key={group.id} className="badge bg-primary me-2">
                      {group.name}
                    </span>
                  ))}
                </div>
              )}
              
              <p className="hotel-location">
                <i className="fa fa-map-marker"></i> {hotel.location}
              </p>
              {hotel.address && (
                <p className="hotel-address">
                  <i className="fa fa-home"></i> {hotel.address}
                </p>
              )}
              {hotel.distance && (
                <p className="hotel-distance">
                  <i className="fa fa-location-arrow"></i> {hotel.distance}
                </p>
              )}
              <div className="hotel-rating">
                {renderStars(hotel.rating || 0)}
                <span className="rating-text">{hotel.rating || 'N/A'}/5</span>
                {hotel.reviewCount && (
                  <span className="review-count">({hotel.reviewCount} reviews)</span>
                )}
              </div>
            </div>
            <div className="col-md-4 text-end">
              <div className="hotel-price">
                <span className="price-label">Starting from</span>
                <span className="price-amount">${hotel.price || 'N/A'}</span>
                <span className="price-unit">/night</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Gallery */}
      <section className="hotel-gallery">
        <div className="container">
          <div className="row">
            <div className="col-md-8">
              <div className="main-image">
                <img 
                  src={hotelImages[selectedImage]} 
                  alt={hotel.name} 
                  className="img-fluid"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = fallbackImages[selectedImage];
                  }}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="thumbnail-images">
                {hotelImages.slice(0, 4).map((image, index) => (
                  <div 
                    key={index} 
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
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
          </div>
        </div>
      </section>

      {/* Hotel Content */}
      <section className="hotel-content section-padding">
        <div className="container">
          <div className="row">
            {/* Main Content */}
            <div className="col-md-8">
              {/* Description */}
              <div className="hotel-description">
                <h3>About this hotel</h3>
                <p>{hotel.description || 'No description available for this hotel.'}</p>
                
                {hotel.fun_fact && (
                  <div className="fun-fact mt-3">
                    <h5><i className="fa fa-lightbulb"></i> Fun Fact</h5>
                    <p>{hotel.fun_fact}</p>
                  </div>
                )}
                
                {hotel.unique_experiences && (
                  <div className="unique-experiences mt-3">
                    <h5><i className="fa fa-star"></i> Unique Experiences</h5>
                    <p>{hotel.unique_experiences}</p>
                  </div>
                )}
              </div>

              {/* Hotel Information */}
              {hotel.hotel_information && hotel.hotel_information.length > 0 && (
                <div className="hotel-information">
                  <h3>Hotel Information</h3>
                  <div className="row">
                    {hotel.hotel_information.map((info, index) => (
                      <div key={index} className="col-md-6 mb-3">
                        <div className="info-card">
                          <h5><i className="fa fa-info-circle"></i> {info.title}</h5>
                          <ul className="list-unstyled">
                            {info.description.map((item, itemIndex) => (
                              <li key={itemIndex}><i className="fa fa-check"></i> {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              <div className="hotel-amenities">
                <h3>Hotel Amenities</h3>
                <div className="amenities-grid">
                  {(hotel.amenities || []).length > 0 ? (
                    hotel.amenities.map((amenity, index) => (
                      <div key={index} className="amenity-item">
                        <i className="fa fa-check"></i>
                        <span>{amenity}</span>
                      </div>
                    ))
                  ) : (
                    <p>No amenities information available.</p>
                  )}
                </div>
              </div>

              {/* Available Rooms */}
              {/* <div className="available-rooms">
                <h3>Available Rooms</h3>
                <div className="rooms-list">
                  {mockRooms.map(room => (
                    <div key={room.id} className={`room-item ${selectedRoom === room.id ? 'selected' : ''}`}>
                      <div className="row">
                        <div className="col-md-4">
                          <img src={room.image} alt={room.name} className="img-fluid" />
                        </div>
                        <div className="col-md-6">
                          <h4>{room.name}</h4>
                          <p className="room-type">{room.type}</p>
                          <p className="room-capacity">Up to {room.capacity} guests</p>
                          <div className="room-amenities">
                            {room.amenities.slice(0, 3).map((amenity, index) => (
                              <span key={index} className="amenity-tag">{amenity}</span>
                            ))}
                            {room.amenities.length > 3 && (
                              <span className="amenity-tag">+{room.amenities.length - 3} more</span>
                            )}
                          </div>
                        </div>
                        <div className="col-md-2 text-end">
                          <div className="room-price">
                            <span className="price">${room.price}</span>
                            <span className="unit">/night</span>
                          </div>
                          <button 
                            className={`btn ${selectedRoom === room.id ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                            onClick={() => setSelectedRoom(room.id)}
                          >
                            {selectedRoom === room.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div> */}

              {/* Reviews */}
              {/* <div className="hotel-reviews">
                <h3>Guest Reviews</h3>
                <div className="reviews-summary">
                  <div className="average-rating">
                    <span className="rating-number">{calculateAverageRating()}</span>
                    <div className="rating-stars">{renderStars(Math.round(parseFloat(calculateAverageRating())))}</div>
                    <span className="total-reviews">Based on {mockReviews.length} reviews</span>
                  </div>
                </div>
                <div className="reviews-list">
                  {mockReviews.map(review => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <div className="review-author">{review.author}</div>
                        <div className="review-rating">{renderStars(review.rating)}</div>
                        <div className="review-date">{new Date(review.date).toLocaleDateString()}</div>
                      </div>
                      <div className="review-comment">{review.comment}</div>
                      <div className="review-helpful">
                        <span>Helpful ({review.helpful})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div> */}

              {/* Similar Hotels */}
              {/* <div className="similar-hotels">
                <h3>Similar Hotels</h3>
                <div className="row">
                  {mockSimilarHotels.map(similarHotel => (
                    <div key={similarHotel.id} className="col-md-4 mb-3">
                      <div className="similar-hotel-card">
                        <img src={similarHotel.image} alt={similarHotel.name} />
                        <div className="similar-hotel-content">
                          <h5>{similarHotel.name}</h5>
                          <p>{similarHotel.location}</p>
                          <div className="similar-hotel-rating">
                            {renderStars(similarHotel.rating)}
                            <span>${similarHotel.price}/night</span>
                          </div>
                          <Link to={`/hotel/${similarHotel.id}`} className="btn btn-sm btn-outline-primary">
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>

            {/* Booking Sidebar */}
        
            <div className="col-md-4">
              <BookingForm
                hotelId={hotel.id}
                hotelName={hotel.name}
                onBookingSuccess={handleBookingSuccess}
                onBookingError={handleBookingError}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HotelDetail;
