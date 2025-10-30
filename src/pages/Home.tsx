import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PageHeader from "../components/shared/PageHeader";
import Accordion from "../components/shared/Accordion";

declare const $: any;

const Home: React.FC = () => {
    const [sliderReady, setSliderReady] = useState(false);
    // Popular cities data
    const popularRooms = [
        {
            name: "Dubai",
            image: "/assets/img/featured/1.webp",
            description:
                "Dubai, a dazzling metropolis of innovation and luxury, offers an extraordinary blend of ultramodern architecture, lavish shopping, and world-class dining, making it an unparalleled destination for travelers seeking opulence and adventure.",
        },
        {
            name: "Megeve",
            image: "/assets/img/featured/2.webp",
            description:
                "Discover the alpine elegance of Megève, where charming cobblestone streets, luxurious chalets, and breathtaking mountain views come together to offer an exclusive ski experience paired with gourmet dining and world-class amenities.",
        },
        {
            name: "Maldives",
            image: "/assets/img/featured/3.jpeg",
            description:
                "The Maldives, a tropical paradise of pristine beaches and crystalline waters, offers an unparalleled luxury escape with its exclusive overwater bungalows, world-class spas, and vibrant marine life, creating an idyllic retreat for discerning travelers.",
        },
    ];

    const faqs = [
        {
            question: "HOW DO I BOOK?",
            answer: "Booking with Ventus is easy. Simply go to our contact us page, let us know your destination, travel dates, and follow the prompts to complete your enquiry. Our team will come back to you with options to book and any help that you may require.",
        },
        {
            question: "WHAT ARE THE PAYMENT OPTIONS?",
            answer: "We accept various payment methods, including credit cards, debit cards, and online bank transfers. You can choose the option that is most convenient for you during the booking process.",
        },
        {
            question: "CAN I CANCEL MY BOOKING?",
            answer: "Yes, if the cancellation policy upon making your booking allows. Often there will be the option for you to pick a refundable or non refundable rate, which may affect the rate the hotel charges. You can contact our customer support team by WhatsApp, email, or through our website's live chat feature and we will be more than happy to assist.",
        },
        {
            question: "HOW CAN I CONTACT YOU?",
            answer: "You can contact our customer support team by our contact us page, WhatsApp, email, or through our website's live chat feature. We are UK based and available throughout the day to assist you with any questions or concerns you may have.",
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
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        autoplay: false,
                        arrows: true,
                        responsive: [
                            {
                                breakpoint: 1160,
                                settings: {
                                    slidesToShow: 2,
                                    slidesToScroll: 1,
                                },
                            },
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
                text="A World of Endless Travel Possibilities"
                video={true}
                booking={true}
            />

            {/* Hero Slider */}
            {/* <Slider slides={slides} autoplay={true} autoplayTimeout={5000} showDots={true} /> */}

            <section className="section-padding section-text-center">
                <div className="container">
                    <div className="row justify-content-md-center">
                        <div className="col-md-8 text-center">
                            <h2>Immerse yourself in the art of refined travel</h2>
                            <p>
                                Our handpicked destinations promise to indulge your every desire. <br />A world of
                                endless travel possibilities awaits.
                            </p>
                            <a className="btn btn-primary" href="/hotel/9817" data-discover="true">
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
                            <div className="subtitle">For Global Luxury Travellers </div>
                            <h2>Where are you travelling? </h2>
                        </div>
                        <div className="col-lg-6">
                            <p>Discover the best hotels in the most popular destinations around the world</p>
                            <a className="btn btn-primary" href="/destinations" data-discover="true">
                                View Our Featured Destinations
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
                                <Link
                                    to={`/destinations?location=${room.name}`}
                                    title="Explore {room.name}"
                                    className="card room-card compact"
                                >
                                    <div className="card-overlay">Find out more</div>
                                    <div className="card-image">
                                        <img src={room.image} alt={room.name} />
                                    </div>
                                    <div className="card-content">
                                        <h4>{room.name}</h4>
                                        <div className="card-description">
                                            {room.description
                                                ? room.description.length > 150
                                                    ? `${room.description.substring(0, 150)}...`
                                                    : room.description
                                                : "No description available"}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="about section-about section-padding bg-cream">
                <div className="container">
                    <div className="row d-flex align-items-center">
                        <div className="col-md-6 mb-30 animate-box" data-animate-effect="fadeInUp">
                            <div className="star-rating-container">
                                <i className="star-rating"></i>
                                <i className="star-rating"></i>
                                <i className="star-rating"></i>
                                <i className="star-rating"></i>
                                <i className="star-rating"></i>
                            </div>
                            <div className="subtitle">Hear from our clients</div>
                            <h2>Rachel Speed</h2>
                            <p>
                                I recently booked with Daniella and the experience was beyond incredible. From the
                                moment I reached out, she took the time to understand exactly what I was looking for and
                                sent me several beautiful options to choose from. The hotel was stunning, with
                                breathtaking views and world-class amenities. But what truly exceeded my expectations
                                was the upgrade I received—an over-the-top suite with panoramic ocean views! It was the
                                perfect blend of luxury, personal attention, and thoughtful surprises. I couldn't have
                                asked for a better experience, and I'm already looking forward to booking my next trip
                                with them!
                            </p>
                            {/* call */}
                            {/* <div className="reservations">
                <div className="icon"><span className="flaticon-call"></span></div>
                <div className="text">
                  <p>Reservation</p> <a href="tel:855-100-4444">855 100 4444</a>
                </div>
              </div> */}
                        </div>
                        <div className="col image-col col-md-6 animate-box" data-animate-effect="fadeInUp">
                            <img src="/assets/img/clients/review-1.jpg" alt="" />
                        </div>
                    </div>
                </div>
            </section>

            <Accordion
                id="faqs"
                title="FAQs"
                text="Find answers to common questions about travel arrangements, booking process, and our services."
                faqs={faqs}
            />
            <Footer />
        </div>
    );
};

export default Home;
