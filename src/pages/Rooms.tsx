import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/shared/PageHeader';

interface Room {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  amenities: string[];
}

const Rooms: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const rooms: Room[] = [
    {
      id: 1,
      name: 'Junior Suite',
      price: 150,
      image: '/assets/img/rooms/1.jpg',
      category: 'suite',
      description: 'Spacious junior suite with modern amenities',
      amenities: ['King Bed', 'City View', 'Free WiFi', 'Mini Bar']
    },
    {
      id: 2,
      name: 'Deluxe Room',
      price: 120,
      image: '/assets/img/rooms/2.jpg',
      category: 'room',
      description: 'Comfortable deluxe room with elegant design',
      amenities: ['Queen Bed', 'Garden View', 'Free WiFi', 'Room Service']
    },
    {
      id: 3,
      name: 'Executive Suite',
      price: 250,
      image: '/assets/img/rooms/3.jpg',
      category: 'suite',
      description: 'Luxurious executive suite with premium features',
      amenities: ['King Bed', 'Balcony', 'Free WiFi', 'Spa Access']
    },
    {
      id: 4,
      name: 'Standard Room',
      price: 80,
      image: '/assets/img/rooms/4.jpg',
      category: 'room',
      description: 'Cozy standard room perfect for short stays',
      amenities: ['Twin Beds', 'Street View', 'Free WiFi', 'TV']
    },
    {
      id: 5,
      name: 'Presidential Suite',
      price: 500,
      image: '/assets/img/rooms/5.jpg',
      category: 'suite',
      description: 'Ultimate luxury with presidential treatment',
      amenities: ['King Bed', 'Panoramic View', 'Butler Service', 'Private Pool']
    },
    {
      id: 6,
      name: 'Family Room',
      price: 180,
      image: '/assets/img/rooms/6.jpg',
      category: 'room',
      description: 'Perfect for families with extra space',
      amenities: ['2 Queen Beds', 'Garden View', 'Free WiFi', 'Kitchenette']
    }
  ];

  const filteredRooms = selectedCategory === 'all' 
    ? rooms 
    : rooms.filter(room => room.category === selectedCategory);

  return (
    <Layout>
      {/* Page Header */}
      <PageHeader 
        title="Rooms & Suites"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Rooms', active: true }
        ]}
      />

      {/* Rooms Content */}
      <section className="rooms section-padding">
        <div className="container">
          {/* Filter Buttons */}
          <div className="row mb-5">
            <div className="col-md-12">
              <div className="filter-buttons text-center">
                <button 
                  className={`btn ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline-primary'} me-3`}
                  onClick={() => setSelectedCategory('all')}
                >
                  All Rooms
                </button>
                <button 
                  className={`btn ${selectedCategory === 'room' ? 'btn-primary' : 'btn-outline-primary'} me-3`}
                  onClick={() => setSelectedCategory('room')}
                >
                  Rooms
                </button>
                <button 
                  className={`btn ${selectedCategory === 'suite' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSelectedCategory('suite')}
                >
                  Suites
                </button>
              </div>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="row">
            {filteredRooms.map((room) => (
              <div key={room.id} className="col-md-4 mb-4">
                <div className="room-item">
                  <div className="room-image">
                    <img src={room.image} alt={room.name} className="img-fluid" />
                  </div>
                  <div className="room-content">
                    <div className="room-category">
                      <span className="badge bg-primary">{room.category.toUpperCase()}</span>
                    </div>
                    <h5 className="room-name">{room.name}</h5>
                    <p className="room-description">{room.description}</p>
                    <div className="room-price">
                      <span className="price">${room.price}</span>
                      <span className="per-night">/ night</span>
                    </div>
                    <div className="room-amenities">
                      <ul className="list-unstyled">
                        {room.amenities.slice(0, 3).map((amenity, index) => (
                          <li key={index}>
                            <i className="flaticon-check"></i> {amenity}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="room-actions">
                      <Link to={`/room-details/${room.id}`} className="btn btn-outline-primary me-2">
                        View Details
                      </Link>
                      <Link to="/booking" className="btn btn-primary">
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Features */}
      <section className="room-features section-padding bg-light">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center mb-5">
              <h2>Room Features</h2>
              <p>All our rooms come with premium amenities and services</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-3 col-6 mb-4">
              <div className="feature-item text-center">
                <i className="flaticon-wifi"></i>
                <h5>Free WiFi</h5>
                <p>High-speed internet access</p>
              </div>
            </div>
            <div className="col-md-3 col-6 mb-4">
              <div className="feature-item text-center">
                <i className="flaticon-bed"></i>
                <h5>Comfortable Beds</h5>
                <p>Premium mattresses and linens</p>
              </div>
            </div>
            <div className="col-md-3 col-6 mb-4">
              <div className="feature-item text-center">
                <i className="flaticon-breakfast"></i>
                <h5>Room Service</h5>
                <p>24/7 dining options</p>
              </div>
            </div>
            <div className="col-md-3 col-6 mb-4">
              <div className="feature-item text-center">
                <i className="flaticon-spa"></i>
                <h5>Spa Access</h5>
                <p>Complimentary spa facilities</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Rooms;