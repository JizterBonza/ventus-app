import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { confirmNewsletter, unsubscribeNewsletter } from '../utils/newsletter';

const EmailPreferences: React.FC = () => {
    const location = useLocation();
    return <EmailPreferenceRequest key={location.hash} hash={location.hash} />;
};

const EmailPreferenceRequest: React.FC<{hash: string}> = ({hash}) => {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const token = params.get('token') || '';
    const action = params.get('action');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const activeRequest = useRef(false);
    const valid = (action === 'confirm' && /^[a-f\d]{64}$/.test(token)) || (action === 'unsubscribe' && /^[a-f\d-]{36}\.[a-f\d]{64}$/.test(token));
    const complete = async (unsubscribe: boolean) => {
        if (activeRequest.current) return;
        activeRequest.current = true; setStatus('loading');
        try {
            setMessage(await (unsubscribe ? unsubscribeNewsletter(token) : confirmNewsletter(token)));
            setStatus('success');
        } catch (error) {
            setStatus('error'); setMessage(error instanceof Error ? error.message : 'Unable to update your email preferences. Please try again.');
        } finally { activeRequest.current = false; }
    };
    useEffect(() => {
        if (action === 'unsubscribe' && valid) void complete(true);
        // The token identifies the email request; unsubscribe needs no login or extra confirmation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [action, token, valid]);
    return <Layout><section className="section-padding"><div className="container" style={{maxWidth: 680}}>
        <h1>{action === 'unsubscribe' ? 'Your email preferences' : 'Discover Ventus'}</h1>
        {!valid ? <p role="alert">This email link is not valid. Please use the link in your Ventus email.</p> : <>
            {action === 'confirm' && status === 'idle' && <>
                <p>Confirm that you’d like Ventus emails about new hotels, destinations, membership benefits and saving opportunities. You can unsubscribe at any time.</p>
                <button type="button" className="btn btn-primary" onClick={() => void complete(false)}>Confirm my emails</button>
            </>}
            {status === 'loading' && <p role="status">Updating your preferences…</p>}
            {message && <p role={status === 'error' ? 'alert' : 'status'}>{message}</p>}
            {status === 'error' && <button className="btn btn-primary" type="button" onClick={() => void complete(action === 'unsubscribe')}>Try again</button>}
            {status === 'success' && action === 'confirm' && <><p>Try Ventus free for 7 days. No card required and no automatic charge. Afterwards, choose an annual membership for £299.</p><Link className="btn btn-primary" to="/signup">Start your 7 day free trial</Link></>}
        </>}
        <p className="mt-4"><Link to="/">Return to Ventus</Link></p>
    </div></section></Layout>;
};
export default EmailPreferences;
