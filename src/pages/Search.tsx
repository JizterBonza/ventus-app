import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../hooks/useSearch';
import { Hotel, SearchParams } from '../types/search';
import { getHotelDetailsBatch } from '../utils/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const Search: React.FC = () => {
  const [urlSearchParams] = useSearchParams();
  const [searchParams, setSearchParams] = useState({
    location: '',
    priceRange: 'all',
    rating: 'all',
    sortBy: 'recommended'
  });

  const { hotels, loading, error, searchByQuery, searchAdvanced, clearError } = useSearch();
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [detailedHotels, setDetailedHotels] = useState<Hotel[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fallback hotel images for when API doesn't provide images
  const fallbackImages = [
    "/assets/img/rooms/1.jpg",
    "/assets/img/rooms/2.jpg",
    "/assets/img/rooms/3.jpg",
    "/assets/img/rooms/4.jpg",
    "/assets/img/rooms/5.jpg",
    "/assets/img/rooms/6.jpg",
    "/assets/img/rooms/7.jpg",
    "/assets/img/rooms/8.jpg"
  ];

  useEffect(() => {
    // Handle URL parameters from home page
    const location = urlSearchParams.get('location');
    
    if (location) {
      setSearchParams(prev => ({
        ...prev,
        location: location || ''
      }));
      
      // Auto-search for the location
      searchByQuery(location, 20);
    }
  }, [urlSearchParams, searchByQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchQuery = searchParams.location || 'hotels';
    
    const searchParamsForAPI: SearchParams = {
      query: searchQuery,
      limit: 20,
      location: searchParams.location || undefined,
      priceRange: searchParams.priceRange !== 'all' ? searchParams.priceRange : undefined,
      rating: searchParams.rating !== 'all' ? searchParams.rating : undefined,
      sortBy: searchParams.sortBy !== 'recommended' ? searchParams.sortBy : undefined,
    };
    
    await searchAdvanced(searchParamsForAPI);
  };

  // Function to fetch detailed hotel information
  const fetchHotelDetails = async (hotelIds: number[]) => {
    if (hotelIds.length === 0) return;
    
    setLoadingDetails(true);
    try {
      console.log('Fetching detailed information for hotels:', hotelIds);
      const detailedHotelsData = await getHotelDetailsBatch(hotelIds);
      setDetailedHotels(detailedHotelsData);
      console.log('Successfully fetched detailed hotel information:', detailedHotelsData);
    } catch (error) {
      console.error('Error fetching hotel details:', error);
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
    if (searchParams.priceRange !== 'all') {
      filtered = filtered.filter(hotel => {
        const price = hotel.price || 0;
        switch (searchParams.priceRange) {
          case 'low':
            return price < 200;
          case 'medium':
            return price >= 200 && price < 300;
          case 'high':
            return price >= 300;
          default:
            return true;
        }
      });
    }
    
    // Apply rating filter
    if (searchParams.rating !== 'all') {
      const minRating = parseInt(searchParams.rating);
      filtered = filtered.filter(hotel => (hotel.rating || 0) >= minRating);
    }
    
    // Apply sorting
    switch (searchParams.sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'distance':
        filtered = [...filtered].sort((a, b) => {
          const aDist = parseFloat(a.distance?.split(' ')[0] || '0');
          const bDist = parseFloat(b.distance?.split(' ')[0] || '0');
          return aDist - bDist;
        });
        break;
      default:
        break;
    }
    
    setFilteredHotels(filtered);
    
    // Fetch detailed information for the filtered hotels
    if (filtered.length > 0) {
      const hotelIds = filtered.map(hotel => hotel.id);
      fetchHotelDetails(hotelIds);
    } else {
      setDetailedHotels([]);
    }
  }, [hotels, searchParams.priceRange, searchParams.rating, searchParams.sortBy]);

  const handleInputChange = (field: string, value: string) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i key={i} className={`star-rating ${i < rating ? 'active' : ''}`}></i>
    ));
  };

  return (
    <div className="search-page">
      <Header />
      {/* Hero Section */}
      <section className="hero-section bg-img" style={{ backgroundImage: 'url(/assets/img/slider/1.jpg)' }}>
        <div className="overlay-dark" data-overlay-dark="3"></div>
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <div className="caption">
                <h1>Find Your Perfect Stay</h1>
                <p>Discover amazing hotels and resorts around the world</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Form */}
      <section className="search-form-section section-padding">
        <div className="container">
          <div className="booking-inner clearfix">
            <form onSubmit={handleSearch} className="form1 clearfix">
              <div className="col1 c1" style={{ width: '65%' }}>
                <div className="input1_wrapper">
                  <label>Location</label>
                  <div className="input1_inner">
                    <input 
                      type="text" 
                      className="form-control input" 
                      placeholder="Where are you going?"
                      value={searchParams.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="col4 c5" style={{ width: '35%' }}>
                <button type="submit" className="btn-form1-submit">
                  {loading ? 'Searching...' : 'Search Hotels'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Filters and Results */}
      <section className="results-section section-padding">
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
                  <p>Searching for hotels in: <strong>{searchParams.location}</strong></p>
                )}
                {loadingDetails && (
                  <div className="alert alert-info" role="alert">
                    <i className="fa fa-spinner fa-spin"></i> Loading detailed hotel information...
                  </div>
                )}
              </div>

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
                <div className={`hotels-container ${viewMode === 'grid' ? 'row' : ''}`}>
                  {filteredHotels.map(hotel => {
                    // Use detailed hotel information if available, otherwise fall back to basic info
                    const detailedHotel = detailedHotels.find(dh => dh.id === hotel.id);
                    const displayHotel = detailedHotel || hotel;
                    
                    return (
                                          <div key={hotel.id} className={viewMode === 'grid' ? 'col-md-4 mb-4' : 'mb-4'}>
                        <div className={`hotel-card ${viewMode === 'list' ? 'hotel-card-list' : ''}`}>
                          <div className="hotel-image">
                            <img 
                              src={displayHotel.images && displayHotel.images.length > 0 
                                ? displayHotel.images[0].url 
                                : displayHotel.image || fallbackImages[hotel.id % fallbackImages.length]} 
                              alt={displayHotel.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = fallbackImages[hotel.id % fallbackImages.length];
                              }}
                            />
                            <div className="hotel-price">${displayHotel.price || 'N/A'}/night</div>
                            {loadingDetails && !detailedHotel && (
                              <div className="loading-overlay">
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="sr-only">Loading details...</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="hotel-content">
                            <h4>{displayHotel.name}</h4>
                            <p className="hotel-location">
                              <i className="fa fa-map-marker"></i> {displayHotel.location}
                            </p>
                            {displayHotel.distance && (
                              <p className="hotel-distance">
                                <i className="fa fa-location-arrow"></i> {displayHotel.address}
                              </p>
                            )}
                            <p className="hotel-description">
                              {displayHotel.description 
                                ? (displayHotel.description.length > 150 
                                    ? `${displayHotel.description.substring(0, 150)}...` 
                                    : displayHotel.description)
                                : 'No description available'
                              }
                            </p>
                            <div className="hotel-amenities">
                              {(displayHotel.amenities || []).slice(0, 3).map((amenity, index) => (
                                <span key={index} className="amenity-tag">{amenity}</span>
                              ))}
                              {(displayHotel.amenities || []).length > 3 && (
                                <span className="amenity-tag">+{(displayHotel.amenities || []).length - 3} more</span>
                              )}
                              {(!displayHotel.amenities || displayHotel.amenities.length === 0) && (
                                <span className="amenity-tag">Amenities not available</span>
                              )}
                            </div>
                            {detailedHotel && (
                              <div className="hotel-contact-info">
                                {detailedHotel.instagram && (
                                  <p className="hotel-instagram">
                                    <i className="fab fa-instagram"></i> 
                                    <a href={detailedHotel.instagram} target="_blank" rel="noopener noreferrer">
                                      Follow on Instagram
                                    </a>
                                  </p>
                                )}
                                {detailedHotel.website && (
                                  <p className="hotel-website">
                                    <i className="fa fa-globe"></i> 
                                    <a href={detailedHotel.website} target="_blank" rel="noopener noreferrer">
                                      Visit Website
                                    </a>
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="hotel-actions">
                              <Link to={`/hotel/${hotel.id}`} className="btn btn-outline-secondary">
                                View Details
                              </Link>
                              <button className="btn btn-success">
                                Book Now
                              </button>
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
      <Footer />
    </div>
  );
};

export default Search;
