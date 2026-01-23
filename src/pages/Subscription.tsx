import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { subscribeUser } from '../utils/authService';
import { VALID_COUPONS, CouponValidation } from '../types/subscription';

// Country codes list
const COUNTRY_CODES = [
  { code: '+44', country: 'United Kingdom' },
  { code: '+1', country: 'United States' },
  { code: '+34', country: 'Spain' },
  { code: '+33', country: 'France' },
  { code: '+49', country: 'Germany' },
  { code: '+39', country: 'Italy' },
  { code: '+351', country: 'Portugal' },
  { code: '+41', country: 'Switzerland' },
  { code: '+31', country: 'Netherlands' },
  { code: '+32', country: 'Belgium' },
  { code: '+43', country: 'Austria' },
  { code: '+353', country: 'Ireland' },
  { code: '+971', country: 'UAE' },
  { code: '+65', country: 'Singapore' },
  { code: '+852', country: 'Hong Kong' },
  { code: '+61', country: 'Australia' },
  { code: '+81', country: 'Japan' },
];

// Membership benefits
const BENEFITS = [
  {
    title: 'Lowest rates guaranteed',
    description: 'Guaranteed lowest rates, plus exclusive offers and preferential rates'
  },
  {
    title: 'Complimentary benefits',
    description: 'Breakfast, hotel credits, spa treatments, experiences and more'
  },
  {
    title: 'Hotel upgrades',
    description: 'Guaranteed upgrades at either time of booking or check-in'
  },
  {
    title: 'Flexible rates',
    description: 'Same cancellation, payment and loyalty point collection as when booking with the hotel directly'
  },
  {
    title: 'Booking fee',
    description: '£20 booking fee with no hidden costs'
  },
  {
    title: 'Instagram competitions',
    description: 'Win complimentary stays at hotels in the collection'
  },
  {
    title: 'Events',
    description: "Access to exclusive tickets to some of the world's most sought after events"
  },
  {
    title: 'Lifestyle offers',
    description: 'Money off car hire, private jets and more'
  }
];

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [currency, setCurrency] = useState('GBP');
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cityOfResidence: '',
    countryCode: '+44',
    phoneNumber: '',
    birthday: '',
    instagramCompetition: '',
    hasChildren: '',
    couponCode: ''
  });
  
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // Membership price
  const basePrice = currency === 'GBP' ? 299 : currency === 'EUR' ? 349 : 379;
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const validateCoupon = (code: string): CouponValidation => {
    const upperCode = code.toUpperCase().trim();
    
    if (!upperCode) {
      return { valid: false, discountPercent: 0, message: '' };
    }
    
    const coupon = VALID_COUPONS[upperCode];
    
    if (coupon) {
      return {
        valid: true,
        discountPercent: coupon.discountPercent,
        message: coupon.description
      };
    }
    
    return {
      valid: false,
      discountPercent: 0,
      message: 'Invalid coupon code'
    };
  };

  const handleCouponApply = () => {
    if (formData.couponCode) {
      const validation = validateCoupon(formData.couponCode);
      setCouponValidation(validation);
    }
  };

  const calculateFinalPrice = (): number => {
    if (couponValidation?.valid && couponValidation.discountPercent > 0) {
      const discount = (basePrice * couponValidation.discountPercent) / 100;
      return Math.max(0, basePrice - discount);
    }
    return basePrice;
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.cityOfResidence.trim()) errors.cityOfResidence = 'City of residence is required';
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await subscribeUser(
        'travel-yearly',
        couponValidation?.valid ? formData.couponCode.toUpperCase().trim() : undefined
      );

      if (response.success) {
        setSubmitStatus('success');
        setSubmitMessage('Welcome to the club! Your membership has been activated successfully.');
      } else {
        setSubmitStatus('error');
        setSubmitMessage(response.error || 'Failed to process membership. Please try again.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const finalPrice = calculateFinalPrice();

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#fff'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333'
  };

  return (
    <div className="subscription-page" style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <Header />
      
      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Currency Selector */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Currency
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#333'
            }}
          >
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>

        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ marginBottom: '20px' }}>
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" stroke="#d4c5a9" strokeWidth="1.5"/>
              <text x="30" y="35" textAnchor="middle" fontSize="14" fontFamily="serif" fill="#d4c5a9">LE</text>
              <path d="M20 18 L30 12 L40 18" stroke="#d4c5a9" strokeWidth="1.5" fill="none"/>
              <circle cx="30" cy="10" r="3" fill="#d4c5a9"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 400,
            color: '#333',
            fontFamily: '"Playfair Display", Georgia, serif',
            margin: 0
          }}>
            Join the club
          </h1>
        </div>

        {/* Membership Card */}
        <div style={{
          backgroundColor: '#f9f8f6',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '40px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Card decoration */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            opacity: 0.3
          }}>
            <svg width="50" height="50" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="28" stroke="#c4b896" strokeWidth="1"/>
              <text x="30" y="35" textAnchor="middle" fontSize="12" fontFamily="serif" fill="#c4b896">LE</text>
            </svg>
          </div>
          
          <div style={{
            width: '100%',
            height: '8px',
            background: 'linear-gradient(90deg, #d4c5a9 0%, #f9f8f6 100%)',
            borderRadius: '4px',
            marginBottom: '30px'
          }} />
          
          <h2 style={{
            fontSize: '28px',
            fontWeight: 400,
            color: '#333',
            fontFamily: '"Playfair Display", Georgia, serif',
            textAlign: 'center',
            marginBottom: '15px'
          }}>
            Travel
          </h2>
          
          <div style={{ textAlign: 'center' }}>
            <span style={{
              fontSize: '28px',
              fontWeight: 500,
              color: '#333'
            }}>
              {currencySymbol}{finalPrice}
            </span>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              per year
            </div>
          </div>

          {/* Coupon applied indicator */}
          {couponValidation?.valid && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e8f5e9',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#2e7d32'
            }}>
              {couponValidation.discountPercent}% discount applied!
            </div>
          )}

          {/* Toggle indicator */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '20px',
            gap: '8px'
          }}>
            <div style={{ width: '40px', height: '4px', backgroundColor: '#d4c5a9', borderRadius: '2px' }} />
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid #d4c5a9',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#d4c5a9',
                borderRadius: '50%'
              }} />
            </div>
            <div style={{ width: '40px', height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Benefits List */}
        <div style={{ marginBottom: '40px' }}>
          {BENEFITS.map((benefit, idx) => (
            <div key={idx} style={{
              paddingBottom: '20px',
              marginBottom: '20px',
              borderBottom: idx < BENEFITS.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '6px',
                margin: 0
              }}>
                {benefit.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: 1.6,
                margin: 0
              }}>
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Become a Member Button */}
        {!showForm && (
          <>
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#c4b896',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                marginBottom: '15px',
                transition: 'background-color 0.2s'
              }}
            >
              Become a member
            </button>
            <p style={{
              textAlign: 'center',
              fontSize: '13px',
              color: '#888'
            }}>
              Annual fee group membership
            </p>
          </>
        )}

        {/* Registration Form */}
        {showForm && (
          <div style={{ marginTop: '40px' }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <svg width="40" height="40" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" stroke="#d4c5a9" strokeWidth="1.5"/>
                <text x="30" y="35" textAnchor="middle" fontSize="12" fontFamily="serif" fill="#d4c5a9">LE</text>
              </svg>
            </div>
            
            <h2 style={{
              fontSize: '28px',
              fontWeight: 400,
              textAlign: 'center',
              marginBottom: '40px',
              fontFamily: '"Playfair Display", Georgia, serif',
              color: '#333'
            }}>
              Your details
            </h2>

            {/* Success/Error Messages */}
            {submitStatus !== 'idle' && (
              <div style={{
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '20px',
                backgroundColor: submitStatus === 'success' ? '#e8f5e9' : '#ffebee',
                color: submitStatus === 'success' ? '#2e7d32' : '#c62828'
              }}>
                {submitMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* First Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>First name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.firstName ? '#c62828' : '#e0e0e0'
                  }}
                />
                {formErrors.firstName && (
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>{formErrors.firstName}</div>
                )}
              </div>

              {/* Last Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Last name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.lastName ? '#c62828' : '#e0e0e0'
                  }}
                />
                {formErrors.lastName && (
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>{formErrors.lastName}</div>
                )}
              </div>

              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.email ? '#c62828' : '#e0e0e0'
                  }}
                />
                {formErrors.email && (
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>{formErrors.email}</div>
                )}
              </div>

              {/* Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.password ? '#c62828' : '#e0e0e0'
                  }}
                />
                {formErrors.password && (
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>{formErrors.password}</div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Confirm password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.confirmPassword ? '#c62828' : '#e0e0e0'
                  }}
                />
                {formErrors.confirmPassword && (
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>{formErrors.confirmPassword}</div>
                )}
              </div>

              {/* City of Residence */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>City of residence</label>
                <input
                  type="text"
                  value={formData.cityOfResidence}
                  onChange={(e) => handleInputChange('cityOfResidence', e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.cityOfResidence ? '#c62828' : '#e0e0e0'
                  }}
                />
                {formErrors.cityOfResidence && (
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>{formErrors.cityOfResidence}</div>
                )}
              </div>

              {/* Country Code */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Country code</label>
                <select
                  value={formData.countryCode}
                  onChange={(e) => handleInputChange('countryCode', e.target.value)}
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center'
                  }}
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.code} value={cc.code}>
                      {cc.code} {cc.country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone Number */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Phone number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: formErrors.phoneNumber ? '#c62828' : '#e0e0e0'
                  }}
                />
                {formErrors.phoneNumber && (
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>{formErrors.phoneNumber}</div>
                )}
              </div>

              {/* Birthday */}
              <div style={{ marginBottom: '30px' }}>
                <label style={labelStyle}>Birthday (optional)</label>
                <input
                  type="text"
                  placeholder="DD/MM"
                  value={formData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                  style={{
                    ...inputStyle,
                    width: '120px'
                  }}
                />
              </div>

              {/* Instagram Competition */}
              <div style={{ marginBottom: '30px', borderTop: '1px solid #f0f0f0', paddingTop: '30px' }}>
                <p style={{ fontSize: '14px', color: '#333', marginBottom: '15px', lineHeight: 1.5 }}>
                  Do you want to participate in our weekly Instagram competition to win stays at hotels?
                </p>
                <div style={{ display: 'flex', gap: '30px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="instagram"
                      checked={formData.instagramCompetition === 'yes'}
                      onChange={() => handleInputChange('instagramCompetition', 'yes')}
                      style={{ width: '18px', height: '18px', accentColor: '#c4b896' }}
                    />
                    <span style={{ fontSize: '14px' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="instagram"
                      checked={formData.instagramCompetition === 'no'}
                      onChange={() => handleInputChange('instagramCompetition', 'no')}
                      style={{ width: '18px', height: '18px', accentColor: '#c4b896' }}
                    />
                    <span style={{ fontSize: '14px' }}>No</span>
                  </label>
                </div>
              </div>

              {/* Children */}
              <div style={{ marginBottom: '30px', borderTop: '1px solid #f0f0f0', paddingTop: '30px' }}>
                <p style={{ fontSize: '14px', color: '#333', marginBottom: '15px', lineHeight: 1.5 }}>
                  Do you have any children to add to your membership profile?
                </p>
                <div style={{ display: 'flex', gap: '30px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="children"
                      checked={formData.hasChildren === 'yes'}
                      onChange={() => handleInputChange('hasChildren', 'yes')}
                      style={{ width: '18px', height: '18px', accentColor: '#c4b896' }}
                    />
                    <span style={{ fontSize: '14px' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="children"
                      checked={formData.hasChildren === 'no'}
                      onChange={() => handleInputChange('hasChildren', 'no')}
                      style={{ width: '18px', height: '18px', accentColor: '#c4b896' }}
                    />
                    <span style={{ fontSize: '14px' }}>No</span>
                  </label>
                </div>
              </div>

              {/* Coupon Code */}
              <div style={{ marginBottom: '30px', borderTop: '1px solid #f0f0f0', paddingTop: '30px' }}>
                <label style={labelStyle}>Referral code (optional)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={formData.couponCode}
                    onChange={(e) => {
                      handleInputChange('couponCode', e.target.value.toUpperCase());
                      setCouponValidation(null);
                    }}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      textTransform: 'uppercase'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCouponApply}
                    disabled={!formData.couponCode}
                    style={{
                      padding: '14px 24px',
                      backgroundColor: formData.couponCode ? '#c4b896' : '#e0e0e0',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: formData.couponCode ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    Apply
                  </button>
                </div>
                {couponValidation && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '13px',
                    color: couponValidation.valid ? '#2e7d32' : '#c62828'
                  }}>
                    {couponValidation.message}
                  </div>
                )}
              </div>

              {/* Price Summary */}
              <div style={{
                backgroundColor: '#f9f8f6',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '30px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#666' }}>Travel Membership</span>
                  <span>{currencySymbol}{basePrice}</span>
                </div>
                {couponValidation?.valid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#2e7d32' }}>
                    <span>Discount ({couponValidation.discountPercent}%)</span>
                    <span>-{currencySymbol}{((basePrice * couponValidation.discountPercent) / 100).toFixed(0)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid #e0e0e0',
                  fontWeight: 600,
                  fontSize: '18px'
                }}>
                  <span>Total</span>
                  <span>{currencySymbol}{finalPrice}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#c4b896',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {isSubmitting ? 'Processing...' : finalPrice === 0 ? 'Join for Free' : `Pay ${currencySymbol}${finalPrice} & Join`}
              </button>

              <p style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#888',
                marginTop: '15px',
                lineHeight: 1.5
              }}>
                By joining, you agree to our Terms & Conditions and Privacy Policy
              </p>
            </form>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Subscription;
