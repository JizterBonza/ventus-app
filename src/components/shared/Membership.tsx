import React from "react";

const Newsletter: React.FC = () => {
    return (
        <section className="section-membership">
            <div className="container">
                <div className="section-membership-content text-center">
                    <div className="membership-content_heading">
                        <img src="/assets/img/ventus-logo.png" />
                        
                        <h3>Join now to unlock exclusive member benefits</h3>
                        <a href="#" className="btn btn-primary btn-lg">Join Now</a>
                    </div>
                    <div className="membership-content_foot">
                    <p>Already have an account? Sign in here <a href="#">here</a></p>
                        
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
