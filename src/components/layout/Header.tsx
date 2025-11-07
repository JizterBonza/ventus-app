import React from "react";
import { Link, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import Breadcrumb from "../shared/Breadcrumb";

const Header: React.FC = () => {
    const location = useLocation();
    const hideBreadcrumbs = location.pathname === '/signup' || location.pathname === '/login';
    
    return (
        <>
            {/* Preloader */}
            {/* <div className="preloader-bg"></div>
      <div id="preloader">
        <div id="preloader-status">
          <div className="preloader-position loader"> <span></span> </div>
        </div>
      </div> */}

            {/* Progress scroll totop */}
            <div className="progress-wrap cursor-pointer">
                <svg className="progress-circle svg-content" width="100%" height="100%" viewBox="-1 -1 102 102">
                    <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
                </svg>
            </div>

            {/* Navbar */}
            <nav className="navbar navbar-expand-lg">
                <div className="container">
                    {/* Logo */}
                    <div className="logo-wrapper">
                        <Link className="logo" to="/">
                            <img src="/assets/img/logo.svg" className="logo-img" alt="Ventus Travel" />
                        </Link>
                    </div>

                    <Navigation />
                </div>
            </nav>
            {!hideBreadcrumbs && <Breadcrumb />}
        </>
    );
};

export default Header;
