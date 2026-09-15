import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BannerCTA from '../components/shared/BannerCTA';
import { useAuth } from '../contexts/AuthContext';
import { signupUser } from '../utils/authService';

const COUNTRY_CODES = [
  { code: '+44', country: 'United Kingdom' }, { code: '+1', country: 'United States' },
  { code: '+34', country: 'Spain' }, { code: '+33', country: 'France' },
  { code: '+49', country: 'Germany' }, { code: '+39', country: 'Italy' },
  { code: '+351', country: 'Portugal' }, { code: '+41', country: 'Switzerland' },
  { code: '+31', country: 'Netherlands' }, { code: '+32', country: 'Belgium' },
  { code: '+43', country: 'Austria' }, { code: '+353', country: 'Ireland' },
  { code: '+971', country: 'UAE' }, { code: '+65', country: 'Singapore' },
  { code: '+852', country: 'Hong Kong' }, { code: '+61', country: 'Australia' },
  { code: '+81', country: 'Japan' },
];

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasActiveMembership, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    cityOfResidence: '', countryCode: '', phoneNumber: '', agreeToTerms: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(hasActiveMembership ? '/' : '/subscription', { replace: true });
    }
  }, [hasActiveMembership, isAuthenticated, isLoading, navigate]);

  const setField = (field: string, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => ({ ...current, [field]: '' }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = 'Enter a valid email address';
    if (formData.password.length < 8) errors.password = 'Use at least 8 characters';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!formData.cityOfResidence.trim()) errors.cityOfResidence = 'City of residence is required';
    if (!formData.countryCode) errors.countryCode = 'Choose a country code';
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!formData.agreeToTerms) errors.agreeToTerms = 'You must agree to the terms';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitMessage('');
    if (!validate()) return;
    setIsSubmitting(true);
    const response = await signupUser({
      email: formData.email, password: formData.password, confirmPassword: formData.confirmPassword,
      firstName: formData.firstName, lastName: formData.lastName,
      phone: `${formData.countryCode}${formData.phoneNumber}`,
      cityOfResidence: formData.cityOfResidence,
      agreeToTerms: formData.agreeToTerms,
    });
    setIsSubmitting(false);
    if (!response.success) {
      setSubmitMessage(response.error || 'Unable to create your account.');
      return;
    }
    window.location.assign('/subscription');
  };

  const fieldClass = (field: string) => `form-control ${validationErrors[field] ? 'is-invalid' : ''}`;

  return (
    <Layout>
      <section className="signup-page rooms1 section-padding" data-scroll-index="1">
        <div className="container"><div className="row justify-content-center"><div className="col-md-10 col-lg-8">
          <div className="auth-card">
            <div className="auth-card_heading">
              <img src="/assets/img/ventus-logo.png" alt="Ventus" />
              <h3 className="text-center mb-3">Join now to unlock<br />exclusive member benefits</h3>
              <p className="text-center mb-4">Travel membership · £299 per year</p>
            </div>
            {submitMessage && <div className="alert alert-danger" role="alert">{submitMessage}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="row g-3">
                <div className="col-md-6"><input className={fieldClass('firstName')} placeholder="First name *" value={formData.firstName} onChange={(e) => setField('firstName', e.target.value)} />{validationErrors.firstName && <div className="invalid-feedback">{validationErrors.firstName}</div>}</div>
                <div className="col-md-6"><input className={fieldClass('lastName')} placeholder="Last name *" value={formData.lastName} onChange={(e) => setField('lastName', e.target.value)} />{validationErrors.lastName && <div className="invalid-feedback">{validationErrors.lastName}</div>}</div>
                <div className="col-12"><input type="email" className={fieldClass('email')} placeholder="Email *" value={formData.email} onChange={(e) => setField('email', e.target.value)} />{validationErrors.email && <div className="invalid-feedback">{validationErrors.email}</div>}</div>
                <div className="col-md-6"><input type="password" className={fieldClass('password')} placeholder="Password *" value={formData.password} onChange={(e) => setField('password', e.target.value)} />{validationErrors.password && <div className="invalid-feedback">{validationErrors.password}</div>}</div>
                <div className="col-md-6"><input type="password" className={fieldClass('confirmPassword')} placeholder="Confirm password *" value={formData.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} />{validationErrors.confirmPassword && <div className="invalid-feedback">{validationErrors.confirmPassword}</div>}</div>
                <div className="col-12"><input className={fieldClass('cityOfResidence')} placeholder="City of residence *" value={formData.cityOfResidence} onChange={(e) => setField('cityOfResidence', e.target.value)} />{validationErrors.cityOfResidence && <div className="invalid-feedback">{validationErrors.cityOfResidence}</div>}</div>
                <div className="col-md-5"><select className={fieldClass('countryCode')} value={formData.countryCode} onChange={(e) => setField('countryCode', e.target.value)}><option value="">Country code *</option>{COUNTRY_CODES.map((item) => <option key={`${item.code}-${item.country}`} value={item.code}>{item.code} {item.country}</option>)}</select>{validationErrors.countryCode && <div className="invalid-feedback">{validationErrors.countryCode}</div>}</div>
                <div className="col-md-7"><input type="tel" className={fieldClass('phoneNumber')} placeholder="Phone number *" value={formData.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} />{validationErrors.phoneNumber && <div className="invalid-feedback">{validationErrors.phoneNumber}</div>}</div>
              </div>
              <div className="form-check mt-4">
                <input id="agreeToTerms" type="checkbox" className={`form-check-input ${validationErrors.agreeToTerms ? 'is-invalid' : ''}`} checked={formData.agreeToTerms} onChange={(e) => setField('agreeToTerms', e.target.checked)} />
                <label className="form-check-label" htmlFor="agreeToTerms">I agree to the <Link to="/terms-of-service">Terms of Service</Link> and <Link to="/privacy-policy">Privacy Policy</Link>.</label>
                {validationErrors.agreeToTerms && <div className="invalid-feedback">{validationErrors.agreeToTerms}</div>}
              </div>
              <button type="submit" className="btn btn-primary btn-lg butn-dark w-100 mt-4" disabled={isSubmitting}>{isSubmitting ? 'Creating your account…' : 'Create account and continue to secure payment'}</button>
              <p className="text-center mt-3 mb-0">No charge is made until the next secure PayPal step.</p>
            </form>
            <p className="text-center mt-4 mb-0">Already have an account? <Link to="/login"><strong>Login here</strong></Link></p>
          </div>
        </div></div></div>
      </section>
      <BannerCTA />
    </Layout>
  );
};

export default Signup;
