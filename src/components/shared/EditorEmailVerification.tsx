import React, { useState } from 'react';
import { requestHomepageEditorCode, verifyHomepageEditorCode } from '../../utils/homepageContent';

const EditorEmailVerification: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const run = async (verify: boolean) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (verify) { await verifyHomepageEditorCode(code); onVerified(); }
      else { await requestHomepageEditorCode(); setNotice('A verification code has been sent to your account email.'); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to verify your email'); }
    finally { setBusy(false); }
  };
  return <div className="homepage-editor-verification">
    <h2>Verify your account email</h2>
    <p>Confirm your email before managing Ventus content. Verification is shared with the homepage editor.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button type="button" disabled={busy} onClick={() => void run(false)}>Send verification code</button>
    <form onSubmit={(event) => { event.preventDefault(); void run(true); }}>
      <label htmlFor="editor-email-code">12-character code from your email</label>
      <input id="editor-email-code" autoComplete="one-time-code" value={code} maxLength={12} onChange={(event) => setCode(event.target.value.toUpperCase())} />
      <button disabled={busy || code.trim().length !== 12}>{busy ? 'Please wait…' : 'Verify and open editor'}</button>
    </form>
  </div>;
};
export default EditorEmailVerification;
