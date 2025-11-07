import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (!user) {
    return null;
  }

  const getInitials = () => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="user-menu" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className="user-menu-button"
        onClick={toggleDropdown}
        style={{
          background: '#aa8453',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          color: '#fff',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={`${user.firstName} ${user.lastName}`}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        ) : (
          getInitials()
        )}
      </button>

      {isOpen && (
        <div
          className="user-menu-dropdown"
          style={{
            position: 'absolute',
            top: '50px',
            right: '0',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '220px',
            zIndex: 1000
          }}
        >
          <div
            style={{
              padding: '15px',
              borderBottom: '1px solid #eee'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {user.email}
            </div>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li>
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 15px',
                  color: '#333',
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ti-user" style={{ marginRight: '10px' }}></i>
                My Profile
              </Link>
            </li>
            <li>
              <Link
                to="/my-bookings"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 15px',
                  color: '#333',
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ti-calendar" style={{ marginRight: '10px' }}></i>
                My Bookings
              </Link>
            </li>
            <li>
              <Link
                to="/favorites"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 15px',
                  color: '#333',
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ti-heart" style={{ marginRight: '10px' }}></i>
                Favorites
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 15px',
                  color: '#333',
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ti-settings" style={{ marginRight: '10px' }}></i>
                Settings
              </Link>
            </li>
          </ul>

          <div
            style={{
              borderTop: '1px solid #eee',
              padding: '10px 15px'
            }}
          >
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '10px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <i className="ti-power-off" style={{ marginRight: '10px' }}></i>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

