import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BannerCTA from '../components/shared/BannerCTA';
import { requestPasswordReset } from '../utils/authService';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const result = await requestPasswordReset(normalizedEmail);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage(
        result.message || 'If an account exists for that email, a reset link has been sent.'
      );
    } else {
      setError(result.error || 'Unable to send the reset email. Please try again.');
    }
  };

  return (
    <Layout>
      <section className="login-page password-reset-page rooms1 section-padding" data-scroll-index="1">
        <div className="container">
          <div className="row">
            <div className="col-md-12 col-lg-6">
              <div className="auth-card">
                <h2>Reset your password</h2>
                <p>Enter the email address linked to your account and we will send you a secure reset link.</p>

                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                {successMessage && (
                  <div className="alert alert-success" role="status">{successMessage}</div>
                )}

                {!successMessage && (
                  <form onSubmit={handleSubmit}>
                    <div className="form-group mb-3">
                      <label htmlFor="resetEmail" className="visually-hidden">Email address</label>
                      <input
                        type="email"
                        className="form-control"
                        id="resetEmail"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Your Email Address *"
                        autoComplete="email"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg butn-dark" disabled={isSubmitting}>
                      {isSubmitting ? 'Sending...' : 'Send reset link'}
                    </button>
                  </form>
                )}

                <p className="password-reset-support">
                  Not receiving the email? Contact{' '}
                  <a href="mailto:daniella@ventustravel.co.uk">daniella@ventustravel.co.uk</a>
                  {' '}so your account can be checked manually.
                </p>

                <p className="password-reset-back">
                  <Link to="/login" className="password-reset-back-link">Back to login</Link>
                </p>
              </div>
            </div>

            <div className="col-md-12 col-lg-6">
              <div className="sidebar text-center">
                <img src="/assets/img/ventus-logo.png" alt="Ventus Travel" />
                <h4>Remembered your password?</h4>
                <h3>Return to your Ventus Travel account</h3>
                <Link to="/login" className="btn btn-primary btn-lg">Log in</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <BannerCTA />
    </Layout>
  );
};

export default ForgotPassword;
