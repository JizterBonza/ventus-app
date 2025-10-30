import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PageHeader from "../components/shared/PageHeader";

declare const $: any;

const Home: React.FC = () => {
    const [sliderReady, setSliderReady] = useState(false);
    // Popular cities data
    const popularRooms = [
        {
            name: "Deluxe Room",
            image: "/assets/img/rooms/1.jpg",
            guestCount: [2, 3],
            avgPrice: 250,
            size: "35 sq.",
            amenities: ["Free Breakfast", "amenities"],
        },
        {
            name: "Superior Room",
            image: "/assets/img/rooms/2.jpg",
            guestCount: [3, 4],
            avgPrice: 350,
            size: "45 sq.",
            amenities: ["Free Breakfast", "amenities"],
        },
        {
            name: "Suite Room",
            image: "/assets/img/rooms/3.jpg",
            guestCount: [4, 5],
            avgPrice: 500,
            size: "70 sq.",
            amenities: ["Free Breakfast", "amenities"],
        },
        {
            name: "Presidential Suite",
            image: "/assets/img/rooms/4.jpg",
            guestCount: [5, 6],
            avgPrice: 1000,
            size: "130 sq.",
            amenities: ["Free Breakfast", "amenities"],
        },
        {
            name: "Penthouse Suite",
            image: "/assets/img/rooms/5.jpg",
            guestCount: [2, 3],
            avgPrice: 1000,
            size: "100 sq.",
            amenities: ["Free Breakfast", "amenities"],
        },
        {
            name: "Beachfront Villa",
            image: "/assets/img/rooms/6.jpg",
            guestCount: [6, 8],
            avgPrice: 1500,
            size: "350 sq.",
            amenities: ["Free Breakfast", "amenities"],
        },
    ];

    useEffect(() => {
        // Initialize the card slider when component mounts
        const initSlider = () => {
            if (typeof $ !== "undefined" && $.fn.slick) {
                const $slider = $(".card-slider");

                // Check if slider is not already initialized
                if (!$slider.hasClass("slick-initialized")) {
                    $slider.slick({
                        dots: false,
                        infinite: false,
                        speed: 300,
                        slidesToShow: 2,
                        slidesToScroll: 1,
                        autoplay: false,
                        arrows: true,
                        responsive: [
                            {
                                breakpoint: 768,
                                settings: {
                                    slidesToShow: 1,
                                    slidesToScroll: 1,
                                },
                            },
                        ],
                    });

                    // Show the slider after initialization
                    setSliderReady(true);
                }
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(initSlider, 100);

        // Cleanup function to destroy slider when component unmounts
        return () => {
            clearTimeout(timer);
            setSliderReady(false);
            if (typeof $ !== "undefined" && $.fn.slick) {
                const $slider = $(".card-slider");
                if ($slider.hasClass("slick-initialized")) {
                    $slider.slick("unslick");
                }
            }
        };
    }, []); // Empty dependency array means this runs once on mount

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
                    <div className="row mb-5">
                        <div className="col-lg-6">
                            <div className="subtitle">Rooms & Suites</div>
                            <h2>Comfortable Rooms Just For You</h2>
                        </div>
                        <div className="col-lg-6">
                            <p>Discover the best hotels in the most popular destinations around the world</p>
                            <a className="btn btn-outline-secondary" href="/hotel/9817" data-discover="true">
                                View All Rooms
                            </a>
                        </div>
                    </div>
                    <div
                        className="card-slider"
                        style={{
                            opacity: sliderReady ? 1 : 0,
                            transition: "opacity 0.3s ease-in-out",
                        }}
                    >
                        {popularRooms.map((room, index) => (
                            <div key={index} className="card-wrap">
                                <div className="card room-card compact">
                                    <div className="card-image">
                                        <Link to={`/search?location=${room.name}`} title="Explore {room.name}">
                                            <img src={room.image} alt={room.name} />
                                        </Link>
                                    </div>
                                    <div className="card-content">
                                        <h4>{room.name}</h4>
                                        <div className="card-price">
                                            <span className="price-label">from</span>
                                            <span className="price-amount">${room.avgPrice}/night</span>
                                        </div>
                                        <div className="card-info">
                                            <span>{room.size}</span>
                                            <span className="divider"></span>
                                            <span>
                                                {room.guestCount[0]} - {room.guestCount[1]} Guests
                                            </span>
                                            <span className="divider"></span>
                                            <ul className="card-amenities">
                                                {room.amenities.map((amenity, index) => (
                                                    <li key={index}>{amenity}</li>
                                                ))}
                                            </ul>
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
