import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getUnlinkedReservations, linkReservation, Reservation } from '../utils/reservationsService';
import { ReservationDetails } from './MyBookings';
import './MyBookings.css';

const ReservationAdmin: React.FC = () => {
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [email, setEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    setError(''); setLoading(true);
    try { setBookings((await getUnlinkedReservations()).bookings); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load reservations.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !verified || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await linkReservation(selected.id, email.trim());
      setBookings((previous) => previous.filter((booking) => booking.id !== selected.id));
      setMessage(`Reservation ${selected.confirmation_number || selected.id} is now linked to ${email.trim()}.`);
      setSelected(null); setEmail(''); setVerified(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to link reservation.'); }
    finally { setBusy(false); }
  };
  const matches = bookings.filter((booking) => `${booking.confirmation_number} ${booking.id} ${booking.hotel_name} ${booking.rooms.map((room) => room.guest_name).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  return <Layout><section className="reservations-page section-padding"><div className="container">
    <div className="reservations-heading"><div><p className="reservation-eyebrow">Ventus team</p><h1>Link existing bookings</h1><p>Check the original booking correspondence before linking a reservation to a client account.</p></div><button className="btn btn-outline-dark" onClick={load} disabled={busy || loading}>Refresh</button></div>
    {error && <div className="alert alert-danger" role="alert">{error}{error.includes('manager access') && <p className="mt-2">This page requires reservation manager permission and verified staff email access. <Link to="/admin/homepage">Verify staff email</Link>, then return here.</p>}</div>}
    {message && <div className="alert alert-success" role="status">{message}</div>}
    {selected ? <article className="reservation-card"><h2>{selected.hotel_name}</h2><ReservationDetails booking={selected} />
      <form onSubmit={submit}><label htmlFor="reservationOwner">Client’s Ventus account email</label><input id="reservationOwner" type="email" className="form-control mb-3" value={email} required disabled={busy} onChange={(event) => { setEmail(event.target.value); setVerified(false); }} />
        <label className="reservation-check"><input type="checkbox" checked={verified} disabled={busy} onChange={(event) => setVerified(event.target.checked)} />I checked the original booking record and verified that this account is entitled to view and cancel this reservation.</label>
        <div className="reservation-actions"><button className="btn btn-dark" disabled={!verified || busy || !email.trim()}>{busy ? 'Linking…' : 'Link reservation to this account'}</button><button type="button" className="btn btn-outline-dark" disabled={busy} onClick={() => setSelected(null)}>Back</button></div>
      </form></article> : <>
      <label htmlFor="reservationSearch">Find an unlinked booking</label><input id="reservationSearch" className="form-control my-3" type="search" placeholder="Confirmation reference, guest or hotel" value={search} onChange={(event) => setSearch(event.target.value)} />
      {loading ? <p role="status">Loading unlinked reservations…</p> : matches.map((booking) => <article className="reservation-card" key={booking.id}><h2>{booking.hotel_name}</h2><p>{booking.check_in} to {booking.check_out} · {booking.confirmation_number || `LE ${booking.id}`} · {booking.state}</p><p>{booking.rooms.map((room) => room.guest_name).filter(Boolean).join(', ')}</p><button className="btn btn-outline-dark" onClick={() => { setSelected(booking); setEmail(''); setVerified(false); setMessage(''); }}>Review and link</button></article>)}
      {!loading && !error && !matches.length && <p>No unlinked reservations match this search.</p>}
    </>}
  </div></section></Layout>;
};
export default ReservationAdmin;
