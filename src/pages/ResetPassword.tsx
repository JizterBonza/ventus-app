import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BannerCTA from '../components/shared/BannerCTA';
import { resetPassword, validatePasswordResetToken } from '../utils/authService';

const ResetPassword: React.FC = () => {
  const location = useLocation();
  const token = useMemo(
    () => new URLSearchParams(location.hash.replace(/^#/, '')).get('token') || '',
    [location.hash]
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;
    const validateToken = async () => {
      if (!token) {
        setError('This reset link is missing or invalid.');
        setIsValidating(false);
        return;
      }

      const result = await validatePasswordResetToken(token);
      if (!active) return;
      setIsTokenValid(result.success);
      setError(result.success ? '' : (result.error || 'This reset link is invalid or has expired.'));
      setIsValidating(false);
    };

    void validateToken();
    return () => { active = false; };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(token, password);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage(result.message || 'Your password has been reset. You can now log in.');
      setIsTokenValid(false);
    } else {
      setError(result.error || 'Unable to reset the password. Please request a new link.');
    }
  };

  return (
    <Layout>
      <section className="login-page password-reset-page rooms1 section-padding" data-scroll-index="1">
        <div className="container">
          <div className="row">
            <div className="col-md-12 col-lg-6">
              <div className="auth-card">
                <h2>Choose a new password</h2>

                {isValidating && <div className="alert alert-info" role="status">Checking your reset link...</div>}
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                {successMessage && (
                  <div className="alert alert-success" role="status">{successMessage}</div>
                )}

                {isTokenValid && !successMessage && (
                  <form onSubmit={handleSubmit}>
                    <div className="form-group mb-3">
                      <label htmlFor="newPassword" className="visually-hidden">New password</label>
                      <input
                        type="password"
                        className="form-control"
                        id="newPassword"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="New Password *"
                        autoComplete="new-password"
                        maxLength={128}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    <div className="form-group mb-3">
                      <label htmlFor="confirmPassword" className="visually-hidden">Confirm new password</label>
                      <input
                        type="password"
                        className="form-control"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm New Password *"
                        autoComplete="new-password"
                        maxLength={128}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg butn-dark" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Reset password'}
                    </button>
                  </form>
                )}

                {!isValidating && !isTokenValid && !successMessage && (
                  <p><Link to="/forgot-password" className="password-reset-back-link">Request a new reset link</Link></p>
                )}
                {successMessage && (
                  <p><Link to="/login" className="password-reset-back-link">Continue to login</Link></p>
                )}
              </div>
            </div>

            <div className="col-md-12 col-lg-6">
              <div className="sidebar text-center">
                <img src="/assets/img/ventus-logo.png" alt="Ventus Travel" />
                <h4>Need some help?</h4>
                <h3>Our travel team is here for you</h3>
                <a href="https://www.ventustravel.co.uk/contact-us" className="btn btn-primary btn-lg">Contact us</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <BannerCTA />
    </Layout>
  );
};

export default ResetPassword;
