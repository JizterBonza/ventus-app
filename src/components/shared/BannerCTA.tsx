import React from "react";

const Newsletter: React.FC = () => {
    return (
        <section className="section-cta section-padding">
            <div className="container">
                <div className="cta-content">
                    <div className="cta-content_heading">
                        <h3>Start Your journey today</h3>
                        <p>Explore the World with Ventus Luxury Travels</p>
                    </div>
                    <div className="cta-content_buttons">
                        <a href="/contact-us" className="btn btn-primary btn-lg">Contact</a>
                        <a href="#" className="btn btn-secondary btn-lg">Explore</a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
