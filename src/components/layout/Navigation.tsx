import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import UserMenu from "../shared/UserMenu";

const Navigation: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isAuthenticated, isLoading } = useAuth();

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
                        <Link className="nav-link" target="_blank" to="https://www.ventustravel.co.uk/about-us">
                            About Us
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/#destinations">
                            Destinations
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" target="_blank" to="https://www.ventustravel.co.uk/the-magazine">
                            The Magazine
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" target="_blank" to="https://www.ventustravel.co.uk/buy-outs">
                            Buy Outs
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" target="_blank" to="https://www.ventustravel.co.uk/contact-us">
                            Contact Us
                        </Link>
                    </li>
                    
                    {/* Authentication Links */}
                    {!isLoading && (
                        <>
                            {isAuthenticated ? (
                                <li className="nav-item" style={{ display: 'flex', alignItems: 'center', marginLeft: '10px' }}>
                                    <UserMenu />
                                </li>
                            ) : (
                                <>
                                    <li className="nav-item">
                                        <Link className="nav-link" to="/login">
                                            <i className="ti-user"></i> Login
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link className="nav-link" to="/signup" style={{
                                            background: '#aa8453',
                                            color: '#fff',
                                            padding: '8px 20px',
                                            borderRadius: '4px',
                                            marginLeft: '10px'
                                        }}>
                                            Sign Up
                                        </Link>
                                    </li>
                                </>
                            )}
                        </>
                    )}
                </ul>
            </div>
        </>
    );
};

export default Navigation;
