import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import BannerCTA from "../components/shared/BannerCTA";
import { signupUser, subscribeUser } from '../utils/authService';
import { VALID_COUPONS, CouponValidation, SubscriptionPlan, SUBSCRIPTION_PLANS } from '../types/subscription';

// Only Travel plan on signup (same as SubscriptionModal)
const SIGNUP_PLANS = [SUBSCRIPTION_PLANS.find(p => p.id === 'travel-yearly')!];

// Country codes list (same as SubscriptionModal)
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

const PAYPAL_CONTAINER_ID = 'signup-paypal-button-container';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error, clearError } = useAuth();

  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'EUR'>('USD');
  const selectedPlanId = 'travel-yearly';
  const selectedPlan = SIGNUP_PLANS[0];

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cityOfResidence: '',
    countryCode: '',
    phoneNumber: '',
    birthday: '',
    instagramCompetition: '',
    hasChildren: '',
    couponCode: '',
    agreeToTerms: false
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [paypalApproved, setPaypalApproved] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const paypalInitializedRef = useRef(false);
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const paypalRenderRetryRef = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const getPrice = (plan: SubscriptionPlan) => {
    switch (currency) {
      case 'GBP': return plan.priceGBP;
      case 'EUR': return plan.priceEUR;
      default: return plan.priceUSD;
    }
  };
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const basePrice = getPrice(selectedPlan);
  const calculateFinalPrice = (): number => {
    if (couponValidation?.valid && couponValidation.discountPercent > 0) {
      const discount = (basePrice * couponValidation.discountPercent) / 100;
      return Math.max(0, basePrice - discount);
    }
    return basePrice;
  };
  const finalPrice = calculateFinalPrice();

  const validateCoupon = (code: string): CouponValidation => {
    const upperCode = code.toUpperCase().trim();
    if (!upperCode) return { valid: false, discountPercent: 0, message: '' };
    const coupon = VALID_COUPONS[upperCode];
    if (coupon) {
      return { valid: true, discountPercent: coupon.discountPercent, message: coupon.description };
    }
    return { valid: false, discountPercent: 0, message: 'Invalid coupon code' };
  };
  const handleCouponApply = () => {
    if (formData.couponCode) {
      setCouponValidation(validateCoupon(formData.couponCode));
    }
  };

  const showPayPalError = (message: string) => {
    const container = document.getElementById(PAYPAL_CONTAINER_ID);
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger mb-2">${message}</div>
        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.location.reload()">Retry</button>
      `;
    }
  };

  const initializePayPalButton = (isRetry = false) => {
    const container = paypalContainerRef.current ?? document.getElementById(PAYPAL_CONTAINER_ID);
    if (!container || paypalApproved || finalPrice <= 0) return;
    if (!(window as any).paypal?.Buttons) {
      showPayPalError('PayPal SDK not loaded. Please try again.');
      return;
    }
    if (!document.body.contains(container)) {
      return;
    }
    container.innerHTML = '';
    try {
      const buttons = (window as any).paypal.Buttons({
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              amount: { value: finalPrice.toFixed(2), currency_code: currency },
              description: `${selectedPlan.name} Membership`
            }]
          });
        },
        onApprove: (_data: any, actions: any) => {
          return actions.order.capture().then((details: any) => {
            setPaypalOrderId(details.id);
            setPaypalApproved(true);
          }).catch(() => {
            setSubmitStatus('error');
            setSubmitMessage('PayPal payment capture failed. Please try again.');
            setPaypalApproved(false);
          });
        },
        onError: () => {
          setSubmitStatus('error');
          setSubmitMessage('PayPal payment failed. Please try again.');
          setPaypalApproved(false);
        },
        onCancel: () => {
          setPaypalApproved(false);
          setPaypalOrderId(null);
        }
      });
      // Render into the actual DOM element (more reliable than selector)
      const renderTarget = container as HTMLElement;
      buttons.render(renderTarget).catch((err: unknown) => {
        console.error('PayPal button render failed:', err);
        if (!document.body.contains(container)) return;
        if (!isRetry && !paypalRenderRetryRef.current) {
          paypalRenderRetryRef.current = true;
          setTimeout(() => {
            initializePayPalButton(true);
          }, 600);
        } else {
          paypalRenderRetryRef.current = false;
          showPayPalError('Failed to load PayPal payment button. Please try again.');
        }
      });
    } catch {
      showPayPalError('Failed to initialize PayPal payment. Please try again.');
    }
  };

  useEffect(() => {
    if (finalPrice <= 0 || paypalApproved) {
      const container = document.getElementById(PAYPAL_CONTAINER_ID);
      if (container) container.innerHTML = '';
      paypalInitializedRef.current = false;
      paypalRenderRetryRef.current = false;
      return;
    }
    paypalRenderRetryRef.current = false;
    const loadPayPalScript = () => {
      if ((window as any).paypal?.Buttons) {
        paypalInitializedRef.current = true;
        setTimeout(initializePayPalButton, 100);
        return;
      }
      const existing = document.querySelectorAll('script[src*="paypal.com/sdk"]');
      existing.forEach(s => {
        s.remove();
      });
      delete (window as any).paypal;
      const script = document.createElement('script');
      script.id = 'paypal-sdk-script-signup';
      script.src = `https://www.paypal.com/sdk/js?client-id=AfaoowvVXx5dXMEisezXWp4ZQpQm_3lRs-7YmDJc4-dDTFb529Tso9nmdCEF6P6Yn_wwnSpP_z0w10dk&currency=${currency}&components=buttons&intent=capture`;
      script.async = true;
      script.onload = () => {
        // Give SDK and DOM time to be ready before first render
        setTimeout(() => {
          if ((window as any).paypal?.Buttons) {
            paypalInitializedRef.current = true;
            initializePayPalButton();
          } else showPayPalError('PayPal SDK failed to initialize.');
        }, 400);
      };
      script.onerror = () => showPayPalError('Failed to load PayPal. Please check your connection.');
      document.body.appendChild(script);
    };
    const existingScript = document.querySelector(`script[src*="paypal.com/sdk"][src*="currency=${currency}"]`);
    const paypalReady = (window as any).paypal?.Buttons;
    if (existingScript && paypalReady) {
      if (!paypalInitializedRef.current) initializePayPalButton();
    } else {
      loadPayPalScript();
    }
    return () => {
      const container = document.getElementById(PAYPAL_CONTAINER_ID);
      if (container) container.innerHTML = '';
    };
  }, [finalPrice, paypalApproved, currency, selectedPlanId]);

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
    if (!formData.agreeToTerms) errors.agreeToTerms = 'You must agree to the terms and conditions';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitStatus('idle');

    if (!validateForm()) return;

    if (finalPrice > 0 && !paypalApproved) {
      setSubmitStatus('error');
      setSubmitMessage('Please complete PayPal payment to continue.');
      return;
    }

    const phone = formData.countryCode && formData.phoneNumber
      ? `${formData.countryCode}${formData.phoneNumber}`
      : undefined;

    setIsSubmitting(true);
    try {
      const signupResponse = await signupUser({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone,
        agreeToTerms: formData.agreeToTerms
      });

      if (!signupResponse.success) {
        setSubmitStatus('error');
        setSubmitMessage(signupResponse.error || 'Failed to create account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const subResponse = await subscribeUser(
        selectedPlanId,
        couponValidation?.valid ? formData.couponCode.toUpperCase().trim() : undefined,
        finalPrice > 0 && paypalApproved && paypalOrderId
          ? { type: 'paypal' as const, orderId: paypalOrderId }
          : undefined
      );

      if (subResponse.success) {
        setSubmitStatus('success');
        setSubmitMessage(`Welcome! Your ${selectedPlan.name} membership has been activated.`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSubmitStatus('error');
        setSubmitMessage(subResponse.error || 'Failed to activate membership. Please try again.');
      }
    } catch (err) {
      setSubmitStatus('error');
      setSubmitMessage('An unexpected error occurred. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
   

      <section className="signup-page rooms1 section-padding" data-scroll-index="1">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-10 col-lg-8">
              <div className="auth-card">
                <div className="auth-card_heading">
                  <img src="/assets/img/ventus-logo.png" alt="Ventus" />
                  <h3 className="text-center mb-4">Join now to unlock <br />exclusive member benefits</h3>
                </div>

                {/* Currency selector */}
                <div className="d-flex justify-content-end mb-3 currency-selector">
                  <label className="me-2 align-self-center small">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USD' | 'GBP' | 'EUR')}
                    className="form-control form-control-sm"
                    style={{ width: '90px' }}
                  >
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                {/* Plan (Travel only) - light styling, never black */}
                <div className="mb-4">
                  <div className="card border travel-card" style={{ backgroundColor: '#fff', color: '#333' }}>
                    <div className="card-body">
                      <h3 className="card-title text-uppercase mb-1" style={{ color: '#333' }}>{selectedPlan.name}</h3>
                      <p className="mb-0">
                        <span className="fw-bold" style={{ color: '#333' }}>{currencySymbol}{getPrice(selectedPlan)}</span>
                        <br></br>
                        <span className="small">per year</span>
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="ti-alert"></i> {error}
                  </div>
                )}

                {(submitStatus === 'success' || submitStatus === 'error') && submitMessage && (
                  <div className={`alert ${submitStatus === 'success' ? 'alert-success' : 'alert-danger'} mb-3`}>
                    {submitMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* First Name & Last Name */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <div className="form-group">
                        <input
                          type="text"
                          className={`form-control ${validationErrors.firstName ? 'is-invalid' : ''}`}
                          placeholder="First name"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          disabled={isLoading}
                        />
                        {validationErrors.firstName && (
                          <div className="invalid-feedback d-block">{validationErrors.firstName}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <input
                          type="text"
                          className={`form-control ${validationErrors.lastName ? 'is-invalid' : ''}`}
                          placeholder="Last name"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          disabled={isLoading}
                        />
                        {validationErrors.lastName && (
                          <div className="invalid-feedback d-block">{validationErrors.lastName}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="form-group mb-3">
                    <input
                      type="email"
                      className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={isLoading}
                    />
                    {validationErrors.email && (
                      <div className="invalid-feedback d-block">{validationErrors.email}</div>
                    )}
                  </div>

                  {/* Password */}
                  <div className="form-group mb-3">
                    <input
                      type="password"
                      className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={isLoading}
                    />
                    {validationErrors.password && (
                      <div className="invalid-feedback d-block">{validationErrors.password}</div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="form-group mb-3">
                    <input
                      type="password"
                      className={`form-control ${validationErrors.confirmPassword ? 'is-invalid' : ''}`}
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      disabled={isLoading}
                    />
                    {validationErrors.confirmPassword && (
                      <div className="invalid-feedback d-block">{validationErrors.confirmPassword}</div>
                    )}
                  </div>

                  {/* City of Residence */}
                  <div className="form-group mb-3">
                    <input
                      type="text"
                      className={`form-control ${validationErrors.cityOfResidence ? 'is-invalid' : ''}`}
                      placeholder="City of residence"
                      value={formData.cityOfResidence}
                      onChange={(e) => handleInputChange('cityOfResidence', e.target.value)}
                      disabled={isLoading}
                    />
                    {validationErrors.cityOfResidence && (
                      <div className="invalid-feedback d-block">{validationErrors.cityOfResidence}</div>
                    )}
                  </div>

                  {/* Country Code */}
                  <div className="form-group mb-3">
                    <select
                      className="form-control"
                      value={formData.countryCode}
                      onChange={(e) => handleInputChange('countryCode', e.target.value)}
                      disabled={isLoading}
                    >
                      <option value="" disabled>Country code</option>
                      {COUNTRY_CODES.map((cc) => (
                        <option key={cc.code} value={cc.code}>
                          {cc.code} {cc.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone Number */}
                  <div className="form-group mb-3">
                    <input
                      type="tel"
                      className={`form-control ${validationErrors.phoneNumber ? 'is-invalid' : ''}`}
                      placeholder="Phone number"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      disabled={isLoading}
                    />
                    {validationErrors.phoneNumber && (
                      <div className="invalid-feedback d-block">{validationErrors.phoneNumber}</div>
                    )}
                  </div>

                  {/* Birthday (optional) */}
                  <div className="form-group mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Birthday (DD/MM)"
                      value={formData.birthday}
                      onChange={(e) => handleInputChange('birthday', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  {/* Instagram Competition */}
                  <div className="form-group mb-3 pt-3 border-top">
                    <p className="small mb-2">
                      Do you want to participate in our weekly Instagram competition to win stays at hotels?
                    </p>
                    <div className="d-flex gap-3">
                      <label className="d-flex align-items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="instagram"
                          checked={formData.instagramCompetition === 'yes'}
                          onChange={() => handleInputChange('instagramCompetition', 'yes')}
                          disabled={isLoading}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="d-flex align-items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="instagram"
                          checked={formData.instagramCompetition === 'no'}
                          onChange={() => handleInputChange('instagramCompetition', 'no')}
                          disabled={isLoading}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="form-group mb-3 pt-3 border-top">
                    <p className="small mb-2">
                      Do you have any children to add to your membership profile?
                    </p>
                    <div className="d-flex gap-3">
                      <label className="d-flex align-items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="children"
                          checked={formData.hasChildren === 'yes'}
                          onChange={() => handleInputChange('hasChildren', 'yes')}
                          disabled={isLoading}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="d-flex align-items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="children"
                          checked={formData.hasChildren === 'no'}
                          onChange={() => handleInputChange('hasChildren', 'no')}
                          disabled={isLoading}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>

                  {/* Voucher / Referral code */}
                  <div className="form-group mb-3 pt-3 border-top">
                    <div className="d-flex gap-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Referral code (optional)"
                        value={formData.couponCode}
                        onChange={(e) => {
                          handleInputChange('couponCode', e.target.value.toUpperCase());
                          setCouponValidation(null);
                        }}
                        disabled={isLoading}
                        style={{ textTransform: 'uppercase' }}
                      />
                      <button
                        type="button"
                        className="apply-btn btn btn-outline-secondary"
                        onClick={handleCouponApply}
                        disabled={!formData.couponCode.trim() || isSubmitting}
                      >
                        Apply
                      </button>
                    </div>
                    {couponValidation && couponValidation.message && (
                      <div className={`small mt-1 ${couponValidation.valid ? 'text-success' : 'text-danger'}`}>
                        {couponValidation.message}
                      </div>
                    )}
                  </div>

                  {/* Price summary */}
                  <div className="bg-light rounded p-3 mb-3">
                    <div className="d-flex justify-content-between small mb-2">
                      <span>{selectedPlan.name} Membership</span>
                      <span>{currencySymbol}{basePrice}</span>
                    </div>
                    {couponValidation?.valid && couponValidation.discountPercent > 0 && (
                      <div className="d-flex justify-content-between small text-success mb-2">
                        <span>Discount ({couponValidation.discountPercent}%)</span>
                        <span>-{currencySymbol}{Math.round((basePrice * couponValidation.discountPercent) / 100)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between pt-2 border-top">
                      <span className="fw-semibold">Total</span>
                      <span className="fw-semibold">{currencySymbol}{finalPrice}</span>
                    </div>
                  </div>

                  {/* PayPal payment */}
                  {finalPrice > 0 && (
                    <div className="form-group mb-3">
                      {paypalApproved && paypalOrderId ? (
                        <div className="alert alert-success py-2 small">
                          <i className="ti-check me-2"></i> PayPal payment approved. Order ID: {paypalOrderId}
                        </div>
                      ) : (
                        <div ref={paypalContainerRef} id={PAYPAL_CONTAINER_ID} style={{ minHeight: '50px' }}></div>
                      )}
                    </div>
                  )}

                  {/* Terms and Conditions */}
                  <div className="form-group mb-4 pt-3 border-top">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className={`form-check-input ${validationErrors.agreeToTerms ? 'is-invalid' : ''}`}
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                        disabled={isLoading}
                      />
                      <label className="form-check-label" htmlFor="agreeToTerms">
                        I agree to the{' '}
                        <Link to="/terms" target="_blank" className="text-decoration-none">
                          Terms and Conditions
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" target="_blank" className="text-decoration-none">
                          Privacy Policy
                        </Link>
                      </label>
                      {validationErrors.agreeToTerms && (
                        <div className="invalid-feedback d-block">{validationErrors.agreeToTerms}</div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg butn-dark w-100"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Account...
                      </>
                    ) : (
                      finalPrice > 0 ? `Pay ${currencySymbol}${finalPrice} & Join` : 'Join Now'
                    )}
                  </button>
                </form>

                {/* Social Signup (Optional) 
                <div className="text-center mt-4">
                  <p className="mb-3">Or sign up with</p>
                  <div className="d-flex gap-2 justify-content-center">
                    <button className="btn btn-outline-primary" style={{ flex: 1 }}>
                      <i className="ti-facebook"></i> Facebook
                    </button>
                    <button className="btn btn-outline-danger" style={{ flex: 1 }}>
                      <i className="ti-google"></i> Google
                    </button>
                  </div>
                </div>
                */}

                {/* Login Link 
                <div className="text-center mt-4">
                  <p className="mb-0">
                    Already have an account?{' '}
                    <Link to="/login" className="text-decoration-none">
                      <strong>Login here</strong>
                    </Link>
                  </p>
                </div>
                */}
              </div>
            </div>
          </div>
        </div>
      </section>
      <BannerCTA />
    </Layout>
  );
};

export default Signup;

