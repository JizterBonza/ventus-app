import React from "react";
import { Link } from "react-router-dom";
import Newsletter from "../shared/Newsletter";

const Footer: React.FC = () => {
    return (
        <>
            <Newsletter />
            <footer className="footer section-padding">
                <div className="container">
                    <div className="footer-top">
                        <div className="footer-logo">
                            <img src="/assets/img/logo-alt.svg" alt="Ventus Travel" />
                        </div>
                        <ul>
                            <li>
                                <Link to="/">Home</Link>
                            </li>
                            <li>
                                <Link to="/about">About</Link>
                            </li>
                            <li>
                                <Link to="/offers">Offers</Link>
                            </li>
                            <li>
                                <Link to="/contact">Contact</Link>
                            </li>
                        </ul>
                    </div>
                    <div className="footer-bottom">
                        <div className="copyright">© 2024 Ventus Luxury Travel. All rights reserved.</div>
                        <ul>
                            <li>
                                <Link to="/privacy-policy">Privacy Policy</Link>
                            </li>
                            <li>
                                <Link to="/terms-of-service">Terms of Service</Link>
                            </li>
                            <li>
                                <Link to="/cookie-settings">Cookie Settings</Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default Footer;
