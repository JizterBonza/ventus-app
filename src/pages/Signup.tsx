import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import BannerCTA from "../components/shared/BannerCTA";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await signup(formData);
      // Navigation will be handled by useEffect when isAuthenticated becomes true
    } catch (err) {
      console.error('Signup error:', err);
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
                  <img src="/assets/img/ventus-logo.png" />
                  <h3 className="text-center mb-4">Join now to unlock <br />exclusive member benefits</h3>
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="ti-alert"></i> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* First Name */}
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <input
                          type="text"
                          className={`form-control ${validationErrors.firstName ? 'is-invalid' : ''}`}
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="First Name *"
                          disabled={isLoading}
                        />
                        {validationErrors.firstName && (
                          <div className="invalid-feedback">{validationErrors.firstName}</div>
                        )}
                      </div>
                    </div>

                    {/* Last Name */}
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <input
                          type="text"
                          className={`form-control ${validationErrors.lastName ? 'is-invalid' : ''}`}
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Last Name *"
                          disabled={isLoading}
                        />
                        {validationErrors.lastName && (
                          <div className="invalid-feedback">{validationErrors.lastName}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="form-group mb-3">
                    <input
                      type="email"
                      className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email Address *"
                      disabled={isLoading}
                    />
                    {validationErrors.email && (
                      <div className="invalid-feedback">{validationErrors.email}</div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="form-group mb-3">
                    <input
                      type="tel"
                      className={`form-control ${validationErrors.phone ? 'is-invalid' : ''}`}
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Phone Number (Optional)"
                      disabled={isLoading}
                    />
                    {validationErrors.phone && (
                      <div className="invalid-feedback">{validationErrors.phone}</div>
                    )}
                  </div>

                  {/* Password */}
                  <div className="form-group mb-3">
                    <div className="input-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Password *"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary show-password-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={showPassword ? 'ti-eye' : 'ti-eye'}></i>
                      </button>
                    </div>
                    {validationErrors.password && (
                      <div className="invalid-feedback d-block">{validationErrors.password}</div>
                    )}
                    {/* 
                    <small className="form-text text-muted">
                      Must be at least 6 characters with uppercase, lowercase, and number
                    </small>
                    */}
                  </div>

                  {/* Confirm Password */}
                  <div className="form-group mb-3">
                    <div className="input-group">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className={`form-control ${validationErrors.confirmPassword ? 'is-invalid' : ''}`}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm Password *"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary show-password-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <i className={showConfirmPassword ? 'ti-eye' : 'ti-eye'}></i>
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <div className="invalid-feedback d-block">{validationErrors.confirmPassword}</div>
                    )}
                  </div>

                  {/* Terms and Conditions */}
                  <div className="form-group mb-4">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className={`form-check-input ${validationErrors.agreeToTerms ? 'is-invalid' : ''}`}
                        id="agreeToTerms"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleChange}
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
                    disabled={isLoading}
                   
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Account...
                      </>
                    ) : (
                      'Join Now'
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

