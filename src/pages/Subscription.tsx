import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BannerCTA from '../components/shared/BannerCTA';
import { useAuth } from '../contexts/AuthContext';
import {
  activateComplimentaryMembership,
  capturePayPalMembershipOrder,
  createPayPalMembershipOrder,
  createStripeMembershipCheckout,
  confirmStripeMembershipCheckout,
  getMembershipCheckoutConfig,
  getMembershipQuote,
  MembershipCheckoutConfig,
  MembershipQuote,
} from '../utils/authService';

const MEMBER_BENEFITS = [
  'Exclusive member rates and preferential offers',
  'Complimentary breakfasts, hotel credits and experiences',
  'Priority upgrades where available',
  'Flexible hotel-direct cancellation and payment conditions',
  'Access to Ventus Travel advice and booking support',
];

const PAYPAL_CONTAINER_ID = 'secure-membership-paypal-buttons';

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, hasActiveMembership, isLoading } = useAuth();
  const [config, setConfig] = useState<MembershipCheckoutConfig | null>(null);
  const [quote, setQuote] = useState<MembershipQuote | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const stripeSessionId = new URLSearchParams(location.search).get('stripe_session_id');
  const checkoutCancelled = new URLSearchParams(location.search).get('checkout') === 'cancelled';
  const paymentLocked = status === 'processing' || status === 'success' || Boolean(stripeSessionId);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isAuthenticated, isLoading, location, navigate]);

  useEffect(() => {
    if (!isAuthenticated || hasActiveMembership || stripeSessionId) return;
    let cancelled = false;
    Promise.all([getMembershipCheckoutConfig(), getMembershipQuote()])
      .then(([nextConfig, nextQuote]) => {
        if (cancelled) return;
        setConfig(nextConfig);
        setQuote(nextQuote);
        setStatus('ready');
        if (checkoutCancelled) setMessage('Checkout was closed. You can return to secure payment below.');
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to load membership checkout.');
      });
    return () => { cancelled = true; };
  }, [hasActiveMembership, isAuthenticated, stripeSessionId, checkoutCancelled]);

  useEffect(() => {
    if (!isAuthenticated || hasActiveMembership || !stripeSessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const confirm = async (attempt = 0) => {
      setStatus('processing');
      setMessage('Confirming your membership payment…');
      try {
        const result = await confirmStripeMembershipCheckout(stripeSessionId);
        if (cancelled) return;
        if (result.active) {
          setStatus('success');
          setMessage('Your Ventus Travel membership is active.');
          timer = setTimeout(() => window.location.assign('/subscription'), 1000);
        } else if (result.pending && attempt < 5) {
          timer = setTimeout(() => confirm(attempt + 1), 2000);
        } else {
          setStatus('error');
          setMessage(result.pending
            ? 'Your payment is still being confirmed. Please refresh shortly; do not pay again.'
            : 'This payment has not activated your membership. Please contact Ventus before making another payment.');
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to confirm your payment. Please refresh shortly; do not pay again.');
      }
    };
    void confirm();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isAuthenticated, hasActiveMembership, stripeSessionId]);

  useEffect(() => {
    if (config?.stripe?.configured || stripeSessionId || !config?.paypal.configured || !config.paypal.clientId || !quote || quote.finalPrice <= 0 || status !== 'ready') return;
    let cancelled = false;
    const container = paypalContainerRef.current;
    const renderButtons = () => {
      if (cancelled || !(window as any).paypal?.Buttons || !container) return;
      container.innerHTML = '';
      (window as any).paypal.Buttons({
        createOrder: async () => createPayPalMembershipOrder(appliedCoupon || undefined),
        onApprove: async (data: { orderID: string }) => {
          setStatus('processing');
          setMessage('Confirming your payment securely…');
          try {
            await capturePayPalMembershipOrder(data.orderID);
            setStatus('success');
            setMessage('Your Ventus Travel membership is active.');
            window.setTimeout(() => window.location.assign('/'), 1200);
          } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Payment could not be verified. No membership was activated.');
          }
        },
        onCancel: () => {
          setStatus('ready');
          setMessage('Payment was cancelled. You have not been charged by Ventus Travel.');
        },
        onError: () => {
          setStatus('error');
          setMessage('PayPal could not complete the payment. Please try again.');
        },
        style: { layout: 'vertical', shape: 'rect', label: 'pay' },
      }).render(container);
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-ventus-paypal="membership"]');
    if ((window as any).paypal?.Buttons) {
      renderButtons();
    } else if (existing) {
      existing.addEventListener('load', renderButtons, { once: true });
    } else {
      const script = document.createElement('script');
      script.dataset.ventusPaypal = 'membership';
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.paypal.clientId)}&currency=GBP&components=buttons&intent=capture`;
      script.async = true;
      script.addEventListener('load', renderButtons, { once: true });
      script.addEventListener('error', () => {
        if (!cancelled) {
          setStatus('error');
          setMessage('Secure payment could not be loaded. Please try again shortly.');
        }
      }, { once: true });
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (container) container.innerHTML = '';
    };
  }, [appliedCoupon, config, quote, status, stripeSessionId]);

  const startStripeCheckout = async () => {
    if (paymentLocked) return;
    setStatus('processing');
    setMessage('Opening secure card payment…');
    try {
      window.location.assign(await createStripeMembershipCheckout(appliedCoupon || undefined));
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to open secure payment. Please try again.');
    }
  };

  const applyCoupon = async () => {
    setCouponMessage('');
    try {
      const nextQuote = await getMembershipQuote(couponCode);
      if (!nextQuote.couponValid) {
        setCouponMessage('That membership code is not valid.');
        return;
      }
      setQuote(nextQuote);
      setAppliedCoupon(couponCode.trim());
      setCouponMessage(nextQuote.couponDescription || 'Membership code applied.');
      setStatus('ready');
    } catch (error) {
      setCouponMessage(error instanceof Error ? error.message : 'Unable to validate that membership code.');
    }
  };

  const activateComplimentary = async () => {
    if (!appliedCoupon) return;
    setStatus('processing');
    setMessage('Activating your membership…');
    try {
      await activateComplimentaryMembership(appliedCoupon);
      setStatus('success');
      setMessage('Your Ventus Travel membership is active.');
      window.setTimeout(() => window.location.assign('/'), 900);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to activate your membership.');
    }
  };

  if (isLoading || (!isAuthenticated && status === 'loading')) {
    return <Layout><div className="container section-padding text-center"><div className="spinner-border" role="status" /><p className="mt-3">Loading your account…</p></div></Layout>;
  }

  return (
    <Layout>
      <section className="subscription-page section-padding">
        <div className="container"><div className="row justify-content-center"><div className="col-lg-8">
          <div className="auth-card membership-checkout-card">
            <img src="/assets/img/ventus-logo.png" alt="Ventus" className="membership-checkout-logo" />
            {hasActiveMembership ? (
              <div className="text-center">
                <h2>Your membership is active</h2>
                <p>You can view live member prices, exact benefits and available room rates.</p>
                <Link to="/" className="btn btn-primary btn-lg butn-dark">Explore hotels</Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <h2>Complete your Travel membership</h2>
                  <p className="mb-1">One annual membership</p>
                  <div className="membership-checkout-price">£{quote?.finalPrice.toFixed(0) ?? '299'} <small>per year</small></div>
                  {quote && quote.discountPercent > 0 && <p className="text-muted"><s>£{quote.basePrice.toFixed(0)}</s> · {quote.discountPercent}% membership discount</p>}
                </div>
                <ul className="membership-checkout-benefits">{MEMBER_BENEFITS.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
                <div className="membership-coupon-row">
                  <input className="form-control" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Membership code (optional)" disabled={paymentLocked} />
                  <button type="button" className="btn btn-outline-dark" onClick={applyCoupon} disabled={!couponCode.trim() || paymentLocked}>Apply</button>
                </div>
                {couponMessage && <p className="membership-checkout-note">{couponMessage}</p>}
                {message && <div className={`alert ${status === 'success' ? 'alert-success' : status === 'error' ? 'alert-danger' : 'alert-info'}`} role="status">{message}</div>}
                {status === 'loading' && <div className="text-center"><div className="spinner-border" role="status" /><p>Preparing secure checkout…</p></div>}
                {stripeSessionId ? (
                  status === 'error' ? <div className="text-center"><button type="button" className="btn btn-outline-dark" onClick={() => window.location.reload()}>Check payment again</button><p className="mt-3"><a href="mailto:daniella@ventustravel.co.uk">Contact Ventus</a></p></div> : null
                ) : quote?.finalPrice === 0 ? (
                  <button type="button" className="btn btn-primary btn-lg butn-dark w-100" onClick={activateComplimentary} disabled={paymentLocked}>{status === 'processing' ? 'Activating…' : 'Activate membership'}</button>
                ) : config?.stripe?.configured && quote ? (
                  <button type="button" className="btn btn-primary btn-lg butn-dark w-100" onClick={startStripeCheckout} disabled={paymentLocked}>{status === 'processing' ? 'Opening secure payment…' : `Pay £${quote.finalPrice.toFixed(2)} securely`}</button>
                ) : config?.paypal.configured ? (
                  <div ref={paypalContainerRef} id={PAYPAL_CONTAINER_ID} className="membership-paypal-container" aria-label="Secure PayPal or card payment" />
                ) : status !== 'loading' ? (
                  <div className="alert alert-warning">Secure payment is being configured. Please contact Daniella to activate your membership.</div>
                ) : null}
                <p className="text-center mt-3 mb-0 small">{quote?.finalPrice === 0 ? 'Your membership code provides one year of access.' : 'One payment for one year of membership. No automatic renewal. Your membership activates once payment is confirmed.'}</p>
              </>
            )}
          </div>
        </div></div></div>
      </section>
      <BannerCTA />
    </Layout>
  );
};

export default Subscription;
