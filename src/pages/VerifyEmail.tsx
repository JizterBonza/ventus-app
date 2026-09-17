import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BannerCTA from '../components/shared/BannerCTA';
import { resendVerificationEmail, verifyEmail } from '../utils/authService';

const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const state = location.state as { email?: string; emailSent?: boolean } | null;
  const [email, setEmail] = useState(state?.email || '');
  const [isBusy, setIsBusy] = useState(false);
  const [isChecking, setIsChecking] = useState(Boolean(location.hash));
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(state?.emailSent === false
    ? 'Your account was created, but we could not send the email. Request a new link below.'
    : state?.emailSent ? 'We have sent a confirmation link to your inbox.' : '');
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current || !location.hash) return;
    checkedRef.current = true;
    const token = new URLSearchParams(location.hash.replace(/^#/, '')).get('token') || '';
    window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`);
    if (!token) {
      setError('This confirmation link is missing or invalid.');
      setIsChecking(false);
      return;
    }
    void verifyEmail(token).then((result) => {
      setConfirmed(result.success);
      setNotice(result.success ? (result.message || 'Your email is confirmed.') : '');
      setError(result.success ? '' : (result.error || 'This link is invalid or has expired.'));
      setIsChecking(false);
    });
  }, [location.hash, location.pathname, location.search]);

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setIsBusy(true);
    const result = await resendVerificationEmail(email.trim());
    setIsBusy(false);
    if (result.success) setNotice(result.message || 'If your account needs confirming, a new link is on its way.');
    else setError(result.error || 'We could not send a new link. Please try again.');
  };

  return (
    <Layout>
      <section className="login-page password-reset-page account-email-page rooms1 section-padding">
        <div className="container"><div className="row justify-content-center"><div className="col-md-10 col-lg-7">
          <div className="auth-card account-email-card">
            <span className="account-email-eyebrow">Welcome to Ventus</span>
            <h2>Confirm your email</h2>
            <p>One small step before the journeys begin. Confirm your email address to continue your membership.</p>
            {isChecking && <div className="alert alert-info" role="status">Confirming your email…</div>}
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {notice && <div className="alert alert-success" role="status">{notice}</div>}
            {confirmed ? (
              <Link to="/login" className="btn btn-primary btn-lg butn-dark account-email-action">Continue to login</Link>
            ) : !isChecking && (
              <form onSubmit={handleResend}>
                <label htmlFor="verificationEmail" className="account-email-label">Need a new confirmation link?</label>
                <input id="verificationEmail" type="email" className="form-control" value={email}
                  onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" required disabled={isBusy} />
                <button type="submit" className="btn btn-primary btn-lg butn-dark account-email-action" disabled={isBusy}>
                  {isBusy ? 'Sending…' : 'Send a new link'}
                </button>
              </form>
            )}
            <p className="password-reset-back"><Link to="/login" className="password-reset-back-link">Back to login</Link></p>
            <p className="password-reset-support">Need a hand? <a href="mailto:daniella@ventustravel.co.uk">Get in touch with our team</a>.</p>
          </div>
        </div></div></div>
      </section>
      <BannerCTA />
    </Layout>
  );
};

export default VerifyEmail;
