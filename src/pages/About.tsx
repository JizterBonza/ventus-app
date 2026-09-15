import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import "./RecoveryPages.css";

const amenities = [
    { icon: "hotel", text: "Room upgrade upon arrival or at time of booking (based on availability)" },
    { icon: "gift", text: "Welcome amenity" },
    { icon: "credit", text: "Hotel, food & beverage or spa credits" },
    { icon: "breakfast", text: "Daily breakfast for two" },
    { icon: "calendar", text: "Early check-in and late check out when available" },
    { icon: "plane", text: "Airport transfers at select properties" },
    { icon: "vip", text: "VIP status" },
    { icon: "crown", text: "Access to our exclusive relationships we have built" },
];

const instagramImages = Array.from({ length: 6 }, (_, index) =>
    `/assets/img/recovered/instagram-${index + 1}.webp`
);

const AmenityIcon: React.FC<{ name: string }> = ({ name }) => {
    const paths: Record<string, React.ReactNode> = {
        hotel: <path d="M3 20V5h12v5h6v10M7 9h4M7 13h4M14 20v-6h3v6M2 20h20" />,
        gift: <path d="M4 10h16v11H4zM2 6h20v4H2zM12 6v15M12 6c-4 0-5-2-4-4 2-1 4 1 4 4Zm0 0c4 0 5-2 4-4-2-1-4 1-4 4Z" />,
        credit: <path d="M3 5h18v14H3zM3 9h18M7 15h4" />,
        breakfast: <path d="M5 4h12v8a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V4Zm12 2h2a3 3 0 0 1 0 6h-2M3 21h18" />,
        calendar: <path d="M4 5h16v16H4zM8 2v6M16 2v6M4 10h16M8 14h4v4H8z" />,
        plane: <path d="m3 14 8-5V4a1.5 1.5 0 0 1 3 0v5l8 5v2l-8-2.5V19l3 2v1l-4.5-1-4.5 1v-1l3-2v-5.5L3 16Z" />,
        vip: <path d="M3 5h18v14H3zM6 10l2 5 2-5M13 10v5M16 15v-5h2a2 2 0 0 1 0 4h-2" />,
        crown: <path d="m3 7 5 3 4-6 4 6 5-3-2 11H5ZM4 21h16" />,
    };

    return (
        <svg className="ventus-amenity-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {paths[name]}
            </g>
        </svg>
    );
};

const ArrowIcon: React.FC = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6h12v12M18 6 5 19" />
    </svg>
);

const InstagramIcon: React.FC = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" className="ventus-instagram-dot" />
    </svg>
);

