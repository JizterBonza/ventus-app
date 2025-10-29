import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PageHeader from "../components/shared/PageHeader";

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [searchData, setSearchData] = useState({
        location: "",
    });

    // Popular cities data
    const popularCities = [
        {
            name: "New York",
            state: "NY",
            image: "/assets/img/rooms/1.jpg",
            hotelCount: 156,
            avgPrice: 299,
        },
        {
            name: "Los Angeles",
            state: "CA",
            image: "/assets/img/rooms/2.jpg",
            hotelCount: 142,
            avgPrice: 245,
        },
        {
            name: "Miami",
            state: "FL",
            image: "/assets/img/rooms/3.jpg",
            hotelCount: 98,
            avgPrice: 189,
        },
        {
            name: "Chicago",
            state: "IL",
            image: "/assets/img/rooms/4.jpg",
            hotelCount: 134,
            avgPrice: 267,
        },
        {
            name: "Las Vegas",
            state: "NV",
            image: "/assets/img/rooms/5.jpg",
            hotelCount: 89,
            avgPrice: 156,
        },
        {
            name: "Orlando",
            state: "FL",
            image: "/assets/img/rooms/6.jpg",
            hotelCount: 76,
            avgPrice: 134,
        },
        {
            name: "San Francisco",
            state: "CA",
            image: "/assets/img/rooms/7.jpg",
            hotelCount: 112,
            avgPrice: 312,
        },
        {
            name: "Boston",
            state: "MA",
            image: "/assets/img/rooms/8.jpg",
            hotelCount: 94,
            avgPrice: 278,
        },
    ];

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Redirect to search page with search parameters
        const searchParams = new URLSearchParams({
            location: searchData.location,
        });
        navigate(`/search?${searchParams.toString()}`);
    };

    const handleInputChange = (field: string, value: string) => {
        setSearchData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div>
            <Header />
            <PageHeader
                title="Start Your Journey With Ventus Hotels"
                text="Experience luxury at its finest with our beautiful hotel facilities."
                video={true}
                booking={true}
            />

            {/* Hero Slider */}
            {/* <Slider slides={slides} autoplay={true} autoplayTimeout={5000} showDots={true} /> */}

            <section className="section-padding section-text-center">
                <div className="container">
                    <div className="row justify-content-md-center">
                        <div className="col-md-8 text-center">
                            <h2>
                                Crafting Memories That <br /> Last Forever
                            </h2>
                            <p>
                                At Ventus, every stay is more than a visit — it’s an experience. With world-class
                                service, luxury comforts, and moments designed to delight, we ensure your time with us
                                is unforgettable
                            </p>
                            <a className="btn btn-outline-secondary" href="/hotel/9817" data-discover="true">
                                View Details
                            </a>
                        </div>
                    </div>
                </div>
            </section>

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
                                        <h4>
                                            {city.name}, {city.state}
                                        </h4>
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
                            <p>
                                Welcome to the best five-star deluxe hotel in New York. Hotel elementum sesue the aucan
                                vestibulum aliquam justo in sapien rutrum volutpat. Donec in quis the pellentesque
                                velit. Donec id velit ac arcu posuere blane.
                            </p>
                            <p>
                                Hotel ut nisl quam nestibulum ac quam nec odio elementum sceisue the aucan ligula. Orci
                                varius natoque penatibus et magnis dis parturient monte nascete ridiculus mus
                                nellentesque habitant morbine.
                            </p>
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
            <Footer />
        </div>
    );
};

export default Home;
