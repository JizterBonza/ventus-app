import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToNewsletter } from '../../utils/newsletter';
import './TrialWelcomePopup.css';

const DISMISSED_KEY = 'ventus:trial-welcome-dismissed:v1';

const TrialWelcomePopup: React.FC = () => {
    const { isLoading, isAuthenticated, hasActiveMembership, user } = useAuth();
    const eligible = !isLoading && !hasActiveMembership && (!isAuthenticated || Boolean(user?.trial?.eligible));
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const dialogRef = useRef<HTMLElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const sendingRef = useRef(false);
    const dismiss = useCallback(() => {
        setOpen(false);
        try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch { /* Still dismiss this visit. */ }
    }, []);

    useEffect(() => {
        if (!eligible) { setOpen(false); return; }
        try { if (sessionStorage.getItem(DISMISSED_KEY)) return; } catch { /* Storage is optional. */ }
        const timer = window.setTimeout(() => setOpen(true), 1200);
        return () => window.clearTimeout(timer);
    }, [eligible]);

    useEffect(() => {
        if (!open) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') dismiss();
            if (event.key !== 'Tab') return;
            const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]') || [])
                .filter(el => el.getAttribute('tabindex') !== '-1');
            const first = controls[0], last = controls[controls.length - 1];
            if (!first || !last) return;
            if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
                event.preventDefault(); first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [open, dismiss]);

    const subscribe = async (event: React.FormEvent) => {
        event.preventDefault();
        if (sendingRef.current || !consent) return;
        sendingRef.current = true; setStatus('sending'); setMessage('');
        try {
            setMessage(await subscribeToNewsletter(email.trim(), consent, website));
            setStatus('success');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Email sign-up is temporarily unavailable. Please try again.');
            setStatus('error');
        } finally { sendingRef.current = false; }
    };

    if (!open || !eligible) return null;
    return createPortal(
        <div className="trial-welcome-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) dismiss(); }}>
            <section className="trial-welcome-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="trial-welcome-title">
                <button className="trial-welcome-close" type="button" onClick={dismiss} ref={closeRef} aria-label="Close free trial offer">×</button>
                <div className="trial-welcome-scroll">
                    <div className="trial-welcome-hero">
                        <div className="trial-welcome-photo">
                            <img className="trial-welcome-destination" src="/assets/img/featured/villa-treville-positano.webp" alt="Sunlit gardens at Villa Treville in Positano" />
                            <img className="trial-welcome-logo" src="/assets/img/logo.svg" alt="Ventus Travel" />
                            <div className="trial-welcome-caption"><p>Villa Treville</p><span>Positano, Italy</span></div>
                        </div>
                        <div className="trial-welcome-offer">
                            <p className="trial-welcome-eyebrow">THE VENTUS MEMBERSHIP</p>
                            <h2 id="trial-welcome-title">The travel membership<br /><em>that pays for itself*</em></h2>
                            <p className="trial-welcome-tagline">Because you deserve more from every stay.</p>
                            <p className="trial-welcome-description">Join Ventus today and unlock exceptional hotel rates and exclusive benefits at the world’s most iconic addresses.</p>
                            <div className="trial-welcome-promise"><strong>7 <span>days.</span></strong><div><span>COMPLIMENTARY MEMBERSHIP.</span><span>Just more from every stay.</span></div></div>
                            <Link className="trial-welcome-button trial-welcome-primary" to={isAuthenticated ? '/subscription' : '/signup'} onClick={dismiss}><span>START YOUR 7 DAY FREE TRIAL</span><span aria-hidden="true">↗</span></Link>
                            <p className="trial-welcome-reassurance"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" /></svg>No card required. No automatic charge.</p>
                            <p className="trial-welcome-signin">Already a member? <Link to="/login" onClick={dismiss}>Sign in</Link></p>
                            <p className="trial-welcome-terms">Enjoy your first 7 days complimentary. Afterwards, choose an annual membership for £299. <Link to="/terms-of-service" onClick={dismiss}>Membership terms</Link> apply.</p>
                            <p className="trial-welcome-footnote">* Potential savings vary depending on hotel, destination, travel dates and bookings. Individual savings may exceed the annual membership fee.</p>
                        </div>
                    </div>
                    <div className="trial-welcome-discover">
                        <div className="trial-welcome-discover-copy">
                            <h3>Want to see how much<br />you could save?</h3>
                            <p>Sign up to discover how Ventus works, explore member rates and see how much you could save on your next luxury stay.</p>
                        </div>
                        {status === 'success' ? <p className="trial-welcome-message" role="status">{message}</p> : (
                            <form onSubmit={subscribe}>
                                <div className="trial-welcome-email-row">
                                    <label className="trial-welcome-visually-hidden" htmlFor="trial-welcome-email">Email address</label>
                                    <input id="trial-welcome-email" type="email" autoComplete="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required disabled={status === 'sending'} />
                                    <button type="submit" className="trial-welcome-button" disabled={status === 'sending'}>{status === 'sending' ? 'SENDING…' : 'SHOW ME HOW'}</button>
                                </div>
                                <div className="trial-welcome-honeypot" aria-hidden="true"><label>Website<input name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
                                <label className="trial-welcome-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required disabled={status === 'sending'} /><span>I’d like occasional Ventus emails about new hotels, destinations, membership benefits and saving opportunities.</span></label>
                                <p className="trial-welcome-privacy">You can unsubscribe at any time. <Link to="/privacy-policy" onClick={dismiss}>Privacy policy</Link>.</p>
                                {status === 'error' && <p className="trial-welcome-message trial-welcome-error" role="alert">{message}</p>}
                            </form>
                        )}
                    </div>
                </div>
            </section>
        </div>, document.body,
    );
};
export default TrialWelcomePopup;