const About: React.FC = () => {
    return (
        <Layout>
            <div
                className="ventus-recovery-page ventus-about-page"
                data-wf-site="677faee4ec02118e52414101"
                data-wf-page="677faee4ec02118e52414109"
            >
                <section className="ventus-founder-section" aria-labelledby="founder-heading">
                    <div className="ventus-recovery-container ventus-founder-grid">
                        <div className="ventus-founder-copy ventus-reveal">
                            <h1 id="founder-heading">
                                Welcome to my world, where elegance meets exploration and unforgettable adventure awaits!
                            </h1>
                            <p>
                                I am Daniella, a passionate traveller with a deep appreciation for the finer things in
                                life. Over the years, I&apos;ve had the privilege of exploring some of the most breathtaking
                                corners of the world, each adventure revealing unique experiences and hidden gems that I
                                can&apos;t wait to share with you. From exclusive resorts to private jet charters, my goal is
                                to elevate your travel experience beyond the ordinary, to make memories that will last a
                                life time. Join me as I unveil the world’s most magical destinations, share insider
                                insights, and provide tailored recommendations that will elevate your travel experience
                                to new heights.
                            </p>
                            <p className="ventus-founder-emphasis">
                                Whether you just seek access to our unique benefits or desire extra assistance to make
                                your journey truly unforgettable, our team is dedicated to turning all your travel dreams
                                into reality.
                            </p>
                        </div>
                        <figure className="ventus-founder-image ventus-reveal ventus-reveal-delay">
                            <img
                                src="/assets/img/recovered/about-founder.webp"
                                alt="Daniella enjoying a stay in an ornate luxury hotel suite"
                                width="1200"
                                height="1500"
                                loading="eager"
                                decoding="async"
                            />
                        </figure>
                    </div>
                </section>

                <div className="ventus-mark-divider" aria-hidden="true">
                    <span />
                    <img src="/assets/img/recovered/ventus-mark.png" alt="" />
                    <span />
                </div>

                <section className="ventus-benefits-section" aria-labelledby="benefits-heading">
                    <div className="ventus-recovery-container">
                        <div className="ventus-benefits-intro ventus-reveal">
                            <h2 id="benefits-heading">
                                By collaborating with multiple luxury brands and properties, I can offer clients VIP
                                amenities and exclusive privileges during their travels.
                            </h2>
                            <Link className="ventus-outline-link" to="/contact-us">
                                Discover Now <ArrowIcon />
                            </Link>
                        </div>
                        <p className="ventus-benefits-lead">
                            Complimentary hotel and resort amenities may vary by properties, but often include:
                        </p>
                        <ul className="ventus-benefits-grid">
                            {amenities.map((amenity, index) => (
                                <li className="ventus-reveal" style={{ animationDelay: `${index * 55}ms` }} key={amenity.text}>
                                    <AmenityIcon name={amenity.icon} />
                                    <span>{amenity.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="ventus-occasion-section" aria-labelledby="occasion-heading">
                    <img
                        className="ventus-occasion-background"
                        src="/assets/img/recovered/special-occasion.jpg"
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />
                    <div className="ventus-occasion-copy ventus-reveal">
                        <h2 id="occasion-heading">Secure a discounted rate for your special occasion</h2>
                        <p>
                            I can organize and secure discounts for your corporate event, wedding, or anniversary,
                            ensuring a seamless and unforgettable experience while saving you time and reducing stress.
                        </p>
                        <Link className="ventus-outline-link" to="/buy-outs">
                            Learn More <ArrowIcon />
                        </Link>
                    </div>
                </section>

                <section className="ventus-adventures-section" aria-labelledby="adventures-heading">
                    <div className="ventus-recovery-container ventus-adventures-layout">
                        <div className="ventus-adventures-heading ventus-reveal">
                            <h2 id="adventures-heading">Follow along on my adventures</h2>
                            <a
                                className="ventus-instagram-link"
                                href="https://www.instagram.com/daniellagoodwin_/"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Follow Daniella on Instagram"
                            >
                                <InstagramIcon />
                            </a>
                        </div>
                        <a
                            className="ventus-instagram-grid"
                            href="https://www.instagram.com/daniellagoodwin_/"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="View Daniella's travel adventures on Instagram"
                        >
                            {instagramImages.map((src, index) => (
                                <img
                                    src={src}
                                    alt={`Daniella's travel adventure ${index + 1}`}
                                    key={src}
                                    loading="lazy"
                                    decoding="async"
                                />
                            ))}
                        </a>
                    </div>
                </section>

                <section className="ventus-testimonial-section" aria-labelledby="testimonial-heading">
                    <div className="ventus-recovery-container ventus-testimonial-grid">
                        <img
                            className="ventus-testimonial-image"
                            src="/assets/img/recovered/testimonial-rachel.jpg"
                            alt="Rachel enjoying afternoon tea in a garden"
                            loading="lazy"
                            decoding="async"
                        />
                        <figure className="ventus-testimonial-copy ventus-reveal">
                            <div className="ventus-stars" aria-label="Five out of five stars">
                                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                            </div>
                            <blockquote id="testimonial-heading">
                                I recently booked with Daniella and the experience was beyond incredible. From the moment
                                I reached out, she took the time to understand exactly what I was looking for and sent me
                                several beautiful options to choose from. The hotel was stunning, with breathtaking views
                                and world-class amenities. But what truly exceeded my expectations was the upgrade I
                                received—an over-the-top suite with panoramic ocean views! It was the perfect blend of
                                luxury, personal attention, and thoughtful surprises. I couldn&apos;t have asked for a better
                                experience, and I&apos;m already looking forward to booking my next trip with them!
                            </blockquote>
                            <figcaption>Rachel Speed</figcaption>
                        </figure>
                    </div>
                </section>

                <section
                    className="ventus-journey-cta"
                    aria-labelledby="journey-heading"
                    style={{
                        backgroundImage:
                            'linear-gradient(82deg, rgba(0, 0, 0, .78) 13%, rgba(0, 0, 0, 0) 80%), url("/assets/img/recovered/journey-portofino.jpg")',
                    }}
                >
                    <div className="ventus-recovery-container ventus-journey-layout">
                        <div>
                            <h2 id="journey-heading">Start Your Journey Today</h2>
                            <p>Explore the World with Ventus Luxury Travel</p>
                        </div>
                        <div className="ventus-journey-actions">
                            <Link className="ventus-solid-link" to="/contact-us">Contact <ArrowIcon /></Link>
                            <Link className="ventus-outline-link ventus-outline-link-light" to="/destinations">
                                Explore <ArrowIcon />
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default About;
