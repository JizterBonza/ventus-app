import React, { useState } from "react";
import { Link } from "react-router-dom";

const Navigation: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <>
            {/* Button */}
            <button
                className="navbar-toggler"
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-controls="navbar"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle navigation"
            >
                <span className="navbar-toggler-icon">
                    <i className="ti-menu"></i>
                </span>
            </button>

            {/* Menu */}
            <div className={`collapse navbar-collapse ${isMobileMenuOpen ? "show" : ""}`} id="navbar">
                <ul className="navbar-nav ms-auto">
                    <li className="nav-item">
                        <Link className="nav-link" to="/">
                            Home
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/about-us">
                            About Us
                        </Link>
                    </li>
                    {/* <li className="nav-item">
                        <Link className="nav-link" to="/destinations">
                            Destinations
                        </Link>
                    </li> */}
                    <li className="nav-item">
                        <Link className="nav-link" to="/the-magazine">
                            The Magazine
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/buy-outs">
                            Buy Outs
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/contact-us">
                            Contact Us
                        </Link>
                    </li>
                </ul>
            </div>
        </>
    );
};

export default Navigation;
