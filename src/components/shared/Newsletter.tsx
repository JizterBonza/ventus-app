import React from "react";

const Newsletter: React.FC = () => {
    return (
        <section className="section-newsletter section-padding">
            <div className="container">
                <div className="newsletter-content text-center">
                    <div className="subtitle">Newsletter</div>
                    <h2>Join Our Mailing List</h2>
                    <p>
                        Join our mailing list to receive exclusive offers, updates, and news about Ventus Hotels.
                        <br /> Be the first to know about our promotions, events, and special deals. Sign up now and
                        stay connected with us.
                    </p>
                    <form action="#" className="form">
                        <input type="email" placeholder="Enter your email address ..." required />
                        <button type="submit" className="btn btn-primary">
                            Sign Up
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
