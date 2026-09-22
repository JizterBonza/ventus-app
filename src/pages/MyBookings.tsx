import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { cancelReservation, getCancellationPreview, getReservations, Reservation, reservationGroup } from '../utils/reservationsService';
import './MyBookings.css';

export const ReservationDetails: React.FC<{ booking: Reservation }> = ({ booking }) => (
  <>
    <div className="reservation-facts">
      <div><span>Check-in</span><strong>{booking.check_in}</strong></div>
      <div><span>Check-out</span><strong>{booking.check_out}</strong></div>
      <div><span>Confirmation</span><strong>{booking.confirmation_number || 'Awaiting confirmation'}</strong></div>
      {booking.total_cost && <div><span>Booking total</span><strong>{booking.currency} {booking.total_cost}</strong></div>}
    </div>
    {booking.rooms.map((room, index) => <div className="reservation-room" key={index}>
      <h4>{room.room_type || `Room ${index + 1}`}</h4>
      <p>{room.guest_name}{room.adults ? ` · ${room.adults} adult${room.adults === 1 ? '' : 's'}` : ''}</p>
      {room.benefits.length > 0 && <ul>{room.benefits.map((benefit, i) => <li key={i}>{benefit}</li>)}</ul>}
      {room.deposit_policy && <p><strong>Payment terms</strong><br />{room.deposit_policy}</p>}
      <p className="reservation-policy"><strong>Cancellation policy</strong><br />{room.cancellation_policy || 'Please contact Ventus for the cancellation terms.'}</p>
    </div>)}
    {booking.cancellation_deadline && <p className="reservation-deadline">Cancellation deadline: {booking.cancellation_deadline} (as supplied by the hotel; check the policy for its time zone).</p>}
  </>
);

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [review, setReview] = useState<{ reviewId: string; booking: Reservation } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setBookings((await getReservations()).bookings); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load bookings.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const preview = async (booking: Reservation) => {
    setBusy(booking.id); setError(''); setNotice(''); setReview(null); setAcknowledged(false);
    try { setReview(await getCancellationPreview(booking.id)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to check cancellation.'); }
    finally { setBusy(null); }
  };
  const cancel = async () => {
    if (!review || !acknowledged || busy) return;
    setBusy(review.booking.id); setError('');
    try {
      const { booking } = await cancelReservation(review.booking.id, review.reviewId);
      setBookings((previous) => previous.map((entry) => entry.id === booking.id ? booking : entry));
      setReview(null); setTab('cancelled'); setNotice(`Cancellation confirmed for ${booking.hotel_name}. A Ventus cancellation email has been queued.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Cancellation could not be confirmed. Please contact Ventus.');
      setReview(null); // A fresh review is required; never retry a mutation automatically.
    } finally { setBusy(null); }
  };
  const visible = bookings.filter((booking) => reservationGroup(booking) === tab);
  return <Layout><section className="reservations-page section-padding"><div className="container">
    <div className="reservations-heading"><div><p className="reservation-eyebrow">Your Ventus journeys</p><h1>My Bookings</h1><p>View your stays, review the details and manage eligible cancellations.</p></div>
      <button className="btn btn-outline-dark" disabled={loading || Boolean(busy)} onClick={load}>Refresh bookings</button></div>
    <div className="reservation-tabs" role="group" aria-label="Booking categories">{(['upcoming', 'past', 'cancelled'] as const).map((group) =>
      <button key={group} type="button" aria-pressed={tab === group} className={tab === group ? 'active' : ''} onClick={() => setTab(group)}>{group === 'past' ? 'Past stays' : group[0].toUpperCase() + group.slice(1)} <span>{bookings.filter((booking) => reservationGroup(booking) === group).length}</span></button>)}</div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {notice && <div className="alert alert-success" role="status">{notice}</div>}
    {loading ? <p role="status">Loading your bookings…</p> : visible.length ? visible.map((booking) => <article className="reservation-card" key={booking.id}>
      <div className="reservation-card-heading"><div><p className="reservation-eyebrow">{booking.city || 'Your stay'}</p><h2>{booking.hotel_name || 'Hotel reservation'}</h2></div><span className="reservation-status">{booking.state || 'Pending'}</span></div>
      <ReservationDetails booking={booking} />
      {booking.stale && <p className="alert alert-warning">Showing the last saved details. Live updates are temporarily unavailable. Refresh before making changes.</p>}
      {booking.cancellation_state && <p className="alert alert-warning">Your cancellation is being checked. Contact Ventus before making another request.</p>}
      <div className="reservation-actions">{reservationGroup(booking) === 'upcoming' && !review && <>
        {booking.can_cancel ? <button className="btn btn-outline-dark" disabled={Boolean(busy)} onClick={() => preview(booking)}>{busy === booking.id ? 'Checking terms…' : 'Review cancellation'}</button>
          : <p>For changes or cancellation assistance, contact Ventus. The hotel’s policy applies.</p>}
      </>}
      <a href={`mailto:daniella@ventustravel.co.uk?subject=${encodeURIComponent(`Reservation ${booking.confirmation_number || booking.id}`)}`}>Contact Ventus about this booking</a></div>
      {review?.booking.id === booking.id && <section className="reservation-review" aria-label="Review cancellation">
        <h3>Review cancellation</h3><p>Please read the current policy below. Cancelling releases your reservation.</p>
        {review.booking.rooms.map((room, index) => <p className="reservation-policy" key={index}><strong>{room.room_type || `Room ${index + 1}`}</strong><br />{room.cancellation_policy}</p>)}
        {review.booking.cancellation_deadline && <p>Hotel cancellation deadline: {review.booking.cancellation_deadline}. Refer to the policy for the time zone.</p>}
        <label className="reservation-check"><input type="checkbox" checked={acknowledged} disabled={Boolean(busy)} onChange={(event) => setAcknowledged(event.target.checked)} />I have read the cancellation policy and want to cancel this booking.</label>
        <div className="reservation-actions"><button className="btn btn-danger" disabled={!acknowledged || Boolean(busy)} onClick={cancel}>{busy ? 'Confirming cancellation…' : 'Confirm cancellation'}</button>
          <button className="btn btn-outline-dark" disabled={Boolean(busy)} onClick={() => setReview(null)}>Keep booking</button></div>
      </section>}
    </article>) : !error && <div className="reservation-empty"><h2>No {tab === 'past' ? 'past stays' : `${tab} bookings`} to show</h2><p>Your bookings will appear here when they are linked to this account.</p><Link to="/" className="btn btn-outline-dark">Explore hotels</Link></div>}
    <aside className="reservation-help"><h3>Missing an existing booking?</h3><p>The Ventus team can link earlier reservations to your account after checking ownership. Send Daniella your booking reference and the email you use to sign in.</p><a href="mailto:daniella@ventustravel.co.uk?subject=Link%20an%20existing%20reservation">Ask Ventus to link a booking</a></aside>
  </div></section></Layout>;
};

export default MyBookings;
