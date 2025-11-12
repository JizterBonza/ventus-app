import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import UserMenu from "../shared/UserMenu";

const Navigation: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isAuthenticated, isLoading } = useAuth();

    return (
        <>
            {/* Mobile Controls Wrapper - Shows on screens below 991px */}
            <div className="mobile-nav-controls" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
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
                        <i className={isMobileMenuOpen ? "ti-close" : "ti-menu"}></i>
                    </span>
                </button>

                {/* Mobile Auth - Shows beside toggler on mobile */}
                {!isLoading && (
                    <div className="mobile-auth" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        {isAuthenticated ? (
                            <UserMenu />
                        ) : (
                            <>
                                <Link className="nav-link" to="/login" style={{
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <i className="ti-user"></i>
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>

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
                    
                    {/* Authentication Links - Desktop only */}
                    {!isLoading && (
                        <>
                            {isAuthenticated ? (
                                <li className="nav-item desktop-auth" style={{ display: 'flex', alignItems: 'center', marginLeft: '10px' }}>
                                    <UserMenu />
                                </li>
                            ) : (
                                <>
                                    <li className="nav-item login-btn desktop-auth">
                                        <Link className="nav-link" to="/login">
                                            <i className="ti-user"></i> Login
                                        </Link>
                                    </li>
                                    <li className="nav-item signup-btn desktop-auth">
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

            {/* Responsive Styles */}
            <style>{`
                /* Mobile: Show mobile-auth, hide desktop-auth */
                @media screen and (max-width: 991px) {
                    .mobile-nav-controls {
                        display: flex !important;
                    }
                    .mobile-auth {
                        display: flex !important;
                    }
                    .desktop-auth {
                        display: none !important;
                    }
                }

                /* Desktop: Hide mobile-auth, show desktop-auth */
                @media screen and (min-width: 992px) {
                    .mobile-nav-controls {
                        display: none !important;
                    }
                    .mobile-auth {
                        display: none !important;
                    }
                    .desktop-auth {
                        display: revert !important;
                    }
                }
            `}</style>
        </>
    );
};

export default Navigation;
