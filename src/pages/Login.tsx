import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import BannerCTA from "../components/shared/BannerCTA";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
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
      await login({
        email: formData.email,
        password: formData.password
      });
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <Layout>
     
      <section className="login-page rooms1 section-padding" data-scroll-index="1">
        <div className="container">
          <div className="row">
           
            
            {/* Main Content */}
            <div className="col-md-12 col-lg-6">
              <div className="auth-card" >
                <h2>Access your account</h2>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="ti-alert"></i> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Email */}
                  <div className="form-group mb-3">
                    <input
                      type="email"
                      className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Your Email Address *"
                      disabled={isLoading}
                    />
                    {validationErrors.email && (
                      <div className="invalid-feedback">{validationErrors.email}</div>
                    )}
                  </div>

                  {/* Password */}
                  <div className="form-group mb-3">
                    <input
                      type="password"
                      className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Your Password *"
                      disabled={isLoading}
                    />
                    {validationErrors.password && (
                      <div className="invalid-feedback">{validationErrors.password}</div>
                    )}
                  </div>

                  {/* Remember Me & Login Button */}
                  <div className="form-group mb-4 d-flex justify-content-between align-items-center">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="rememberMe"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      <label className="form-check-label" htmlFor="rememberMe">
                        Remember me
                      </label>
                    </div>
                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg butn-dark "
                      disabled={isLoading}
                     
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Logging in...
                        </>
                      ) : (
                        'Log in'
                      )}
                    </button>
                    {/* 
                    <Link to="/forgot-password" className="text-decoration-none">
                      Forgot Password?
                    </Link>
                    */}
                  </div>
                </form>

                {/* Social Login (Optional)
                <div className="text-center mt-4">
                  <p className="mb-3">Or login with</p>
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
                {/* Signup Link 
                <div className="text-center mt-4">
                  <p className="mb-0">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-decoration-none">
                      <strong>Sign up here</strong>
                    </Link>
                  </p>
                </div>
*/}
              </div>
            </div>
             {/* Sidebar */}
             <div className="col-md-12 col-lg-6">
              <div className="sidebar text-center">
                <img src="/assets/img/ventus-logo.png" alt="Login Sidebar" />
                <h4>Don't have an account?</h4>
                <h3>Join now to unlock exclusive member benefits</h3>
                <a href="/signup" className="btn btn-primary btn-lg">Join Now</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <BannerCTA />
    </Layout>
  );
};

export default Login;

