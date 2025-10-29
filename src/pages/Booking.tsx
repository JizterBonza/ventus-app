import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hotel } from '../types/search';
import { getHotelDetails } from '../utils/api';
import BookingForm from '../components/shared/BookingForm';

const Booking: React.FC = () => {
  const { hotelId } = useParams<{ hotelId: string }>();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHotelDetails = async () => {
      if (!hotelId) {
        setError('Hotel ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const hotelData = await getHotelDetails(parseInt(hotelId));
        setHotel(hotelData);
      } catch (err) {
        console.error('Error fetching hotel details:', err);
        setError('Failed to load hotel details');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetails();
  }, [hotelId]);

  const handleBookingSuccess = (response: any) => {
    console.log('Booking successful:', response);
    // You can add additional success handling here
    // For example, redirect to a confirmation page
  };

  const handleBookingError = (error: string) => {
    console.error('Booking error:', error);
    // You can add additional error handling here
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading hotel details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-danger text-center">
              <h4>Error</h4>
              <p>{error || 'Hotel not found'}</p>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/search')}
              >
                Back to Search
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-body">
              <h2 className="card-title">{hotel.name}</h2>
              <p className="text-muted">{hotel.location}</p>
              {hotel.address && (
                <p className="text-muted">
                  <i className="fas fa-map-marker-alt me-2"></i>
                  {hotel.address}
                </p>
              )}
              {hotel.description && (
                <div className="mt-3">
                  <h5>Description</h5>
                  <p>{hotel.description}</p>
                </div>
              )}
              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="mt-3">
                  <h5>Amenities</h5>
                  <div className="row">
                    {hotel.amenities.map((amenity, index) => (
                      <div key={index} className="col-md-6">
                        <i className="fas fa-check text-success me-2"></i>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <BookingForm
            hotelId={hotel.id}
            hotelName={hotel.name}
            onBookingSuccess={handleBookingSuccess}
            onBookingError={handleBookingError}
          />
        </div>
      </div>
    </div>
  );
};

export default Booking;
