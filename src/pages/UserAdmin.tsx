import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ReservationDetails } from './MyBookings';
import { requestHomepageEditorCode, verifyHomepageEditorCode } from '../utils/homepageContent';
import { AdminUser, AdminVerificationRequired, BillingDetails, ClientProfile, SubscriberList, UserList, cancelClientRenewal, csvCell,
  fetchAdminSubscribers, fetchAdminUsers, fetchClientBilling, fetchClientProfile, saveClientProfile, sendClientPasswordReset,
  sendClientVerification, setClientAccess, statusLabel } from '../utils/userAdmin';
import './MyBookings.css';
import './UserAdmin.css';

const date = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const money = (amount: number, currency = 'GBP') => new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
const Badge: React.FC<{ status: string }> = ({ status }) => <span className={`user-admin-badge status-${status}`}>{statusLabel(status)}</span>;
const historyLabel = (action: string) => ({ profile_updated: 'Profile updated', sign_in_suspended: 'Sign-in suspended', sign_in_restored: 'Sign-in restored', password_reset_requested: 'Password reset requested', password_reset_sent: 'Password reset email sent', password_reset_delivery_failed: 'Password reset email failed', verification_email_sent: 'Confirmation email sent', renewal_cancellation_requested: 'Renewal cancellation requested', renewal_cancelled: 'Membership renewal cancelled' }[action] || action.replace(/_/g, ' '));

