import React, { useState } from "react";
import SubscriptionModal from "./SubscriptionModal";

const Membership: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleJoinClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsModalOpen(true);
    };

    return (
        <>
            <section className="section-membership">
                <div className="container">
                    <div className="section-membership-content text-center">
                        <div className="membership-content_heading">
                            <img src="/assets/img/ventus-logo.png" />
                            
                            <h3>Join now to unlock exclusive member benefits</h3>
                            <button 
                                onClick={handleJoinClick} 
                                className="btn btn-primary btn-lg"
                            >
                                Join Now
                            </button>
                        </div>
                        <div className="membership-content_foot">
                            <p>Already have an account? Sign in here <a href="/login">here</a></p>
                        </div>
                    </div>
                </div>
            </section>
            
            <SubscriptionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
        </>
    );
};

export default Membership;
