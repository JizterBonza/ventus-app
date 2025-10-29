import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="container">
          <div className="row">
            <div className="col-lg-4">
              <div className="footer-info">
                <div className="footer-logo">
                  <img src="/assets/img/logo.svg" alt="The Cappa Luxury Hotel" />
                </div>
                <p>THE CAPPA is a modern, elegant HTML template for luxury hotels, resorts, and vacation rentals. Fully responsive, customizable, and perfect for hospitality websites.</p>
                <div className="footer-social">
                  <a href="#"><i className="ti-facebook"></i></a>
                  <a href="#"><i className="ti-twitter"></i></a>
                  <a href="#"><i className="ti-instagram"></i></a>
                  <a href="#"><i className="ti-youtube"></i></a>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="footer-contact">
                <h4>Contact Info</h4>
                <div className="contact-item">
                  <i className="ti-map-marker"></i>
                  <div>
                    <h6>Address</h6>
                    <p>123 Main Street, City, Country</p>
                  </div>
                </div>
                <div className="contact-item">
                  <i className="ti-mobile"></i>
                  <div>
                    <h6>Phone</h6>
                    <p>+1 234 567 8900</p>
                  </div>
                </div>
                <div className="contact-item">
                  <i className="ti-email"></i>
                  <div>
                    <h6>Email</h6>
                    <p>info@thecappa.com</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="footer-links">
                <h4>Quick Links</h4>
                <ul>
                  <li><Link to="/about">About Us</Link></li>
                  <li><Link to="/rooms">Rooms & Suites</Link></li>
                  <li><Link to="/restaurant">Restaurant</Link></li>
                  <li><Link to="/spa-wellness">Spa & Wellness</Link></li>
                  <li><Link to="/contact">Contact</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <p>&copy; 2024 THE CAPPA Luxury Hotel. All rights reserved.</p>
            </div>
            <div className="col-lg-6">
              <div className="footer-bottom-links">
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
