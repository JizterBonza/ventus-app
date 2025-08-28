import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
        <span className="navbar-toggler-icon"><i className="ti-menu"></i></span>
      </button>

      {/* Menu */}
      <div className={`collapse navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`} id="navbar">
        <ul className="navbar-nav ms-auto">
          <li className="nav-item dropdown">
            <Link className="nav-link active dropdown-toggle" to="#" role="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false">
              Home <i className="ti-angle-down"></i>
            </Link>
            <ul className="dropdown-menu">
              <li><Link to="/" className="dropdown-item active"><span>Home Layout 1</span></Link></li>
              <li><Link to="/home2" className="dropdown-item"><span>Home Layout 2</span></Link></li>
              <li><Link to="/home3" className="dropdown-item"><span>Home Layout 3</span></Link></li>
              <li><Link to="/home4" className="dropdown-item"><span>Home Layout 4</span></Link></li>
            </ul>     
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/about">About</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/search">Search Hotels</Link>
          </li>
          <li className="nav-item dropdown">
            <Link className="nav-link dropdown-toggle" to="#" role="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false">
              Rooms & Suites <i className="ti-angle-down"></i>
            </Link>
            <ul className="dropdown-menu">
              <li><Link to="/rooms" className="dropdown-item"><span>Rooms 1</span></Link></li>
              <li><Link to="/rooms2" className="dropdown-item"><span>Rooms 2</span></Link></li>
              <li><Link to="/rooms3" className="dropdown-item"><span>Rooms 3</span></Link></li>
              <li><Link to="/room-details" className="dropdown-item"><span>Room Details</span></Link></li>
            </ul>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/restaurant">Restaurant</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/spa-wellness">Spa</Link>
          </li>
          <li className="nav-item dropdown">
            <Link className="nav-link dropdown-toggle" to="#" role="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false">
              Pages <i className="ti-angle-down"></i>
            </Link>
            <ul className="dropdown-menu">
              <li><Link to="/services" className="dropdown-item"><span>Services</span></Link></li>
              <li><Link to="/facilities" className="dropdown-item"><span>Facilities</span></Link></li>
              <li><Link to="/gallery" className="dropdown-item"><span>Gallery</span></Link></li>
              <li><Link to="/team" className="dropdown-item"><span>Team</span></Link></li>
              <li><Link to="/pricing" className="dropdown-item"><span>Pricing</span></Link></li>
              <li><Link to="/careers" className="dropdown-item"><span>Careers</span></Link></li>
              <li><Link to="/faq" className="dropdown-item"><span>F.A.Qs</span></Link></li>
            </ul>
          </li>
          <li className="nav-item dropdown">
            <Link className="nav-link dropdown-toggle" to="#" role="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false">
              News <i className="ti-angle-down"></i>
            </Link>
            <ul className="dropdown-menu">
              <li><Link to="/news" className="dropdown-item"><span>News 1</span></Link></li>
              <li><Link to="/news2" className="dropdown-item"><span>News 2</span></Link></li>
              <li><Link to="/post" className="dropdown-item"><span>Post Page</span></Link></li>
            </ul>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/contact">Contact</Link>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Navigation;
