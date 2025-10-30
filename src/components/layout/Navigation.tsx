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
                        <Link className="nav-link" to="/about">
                            About
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/destinations">
                            Destinations
                        </Link>
                    </li>
                    <li className="nav-item dropdown">
                        <Link
                            className="nav-link dropdown-toggle"
                            to="#"
                            role="button"
                            data-bs-toggle="dropdown"
                            data-bs-auto-close="outside"
                            aria-expanded="false"
                        >
                            Rooms & Suites <i className="ti-angle-down"></i>
                        </Link>
                        <ul className="dropdown-menu">
                            <li>
                                <Link to="/rooms" className="dropdown-item">
                                    <span>Rooms 1</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/rooms2" className="dropdown-item">
                                    <span>Rooms 2</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/rooms3" className="dropdown-item">
                                    <span>Rooms 3</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/room-details" className="dropdown-item">
                                    <span>Room Details</span>
                                </Link>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/blog">
                            Blog
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/contact">
                            Contact Us
                        </Link>
                    </li>
                </ul>
            </div>
        </>
    );
};

export default Navigation;
