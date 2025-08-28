import React from 'react';
import Layout from '../components/layout/Layout';

const About: React.FC = () => {
  return (
    <Layout>
      {/* Page Header */}
      <section className="page-header">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="page-header-content">
                <h1>About Us</h1>
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb">
                    <li className="breadcrumb-item"><a href="/">Home</a></li>
                    <li className="breadcrumb-item active" aria-current="page">About</li>
                  </ol>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="about-content section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <div className="about-text">
                <div className="section-subtitle">The Cappa Luxury Hotel</div>
                <div className="section-title">About Our Hotel</div>
                <p>Welcome to THE CAPPA, a luxurious 5-star hotel located in the heart of the city. Our hotel offers the perfect blend of comfort, elegance, and exceptional service to ensure your stay is nothing short of extraordinary.</p>
                <p>With over 20 years of experience in hospitality, we have created a haven for travelers seeking the finest accommodations and amenities. Our dedicated staff is committed to providing personalized service that exceeds your expectations.</p>
                <div className="about-features">
                  <div className="feature-item">
                    <i className="flaticon-bed"></i>
                    <div>
                      <h5>Luxury Rooms</h5>
                      <p>Spacious and elegantly designed rooms with premium amenities</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <i className="flaticon-restaurant"></i>
                    <div>
                      <h5>Fine Dining</h5>
                      <p>World-class restaurants serving international and local cuisine</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <i className="flaticon-spa"></i>
                    <div>
                      <h5>Spa & Wellness</h5>
                      <p>Relax and rejuvenate with our state-of-the-art spa facilities</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="about-images">
                <img src="/assets/img/about/1.jpg" alt="Hotel Exterior" className="img-fluid mb-4" />
                <img src="/assets/img/about/2.jpg" alt="Hotel Interior" className="img-fluid" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats section-padding bg-dark">
        <div className="container">
          <div className="row">
            <div className="col-md-3 col-6">
              <div className="stat-item text-center">
                <div className="stat-number">150</div>
                <div className="stat-label">Luxury Rooms</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-item text-center">
                <div className="stat-number">20</div>
                <div className="stat-label">Years Experience</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-item text-center">
                <div className="stat-number">50</div>
                <div className="stat-label">Staff Members</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-item text-center">
                <div className="stat-number">1000+</div>
                <div className="stat-label">Happy Guests</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;