import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchData, setSearchData] = useState({
    location: ''
  });

  const slides = [
    {
      background: '/assets/img/slider/2.jpg',
      overlay: '2',
      subtitle: 'Luxury Hotel & Best Resort',
      title: 'Enjoy a Luxury Experience'
    },
    {
      background: '/assets/img/slider/3.jpg',
      overlay: '2',
      subtitle: 'Unique Place to Relax & Enjoy',
      title: 'The Perfect Base For You'
    },
    {
      background: '/assets/img/slider/1.jpg',
      overlay: '3',
      subtitle: 'The Ultimate Luxury Experience',
      title: 'Enjoy The Best Moments of Life'
    }
  ];

  // Popular cities data
  const popularCities = [
    {
      name: 'New York',
      state: 'NY',
      image: '/assets/img/rooms/1.jpg',
      hotelCount: 156,
      avgPrice: 299
    },
    {
      name: 'Los Angeles',
      state: 'CA',
      image: '/assets/img/rooms/2.jpg',
      hotelCount: 142,
      avgPrice: 245
    },
    {
      name: 'Miami',
      state: 'FL',
      image: '/assets/img/rooms/3.jpg',
      hotelCount: 98,
      avgPrice: 189
    },
    {
      name: 'Chicago',
      state: 'IL',
      image: '/assets/img/rooms/4.jpg',
      hotelCount: 134,
      avgPrice: 267
    },
    {
      name: 'Las Vegas',
      state: 'NV',
      image: '/assets/img/rooms/5.jpg',
      hotelCount: 89,
      avgPrice: 156
    },
    {
      name: 'Orlando',
      state: 'FL',
      image: '/assets/img/rooms/6.jpg',
      hotelCount: 76,
      avgPrice: 134
    },
    {
      name: 'San Francisco',
      state: 'CA',
      image: '/assets/img/rooms/7.jpg',
      hotelCount: 112,
      avgPrice: 312
    },
    {
      name: 'Boston',
      state: 'MA',
      image: '/assets/img/rooms/8.jpg',
      hotelCount: 94,
      avgPrice: 278
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to search page with search parameters
    const searchParams = new URLSearchParams({
      location: searchData.location
    });
    navigate(`/search?${searchParams.toString()}`);
  };

  const handleInputChange = (field: string, value: string) => {
    setSearchData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div>
      {/* Hero Slider */}
      <header className="header slider-fade">
        <div className="owl-carousel owl-theme">
          {slides.map((slide, index) => (
            <div 
              key={index}
              className={`text-center item bg-img ${index === currentSlide ? 'active' : ''}`}
              data-overlay-dark={slide.overlay}
              style={{ backgroundImage: `url(${slide.background})` }}
            >
              <div className="v-middle caption">
                <div className="container">
                  <div className="row">
                    <div className="col-md-10 offset-md-1">
                      <span>
                        <i className="star-rating"></i>
                        <i className="star-rating"></i>
                        <i className="star-rating"></i>
                        <i className="star-rating"></i>
                        <i className="star-rating"></i>
                      </span>
                      <h4>{slide.subtitle}</h4>
                      <h1>{slide.title}</h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Reservation Call */}
        {/* <div className="reservation">
          <a href="tel:8551004444">
            <div className="icon d-flex justify-content-center align-items-center">
              <i className="flaticon-call"></i>
            </div>
            <div className="call">
              <span>855 100 4444</span> <br/>Reservation
            </div>
          </a>
        </div> */}
      </header>

      {/* Search Form */}
      <div className="booking-wrapper">
        <div className="container">
          <div className="booking-inner clearfix">
            <form onSubmit={handleSearchSubmit} className="form1 clearfix">
              <div className="col1 c1" style={{ width: '65%' }}>
                <div className="input1_wrapper">
                  <label>Location</label>
                  <div className="input1_inner">
                    <input 
                      type="text" 
                      className="form-control input" 
                      placeholder="Enter destination"
                      value={searchData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="col4 c5" style={{ width: '35%' }}>
                <button type="submit" className="btn-form1-submit">Search Hotels</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Popular Cities Section */}
      <section className="popular-cities section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center mb-5">
              <div className="section-subtitle">Popular Destinations</div>
              <div className="section-title">Explore Amazing Cities</div>
              <p>Discover the best hotels in the most popular destinations around the world</p>
            </div>
          </div>
          <div className="row">
            {popularCities.map((city, index) => (
              <div key={index} className="col-md-3 col-sm-6 mb-4">
                <div className="city-card">
                  <div className="city-image">
                    <img src={city.image} alt={city.name} />
                    <div className="city-overlay">
                      <Link to={`/search?location=${city.name}`} className="btn btn-light">
                        Explore {city.name}
                      </Link>
                    </div>
                  </div>
                  <div className="city-content">
                    <h4>{city.name}, {city.state}</h4>
                    <p>{city.hotelCount} hotels available</p>
                    <div className="city-price">
                      <span>From ${city.avgPrice}</span>
                      <span className="price-unit">/night</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about section-padding bg-cream">
        <div className="container">
          <div className="row">
            <div className="col-md-6 mb-30 animate-box" data-animate-effect="fadeInUp">
              <span>
                <i className="star-rating"></i>
                <i className="star-rating"></i>
                <i className="star-rating"></i>
                <i className="star-rating"></i>
                <i className="star-rating"></i>
              </span>
              <div className="section-subtitle">The Cappa Luxury Hotel</div>
              <div className="section-title">Enjoy a Luxury Experience</div>
              <p>Welcome to the best five-star deluxe hotel in New York. Hotel elementum sesue the aucan vestibulum aliquam justo in sapien rutrum volutpat. Donec in quis the pellentesque velit. Donec id velit ac arcu posuere blane.</p>
              <p>Hotel ut nisl quam nestibulum ac quam nec odio elementum sceisue the aucan ligula. Orci varius natoque penatibus et magnis dis parturient monte nascete ridiculus mus nellentesque habitant morbine.</p>
              {/* call */}
              {/* <div className="reservations">
                <div className="icon"><span className="flaticon-call"></span></div>
                <div className="text">
                  <p>Reservation</p> <a href="tel:855-100-4444">855 100 4444</a>
                </div>
              </div> */}
            </div>
            <div className="col col-md-3 animate-box" data-animate-effect="fadeInUp">
              <img src="/assets/img/rooms/8.jpg" alt="" className="mt-90 mb-30" />
            </div>
            <div className="col col-md-3 animate-box" data-animate-effect="fadeInUp">
              <img src="/assets/img/rooms/2.jpg" alt="" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;