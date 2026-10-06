import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToNewsletter } from '../../utils/newsletter';
import './TrialWelcomePopup.css';


const TrialWelcomePopup: React.FC<{ embedded?: boolean; onDismiss?: () => void; onOpen?: () => void }> = ({ embedded = false, onDismiss, onOpen }) => {
    const { isLoading, isAuthenticated } = useAuth();
    const knownAccount = document.cookie.split(';').some(item => item.trim() === 'ventus_account_known=1');
    const eligible = !isLoading && !isAuthenticated && !knownAccount;
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
        onDismiss?.();
    }, [onDismiss]);

    useEffect(() => { if (!isLoading && !eligible) onDismiss?.(); }, [isLoading, eligible, onDismiss]);

    useEffect(() => {
        if (!eligible) { setOpen(false); return; }
        const timer = window.setTimeout(() => setOpen(true), 700);
        return () => window.clearTimeout(timer);
    }, [eligible]);

    useEffect(() => { if (open) onOpen?.(); }, [open, onOpen]);

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
                    <div className="trial-welcome-offer">
                        <img className="trial-welcome-logo" src="/assets/img/logo.svg" alt="Ventus Travel" />
                        <p className="trial-welcome-eyebrow">BEFORE YOU CHECK IN…</p>
                        <h2 id="trial-welcome-title">Make sure it’s<br />worth the stay.</h2>
                        <span className="trial-welcome-rule" aria-hidden="true" />
                        <p>Enjoy 7 days of complimentary Ventus Club membership and discover what travel looks like when you have the right access.</p>
                        <p>Exceptional hotels. Rates reserved for members.<br />Signature benefits. Privileged access, wherever you go.</p>
                        <p>Take a look around. We think you’ll want to stay<br className="trial-welcome-desktop-break" /> once you see what’s inside.</p>
                        <Link target={embedded ? "_top" : undefined} className="trial-welcome-button trial-welcome-primary" to="/signup" onClick={dismiss}>CHECK IN &amp; EXPLORE <span aria-hidden="true">↗</span></Link>
                        <p className="trial-welcome-terms">7 days complimentary · £299 annual membership · Cancel anytime</p>
                        <p className="trial-welcome-reassurance">Card required. £0 today, then £299 per year unless you cancel before your trial ends. Cancel in one click from My Membership. <Link target={embedded ? "_top" : undefined} to="/terms-of-service" onClick={dismiss}>Membership terms</Link> apply.</p>
                        <p className="trial-welcome-signin">Already a member? <Link target={embedded ? "_top" : undefined} to="/login" onClick={dismiss}>Sign in</Link></p>
                    </div>
                    <div className="trial-welcome-discover">
                        <h3>A room is just the beginning.</h3>
                        <p>Enter your email and discover what comes with being a Ventus member.</p>
                        {status === 'success' ? <p className="trial-welcome-message" role="status">{message}</p> : (
                            <form onSubmit={subscribe}>
                                <div className="trial-welcome-email-row">
                                    <label className="trial-welcome-visually-hidden" htmlFor="trial-welcome-email">Email address</label>
                                    <input id="trial-welcome-email" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required disabled={status === 'sending'} />
                                    <button type="submit" className="trial-welcome-button" disabled={status === 'sending'}>{status === 'sending' ? 'SENDING…' : 'SHOW ME WHAT’S INSIDE'}</button>
                                </div>
                                <div className="trial-welcome-honeypot" aria-hidden="true"><label>Website<input name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
                                <label className="trial-welcome-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required disabled={status === 'sending'} /><span>I’d like occasional Ventus emails about new hotels, destinations, membership benefits and saving opportunities.</span></label>
                                <p className="trial-welcome-privacy">You can unsubscribe at any time. <Link target={embedded ? "_top" : undefined} to="/privacy-policy" onClick={dismiss}>Privacy policy</Link>.</p>
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
