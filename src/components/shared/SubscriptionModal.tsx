import React, { useState, useEffect } from 'react';
import { subscribeUser } from '../../utils/authService';
import { VALID_COUPONS, CouponValidation, SubscriptionPlan, SUBSCRIPTION_PLANS } from '../../types/subscription';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

// Order plans: Travel
const ORDERED_PLANS = [
  SUBSCRIPTION_PLANS.find(p => p.id === 'travel-yearly')!,
];

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [currency, setCurrency] = useState('USD');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('travel-yearly');
  const [showForm, setShowForm] = useState(false);
  
  const selectedPlan = ORDERED_PLANS.find(p => p.id === selectedPlanId) || ORDERED_PLANS[0];
  
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

  // Get price based on currency
  const getPrice = (plan: SubscriptionPlan) => {
    switch (currency) {
      case 'GBP': return plan.priceGBP;
      case 'EUR': return plan.priceEUR;
      default: return plan.priceUSD;
    }
  };
  
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const basePrice = getPrice(selectedPlan);

  // Card background based on plan
  const getCardBackground = (cardStyle: string) => {
    switch (cardStyle) {
      case 'black':
        return 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)';
      case 'gold':
        return 'linear-gradient(135deg, #c9b896 0%, #d4c5a9 50%, #c9b896 100%)';
      default:
        return '#f9f8f6';
    }
  };

  const getLogoColor = (cardStyle: string) => {
    return cardStyle === 'black' ? '#c9b896' : (cardStyle === 'gold' ? '#1a1a1a' : '#c4b896');
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setSelectedPlanId('travel-yearly');
      setFormData({
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
      setFormErrors({});
      setCouponValidation(null);
      setSubmitStatus('idle');
      setSubmitMessage('');
    }
  }, [isOpen]);

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
        selectedPlan.id,
        couponValidation?.valid ? formData.couponCode.toUpperCase().trim() : undefined
      );

      if (response.success) {
        setSubmitStatus('success');
        setSubmitMessage(`Welcome to the ${selectedPlan.name} tier! Your membership has been activated successfully.`);
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

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setShowForm(true);
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
    backgroundColor: '#fff',
    fontFamily: "'Lato', sans-serif"
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 300,
    color: '#333',
    fontFamily: "'Lato', sans-serif"
  };

  if (!isOpen) return null;

  return (
    <div 
      className="subscription-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="subscription-modal"
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          maxWidth: '420px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Currency Selector - Upper Right */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '60px',
          zIndex: 10
        }}>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              padding: '4px 8px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              background: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#333',
              fontFamily: "'Lato', sans-serif",
              width: '70px',
              height: '40px',
            }}
          >
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            zIndex: 10,
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
            fontFamily: "'Lato', sans-serif"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          ✕
        </button>

        {/* Plans Selection View */}
        {!showForm && (
          <div style={{ padding: '100px 30px 40px 30px' }}>

            {/* Logo & Title */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              {/* Large Ventus Logo at Top */}
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                <img 
                  src="/assets/img/ventus-logo.png" 
                  alt="Ventus" 
                  style={{ 
                    height: '60px', 
                    width: 'auto',
                    objectFit: 'contain'
                  }} 
                />
              </div>
              
              {/* Title */}
              <h1 style={{
                fontSize: '32px',
                fontWeight: 300,
                color: '#1a1a1a',
                fontFamily: "'Lato', sans-serif",
                margin: 0,
                marginBottom: '20px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                JOIN VENTUS
              </h1>
              
              {/* Small Card with Ventus Logo */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '120px',
                  height: '80px',
                  borderRadius: '12px',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0'
                }}>
                  <img 
                    src="/assets/img/ventus-logo.png" 
                    alt="Ventus" 
                    style={{ 
                      height: '40px', 
                      width: 'auto',
                      objectFit: 'contain'
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Plans List - Vertical Stack */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '40px'
            }}>
              {ORDERED_PLANS.map((plan) => (
                <div 
                  key={plan.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >

                  {/* Price */}
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div>
                      <span style={{
                        fontSize: '32px',
                        fontWeight: 300,
                        color: '#1a1a1a',
                        fontFamily: "'Lato', sans-serif"
                      }}>
                        {currencySymbol}{getPrice(plan)}
                      </span>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#666',
                        marginTop: '4px',
                        fontFamily: "'Lato', sans-serif"
                      }}>
                        per year
                      </div>
                      
                      {/* Toggle Indicator */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: '12px',
                        gap: '5px'
                      }}>
                        <div style={{ 
                          width: '24px', 
                          height: '2px', 
                          backgroundColor: plan.cardStyle === 'gold' ? '#c9b896' : '#d4c5a9', 
                          borderRadius: '2px' 
                        }} />
                        <div style={{
                          width: '14px',
                          height: '14px',
                          border: `2px solid ${plan.cardStyle === 'gold' ? '#c9b896' : '#d4c5a9'}`,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{
                            width: '4px',
                            height: '4px',
                            backgroundColor: plan.cardStyle === 'gold' ? '#c9b896' : '#d4c5a9',
                            borderRadius: '50%'
                          }} />
                        </div>
                        <div style={{ 
                          width: '24px', 
                          height: '2px', 
                          backgroundColor: '#e0e0e0', 
                          borderRadius: '2px' 
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ 
                    height: '1px', 
                    backgroundColor: '#e0e0e0', 
                    margin: '0 0 20px 0' 
                  }} />

                  {/* Benefits List */}
                  <div style={{ marginBottom: '20px' }}>
                    {plan.benefits.map((benefit, idx) => (
                      <div key={idx} style={{
                        paddingBottom: '14px',
                        marginBottom: '14px',
                        borderBottom: idx < plan.benefits.length - 1 ? '1px solid #e0e0e0' : 'none'
                      }}>
                        <h4 style={{
                          fontSize: '13px',
                          fontWeight: 300,
                          color: '#1a1a1a',
                          margin: 0,
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: "'Lato', sans-serif"
                        }}>
                          {benefit.title.toUpperCase()}
                        </h4>
                        <p style={{
                          fontSize: '13px',
                          color: '#666',
                          lineHeight: 1.5,
                          margin: 0,
                          fontWeight: 300,
                          fontFamily: "'Lato', sans-serif"
                        }}>
                          {benefit.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div>
                    <button 
                      onClick={() => handleSelectPlan(plan.id)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: plan.cardStyle === 'black' ? '#1a1a1a' : '#c9b896',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '15px',
                        fontWeight: 300,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s, transform 0.2s',
                        marginBottom: '10px',
                        fontFamily: "'Lato', sans-serif"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Become a member
                    </button>
                    <p style={{
                      textAlign: 'center',
                      fontSize: '11px',
                      color: '#999',
                      margin: 0,
                      fontFamily: "'Lato', sans-serif"
                    }}>
                      Annual fee group membership
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registration Form View */}
        {showForm && (
          <div style={{ padding: '50px 30px 40px 30px' }}>
            {/* Back Button */}
            <button
              onClick={() => setShowForm(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                fontSize: '14px',
                color: '#666',
                cursor: 'pointer',
                padding: '0',
                marginBottom: '20px',
                fontFamily: "'Lato', sans-serif"
              }}
            >
              <span style={{ fontSize: '18px', fontFamily: "'Lato', sans-serif" }}>←</span> Back to plans
            </button>

            {/* Selected Plan Card Preview */}
            <div style={{
              background: getCardBackground(selectedPlan.cardStyle),
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '30px',
              position: 'relative',
              overflow: 'hidden',
              border: selectedPlan.cardStyle === 'white' ? '1px solid #e8e8e8' : 'none'
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                opacity: 0.4
              }}>
                <img 
                  src="/assets/img/ventus-logo.png" 
                  alt="Ventus" 
                  style={{ 
                    height: '32px', 
                    width: 'auto',
                    objectFit: 'contain',
                    filter: selectedPlan.cardStyle === 'black' ? 'brightness(0) invert(1)' : 'none'
                  }} 
                />
              </div>
              
              <h2 style={{
                fontSize: '22px',
                fontWeight: 300,
                color: selectedPlan.cardStyle === 'black' ? '#fff' : '#333',
                fontFamily: "'Lato', sans-serif",
                textAlign: 'center',
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                {selectedPlan.name}
              </h2>
              
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: '22px',
                  fontWeight: 300,
                  color: selectedPlan.cardStyle === 'black' ? '#fff' : '#333',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  {currencySymbol}{finalPrice}
                </span>
                <div style={{ 
                  fontSize: '12px', 
                  color: selectedPlan.cardStyle === 'black' ? '#aaa' : '#666', 
                  marginTop: '2px',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  per year
                </div>
              </div>

              {couponValidation?.valid && (
                <div style={{
                  marginTop: '10px',
                  padding: '6px',
                  backgroundColor: selectedPlan.cardStyle === 'black' ? 'rgba(46, 125, 50, 0.2)' : '#e8f5e9',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#2e7d32',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  {couponValidation.discountPercent}% discount applied!
                </div>
              )}
            </div>

            {/* Form Header */}
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <img 
                src="/assets/img/ventus-logo.png" 
                alt="Ventus" 
                style={{ 
                  height: '36px', 
                  width: 'auto',
                  objectFit: 'contain'
                }} 
              />
            </div>
            
            <h2 style={{
              fontSize: '24px',
              fontWeight: 300,
              textAlign: 'center',
              marginBottom: '30px',
              fontFamily: "'Lato', sans-serif",
              color: '#333',
              textTransform: 'uppercase'
            }}>
              Your details
            </h2>

            {/* Success/Error Messages */}
            {submitStatus !== 'idle' && (
              <div style={{
                padding: '14px',
                borderRadius: '6px',
                marginBottom: '20px',
                backgroundColor: submitStatus === 'success' ? '#e8f5e9' : '#ffebee',
                color: submitStatus === 'success' ? '#2e7d32' : '#c62828',
                fontSize: '14px',
                fontFamily: "'Lato', sans-serif"
              }}>
                {submitMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* First Name */}
              <div style={{ marginBottom: '16px' }}>
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
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px', fontFamily: "'Lato', sans-serif" }}>{formErrors.firstName}</div>
                )}
              </div>

              {/* Last Name */}
              <div style={{ marginBottom: '16px' }}>
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
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px', fontFamily: "'Lato', sans-serif" }}>{formErrors.lastName}</div>
                )}
              </div>

              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
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
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px', fontFamily: "'Lato', sans-serif" }}>{formErrors.email}</div>
                )}
              </div>

              {/* Password */}
              <div style={{ marginBottom: '16px' }}>
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
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px', fontFamily: "'Lato', sans-serif" }}>{formErrors.password}</div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '16px' }}>
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
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px', fontFamily: "'Lato', sans-serif" }}>{formErrors.confirmPassword}</div>
                )}
              </div>

              {/* City of Residence */}
              <div style={{ marginBottom: '16px' }}>
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
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px', fontFamily: "'Lato', sans-serif" }}>{formErrors.cityOfResidence}</div>
                )}
              </div>

              {/* Country Code */}
              <div style={{ marginBottom: '16px' }}>
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
              <div style={{ marginBottom: '16px' }}>
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
                  <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px', fontFamily: "'Lato', sans-serif" }}>{formErrors.phoneNumber}</div>
                )}
              </div>

              {/* Birthday */}
              <div style={{ marginBottom: '24px' }}>
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
              <div style={{ marginBottom: '24px', borderTop: '1px solid #f0f0f0', paddingTop: '24px' }}>
                <p style={{ fontSize: '13px', color: '#333', marginBottom: '12px', lineHeight: 1.5, fontFamily: "'Lato', sans-serif" }}>
                  Do you want to participate in our weekly Instagram competition to win stays at hotels?
                </p>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="instagram"
                      checked={formData.instagramCompetition === 'yes'}
                      onChange={() => handleInputChange('instagramCompetition', 'yes')}
                      style={{ width: '16px', height: '16px', accentColor: '#c4b896' }}
                    />
                    <span style={{ fontSize: '13px', fontFamily: "'Lato', sans-serif" }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="instagram"
                      checked={formData.instagramCompetition === 'no'}
                      onChange={() => handleInputChange('instagramCompetition', 'no')}
                      style={{ width: '16px', height: '16px', accentColor: '#c4b896' }}
                    />
                    <span style={{ fontSize: '13px', fontFamily: "'Lato', sans-serif" }}>No</span>
                  </label>
                </div>
              </div>

              {/* Children */}
              <div style={{ marginBottom: '24px', borderTop: '1px solid #f0f0f0', paddingTop: '24px' }}>
                <p style={{ fontSize: '13px', color: '#333', marginBottom: '12px', lineHeight: 1.5, fontFamily: "'Lato', sans-serif" }}>
                  Do you have any children to add to your membership profile?
                </p>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="children"
                      checked={formData.hasChildren === 'yes'}
                      onChange={() => handleInputChange('hasChildren', 'yes')}
                      style={{ width: '16px', height: '16px', accentColor: '#c4b896' }}
                    />
                    <span style={{ fontSize: '13px', fontFamily: "'Lato', sans-serif" }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="children"
                      checked={formData.hasChildren === 'no'}
                      onChange={() => handleInputChange('hasChildren', 'no')}
                      style={{ width: '16px', height: '16px', accentColor: '#c4b896' }}
                    />
                    <span style={{ fontSize: '13px', fontFamily: "'Lato', sans-serif" }}>No</span>
                  </label>
                </div>
              </div>

              {/* Coupon Code */}
              <div style={{ marginBottom: '24px', borderTop: '1px solid #f0f0f0', paddingTop: '24px' }}>
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
                      padding: '14px 20px',
                      backgroundColor: formData.couponCode ? (selectedPlan.cardStyle === 'black' ? '#1a1a1a' : '#c4b896') : '#e0e0e0',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: formData.couponCode ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      fontWeight: 300,
                      fontFamily: "'Lato', sans-serif"
                    }}
                  >
                    Apply
                  </button>
                </div>
                {couponValidation && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: couponValidation.valid ? '#2e7d32' : '#c62828',
                    fontFamily: "'Lato', sans-serif"
                  }}>
                    {couponValidation.message}
                  </div>
                )}
              </div>

              {/* Price Summary */}
              <div style={{
                backgroundColor: '#f9f8f6',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontFamily: "'Lato', sans-serif" }}>
                  <span style={{ color: '#666' }}>{selectedPlan.name} Membership</span>
                  <span>{currencySymbol}{basePrice}</span>
                </div>
                {couponValidation?.valid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#2e7d32', fontSize: '14px', fontFamily: "'Lato', sans-serif" }}>
                    <span>Discount ({couponValidation.discountPercent}%)</span>
                    <span>-{currencySymbol}{((basePrice * couponValidation.discountPercent) / 100).toFixed(0)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid #e0e0e0',
                  fontWeight: 300,
                  fontSize: '16px',
                  fontFamily: "'Lato', sans-serif"
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
                  padding: '14px',
                  backgroundColor: selectedPlan.cardStyle === 'black' ? '#1a1a1a' : '#c4b896',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 300,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  fontFamily: "'Lato', sans-serif"
                }}
              >
                {isSubmitting ? 'Processing...' : finalPrice === 0 ? 'Join for Free' : `Pay ${currencySymbol}${finalPrice} & Join`}
              </button>

              <p style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#888',
                marginTop: '12px',
                lineHeight: 1.5,
                fontFamily: "'Lato', sans-serif"
              }}>
                By joining, you agree to our Terms & Conditions and Privacy Policy
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionModal;