const UserAdmin: React.FC = () => {
  const { id } = useParams();
  const [listTab, setListTab] = useState('users');
  const [tab, setTab] = useState('profile');
  const [q, setQ] = useState(''), [status, setStatus] = useState('');
  const [filters, setFilters] = useState({ q: '', status: '', page: 1 });
  const [users, setUsers] = useState<UserList | null>(null), [subscribers, setSubscribers] = useState<SubscriberList | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null), [draft, setDraft] = useState<AdminUser | null>(null);
  const [billing, setBilling] = useState<BillingDetails | null>(null), [billingError, setBillingError] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [verification, setVerification] = useState(false), [code, setCode] = useState('');
  const [refresh, setRefresh] = useState(0), [confirmation, setConfirmation] = useState<'access' | 'renewal' | null>(null), [reason, setReason] = useState('');
  const active = profile?.user.id === id ? profile : null;
  const handleError = useCallback((failure: unknown) => {
    if (failure instanceof AdminVerificationRequired) setVerification(true);
    else setError(failure instanceof Error ? failure.message : 'Unable to complete this request.');
  }, []);
  useEffect(() => {
    let current = true;
    setLoading(true); setError(''); setVerification(false); setProfile(null); setDraft(null); setUsers(null); setSubscribers(null); setConfirmation(null);
    const load = async () => {
      try {
        if (id) { const data = await fetchClientProfile(id); if (current) { setProfile(data); setDraft(data.user); } }
        else if (listTab === 'users') { const data = await fetchAdminUsers(filters.q, filters.status, filters.page); if (current) setUsers(data); }
        else { const data = await fetchAdminSubscribers(filters.q, filters.status, filters.page); if (current) setSubscribers(data); }
      } catch (failure) { if (current) handleError(failure); }
      finally { if (current) setLoading(false); }
    };
    void load(); return () => { current = false; };
  }, [id, listTab, filters, refresh, handleError]);
  useEffect(() => { setTab('profile'); setMessage(''); setBilling(null); }, [id]);
  useEffect(() => {
    let current = true;
    setBilling(null); setBillingError('');
    if (id && tab === 'billing' && active) void fetchClientBilling(id).then(data => { if (current) setBilling(data); })
      .catch(failure => { if (current) setBillingError(failure instanceof Error ? failure.message : 'Unable to load billing details.'); });
    return () => { current = false; };
  }, [id, tab, active]);
  const run = async (operation: () => Promise<{ message: string }>) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { const result = await operation(); setMessage(result.message); setConfirmation(null); setReason(''); setRefresh(value => value + 1); }
    catch (failure) { handleError(failure); }
    finally { setBusy(false); }
  };
  const exportPage = () => {
    const rows = listTab === 'users' ? [['Name', 'Email', 'Status', 'Joined', 'Membership ends', 'Bookings'], ...(users?.users || []).map(user => [user.firstName + ' ' + user.lastName, user.email, statusLabel(user.status), date(user.createdAt), date(user.membershipExpiresAt), user.bookingCount])]
      : [['Email', 'Status', 'Joined', 'Confirmed'], ...(subscribers?.subscribers || []).map(item => [item.email, statusLabel(item.status), date(item.createdAt), date(item.confirmedAt)])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `ventus-${listTab}-page-${filters.page}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const switchList = (value: string) => { setListTab(value); setQ(''); setStatus(''); setFilters({ q: '', status: '', page: 1 }); setMessage(''); };
  const field = (key: 'firstName' | 'lastName' | 'phone' | 'cityOfResidence', label: string, max: number, required = false) => <label>{label}<input className="form-control" value={draft?.[key] || ''} maxLength={max} required={required} disabled={busy} onChange={event => setDraft(previous => previous ? { ...previous, [key]: event.target.value } : null)} /></label>;
  const total = listTab === 'users' ? users?.total || 0 : subscribers?.total || 0;
  const pages = Math.max(1, Math.ceil(total / 25));
  return <Layout><section className="user-admin-page"><div className="container">
    <header className="user-admin-heading"><div><p className="reservation-eyebrow">Ventus team</p>{id ? <><Link to="/admin/users">← All users</Link><h1>{active ? `${active.user.firstName} ${active.user.lastName}` : 'Client profile'}</h1>{active && <p>{active.user.email} <Badge status={active.user.status} /></p>}</> : <><h1>Users</h1><p>Client accounts, memberships and email sign-ups in one place.</p></>}</div>
      <button className="btn btn-outline-dark" disabled={busy || loading} onClick={() => setRefresh(value => value + 1)}>Refresh</button></header>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}{message && <div className="alert alert-success" role="status">{message}</div>}
    {verification ? <section className="user-admin-panel"><h2>Confirm your staff email</h2><p>Use the code sent to your Ventus account email to access client information.</p>
      <button className="btn btn-outline-dark" disabled={busy} onClick={() => { setBusy(true); setError(''); void requestHomepageEditorCode().then(() => setMessage('Verification code sent to your account email.')).catch(handleError).finally(() => setBusy(false)); }}>Send verification code</button>
      <form className="user-admin-verification" onSubmit={event => { event.preventDefault(); setBusy(true); setError(''); void verifyHomepageEditorCode(code).then(() => { setMessage('Staff email confirmed.'); setRefresh(value => value + 1); }).catch(handleError).finally(() => setBusy(false)); }}>
        <label>Verification code<input className="form-control" value={code} maxLength={12} required autoComplete="one-time-code" disabled={busy} onChange={event => setCode(event.target.value)} /></label><button className="btn btn-dark" disabled={busy || code.trim().length !== 12}>Confirm code</button></form></section>
    : loading ? <p role="status">Loading client information…</p> : id ? active && <>
      <div className="user-admin-facts"><div><span>Joined</span><strong>{date(active.user.createdAt)}</strong></div><div><span>Email</span><strong>{active.user.emailVerified ? 'Confirmed' : 'Awaiting confirmation'}</strong></div><div><span>Last sign-in</span><strong>{date(active.user.lastLoginAt)}</strong></div><div><span>Bookings</span><strong>{active.user.bookingCount}</strong></div></div>
      <div className="user-admin-tabs" role="tablist" aria-label="Client information">{['profile', 'billing', 'bookings', 'history'].map(value => <button key={value} role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setConfirmation(null); }} disabled={busy}>{value === 'history' ? 'Activity' : value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      {tab === 'profile' && draft && <div className="user-admin-columns"><section className="user-admin-panel"><h2>Client details</h2><form onSubmit={event => { event.preventDefault(); void run(() => saveClientProfile(id, { firstName: draft.firstName, lastName: draft.lastName, phone: draft.phone, cityOfResidence: draft.cityOfResidence, notes: draft.notes || '', version: draft.version })); }}>
        <div className="user-admin-fields">{field('firstName', 'First name', 100, true)}{field('lastName', 'Last name', 100, true)}{field('phone', 'Phone', 80)}{field('cityOfResidence', 'City of residence', 160)}</div>
        <label>Team notes<textarea className="form-control" rows={4} maxLength={5000} value={draft.notes || ''} disabled={busy} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label><p className="user-admin-muted">Visible to the Ventus team only.</p><button className="btn btn-dark" disabled={busy}>Save profile</button></form></section>
        <section className="user-admin-panel"><h2>Account management</h2><p>Send a secure password-reset link to <strong>{active.user.email}</strong>. The client chooses their password; existing sessions end when they finish the reset.</p><button className="btn btn-outline-dark" disabled={busy} onClick={() => void run(() => sendClientPasswordReset(id))}>Send password reset</button>
          {!active.user.emailVerified && <button className="btn btn-outline-dark" disabled={busy} onClick={() => void run(() => sendClientVerification(id))}>Resend confirmation email</button>}
          {active.canSuspend && <><hr /><h3>Sign-in access</h3><p>Suspending sign-in ends existing sessions. Membership billing and hotel reservations continue.</p><button className="btn btn-outline-dark" disabled={busy} onClick={() => { setConfirmation('access'); setReason(''); }}>{active.user.suspended ? 'Restore sign-in' : 'Suspend sign-in'}</button></>}
          {confirmation === 'access' && <form className="user-admin-confirmation" onSubmit={event => { event.preventDefault(); void run(() => setClientAccess(id, !active.user.suspended, reason.trim(), active.user.version)); }}><h3>Confirm {active.user.suspended ? 'restoring' : 'suspending'} sign-in</h3><label>Reason<input className="form-control" required minLength={3} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label><button className="btn btn-dark" disabled={busy || reason.trim().length < 3}>Confirm access change</button><button type="button" className="btn btn-outline-dark" disabled={busy} onClick={() => setConfirmation(null)}>Keep current access</button></form>}
        </section></div>}
      {tab === 'billing' && <><section className="user-admin-panel"><h2>Membership and billing</h2><p className="user-admin-muted">Membership payments are separate from hotel charges, which follow each hotel’s payment terms.</p>
        {active.memberships.length ? active.memberships.map(member => <article className="user-admin-membership" key={member.id}><div><h3>{member.provider === 'trial' || member.billingStatus === 'trialing' ? 'Complimentary trial' : 'Annual membership'}</h3><p>{statusLabel(member.status)}{member.billingStatus && ` · ${statusLabel(member.billingStatus)}`}</p></div><div><span>Starts</span><strong>{date(member.startsAt)}</strong></div><div><span>{member.cancelAtPeriodEnd ? 'Access ends' : 'Current period ends'}</span><strong>{date(member.expiresAt)}</strong></div><div><span>Recorded payment</span><strong>{money(member.amountPaid, member.currency)}</strong></div>
          {member.recurring && <p>{member.cancelAtPeriodEnd ? 'Renewal is cancelled.' : `Renews at ${money(member.renewalAmount || 299, member.currency)} per year.`}</p>}
          {member.recurring && !member.cancelAtPeriodEnd && !['canceled', 'incomplete_expired'].includes(member.billingStatus || '') && <button className="btn btn-outline-dark" disabled={busy} onClick={() => setConfirmation('renewal')}>Cancel membership renewal</button>}</article>) : <p>No membership payments or trials recorded.</p>}
        {confirmation === 'renewal' && <div className="user-admin-confirmation"><h3>Stop this client’s next renewal?</h3><p>Access continues until the end of the current trial or paid period. Hotel reservations are unchanged.</p><button className="btn btn-dark" disabled={busy} onClick={() => void run(() => cancelClientRenewal(id))}>Confirm renewal cancellation</button><button className="btn btn-outline-dark" disabled={busy} onClick={() => setConfirmation(null)}>Keep renewal</button></div>}</section>
        <section className="user-admin-panel"><h2>Payment method and invoices</h2>{billingError ? <p className="alert alert-warning" role="alert">{billingError}</p> : !billing ? <p role="status">Loading billing details…</p> : <>
          {billing.paymentMethod && <p>{billing.paymentMethod.brand.toUpperCase()} ending {billing.paymentMethod.last4} · expires {billing.paymentMethod.expiryMonth}/{billing.paymentMethod.expiryYear}</p>}
          {!billing.available && <p>No recurring billing account is linked. Any earlier membership payments appear above.</p>}
          {billing.available && !billing.invoices.length && <p>No invoices yet.</p>}
          {billing.invoices.map(invoice => <div className="user-admin-invoice" key={invoice.id}><div><strong>{invoice.number || 'Membership invoice'}</strong><p>{date(invoice.createdAt)} · {invoice.status}</p></div><strong>{money(invoice.amountPaid, invoice.currency)} paid{invoice.status !== 'paid' ? ` · ${money(invoice.amountDue, invoice.currency)} due` : ''}</strong>{invoice.url && <a href={invoice.url} target="_blank" rel="noopener noreferrer">View invoice ↗</a>}</div>)}</>}
        </section></>}
      {tab === 'bookings' && <section className="user-admin-panel"><div className="user-admin-panel-heading"><h2>Hotel bookings</h2>{active.canLinkBookings && <Link to="/admin/reservations" className="btn btn-outline-dark">Link an existing booking</Link>}</div>
        <p className="user-admin-muted">Bookings are those linked to this client’s account. Supplier records were last synced at the dates shown.</p>
        {active.bookings.length ? active.bookings.map(booking => <article className="reservation-card" key={booking.id}><h3>{booking.hotel_name}</h3><p>{booking.state} · last synced {date(booking.synced_at)}</p><ReservationDetails booking={booking} /></article>) : <p>No hotel reservations linked to this account.</p>}
        {active.bookingRequests.length > 0 && <><h3>Earlier booking requests</h3>{active.bookingRequests.map(request => <p key={request.reference}>{request.hotelName} · {request.reference} · {date(request.checkIn)}–{date(request.checkOut)} · {request.status}</p>)}</>}
      </section>}
      {tab === 'history' && <section className="user-admin-panel"><h2>Account activity</h2>{active.history.length ? active.history.map((event, index) => <article className="user-admin-event" key={index}><strong>{historyLabel(event.action)}</strong><p>{date(event.createdAt)} · {event.by}</p>{event.details.reason && <p>{event.details.reason}</p>}{Boolean(event.details.fields?.length) && <p>Changed: {event.details.fields?.join(', ')}</p>}</article>) : <p>No administrative changes recorded yet.</p>}</section>}
    </> : (users || subscribers) && <>
      <div className="user-admin-tabs" role="tablist" aria-label="User lists"><button role="tab" aria-selected={listTab === 'users'} onClick={() => switchList('users')}>Client accounts</button><button role="tab" aria-selected={listTab === 'newsletter'} onClick={() => switchList('newsletter')}>Email subscribers</button></div>
      {users && <div className="user-admin-facts">{[['Accounts', users.summary.total], ['Active members', users.summary.active], ['Free trials', users.summary.trial], ['Email unconfirmed', users.summary.unverified], ['Sign-in suspended', users.summary.suspended]].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>}
      <section className="user-admin-panel"><form className="user-admin-search" onSubmit={event => { event.preventDefault(); setFilters({ q: q.trim(), status, page: 1 }); }}><label>Search {listTab === 'users' ? 'users' : 'subscribers'}<input className="form-control" type="search" value={q} maxLength={120} placeholder={listTab === 'users' ? 'Name, email or phone' : 'Email address'} onChange={event => setQ(event.target.value)} /></label>
        <label>Status<select className="form-select" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{(listTab === 'users' ? ['registered', 'unverified', 'trial', 'active', 'past_due', 'expired', 'cancelled', 'suspended'] : ['pending', 'subscribed', 'unsubscribed']).map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><button className="btn btn-dark">Search</button><button type="button" className="btn btn-outline-dark" onClick={exportPage} disabled={!total}>Download this page</button></form>
        <p>{total} {listTab === 'users' ? 'accounts' : 'email sign-ups'}{filters.q || filters.status ? ' matching your search' : ''}</p>
        <div className="user-admin-table-wrap"><table className="user-admin-table"><thead><tr>{(users ? ['Client', 'Status', 'Joined', 'Membership ends', 'Bookings', ''] : ['Email', 'Status', 'Signed up', 'Confirmed']).map((title, index) => <th key={index} scope="col">{title}</th>)}</tr></thead><tbody>
          {users?.users.map(user => <tr key={user.id}><td><Link to={`/admin/users/${user.id}`}><strong>{user.firstName} {user.lastName}</strong></Link><span>{user.email}</span></td><td><Badge status={user.status} />{user.cancelAtPeriodEnd && <span>Renewal cancelled</span>}</td><td>{date(user.createdAt)}</td><td>{date(user.membershipExpiresAt)}</td><td>{user.bookingCount}</td><td><Link to={`/admin/users/${user.id}`} aria-label={`View ${user.firstName} ${user.lastName}`}>View profile →</Link></td></tr>)}
          {subscribers?.subscribers.map(item => <tr key={item.email}><td>{item.email}</td><td><Badge status={item.status} /></td><td>{date(item.createdAt)}</td><td>{date(item.confirmedAt)}</td></tr>)}</tbody></table></div>
        {!total && <p>No matches. Try another name or status.</p>}
        <div className="user-admin-pagination"><button className="btn btn-outline-dark" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button><span>Page {filters.page} of {pages}</span><button className="btn btn-outline-dark" disabled={filters.page >= pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button></div>
        {subscribers && <p className="user-admin-muted">Only confirmed subscribers have joined the mailing list. Client membership and email subscriptions are separate.</p>}
      </section>
    </>}
  </div></section></Layout>;
};
export default UserAdmin;
