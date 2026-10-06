import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BannerCTA from '../components/shared/BannerCTA';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types/auth';
import { activateComplimentaryMembership, createStripeMembershipCheckout, confirmStripeMembershipCheckout,
  getMembershipCheckoutConfig, getMembershipQuote, MembershipCheckoutConfig, MembershipQuote,
  getRecurringMembership, cancelRecurringMembership, openMembershipBilling } from '../utils/authService';

const BENEFITS = ['Exclusive member rates and preferential offers','Complimentary breakfasts, hotel credits and experiences',
  'Priority upgrades where available','Flexible hotel-direct cancellation and payment conditions','Access to Ventus Travel advice and booking support'];
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString('en-GB', {day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}) : '';

const Subscription: React.FC = () => {
  const navigate=useNavigate(),location=useLocation();
  const {isAuthenticated,hasActiveMembership,isLoading,user,refreshUser}=useAuth();
  const [recurring,setRecurring]=useState<User['membership']>(null);
  const [config,setConfig]=useState<MembershipCheckoutConfig|null>(null);
  const [quote,setQuote]=useState<MembershipQuote|null>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'processing'|'success'|'error'>('loading');
  const [message,setMessage]=useState('');
  const [coupon,setCoupon]=useState(''),[appliedCoupon,setAppliedCoupon]=useState(''),[couponMessage,setCouponMessage]=useState('');
  const [accepted,setAccepted]=useState(false);
  const sessionId=new URLSearchParams(location.search).get('stripe_session_id');
  const billing=recurring || (user?.membership?.recurring ? user.membership : null);
  const continuing=billing && !['canceled','incomplete_expired'].includes(billing.billingStatus || '');
  const legacyTrial=hasActiveMembership && user?.membership?.paymentProvider==='trial';
  const existingAnnual=hasActiveMembership && !legacyTrial && !billing;
  const eligible=Boolean(user?.trial?.eligible);
  const locked=status==='loading'||status==='processing'||status==='success'||Boolean(sessionId);
  const price=quote?.finalPrice ?? 299;
  useEffect(()=>{if(!isLoading&&!isAuthenticated)navigate('/login',{replace:true,state:{from:location}});},[isAuthenticated,isLoading,location,navigate]);
  useEffect(()=>{
    if(!isAuthenticated||sessionId)return;
    let cancelled=false;
    Promise.all([getRecurringMembership(),getMembershipCheckoutConfig(),getMembershipQuote()]).then(([state,c,q])=>{
      if(cancelled)return;setRecurring(state.subscription);setConfig(c);setQuote(q);setStatus('ready');
      if(new URLSearchParams(location.search).get('checkout')==='cancelled')setMessage('Checkout was closed. Your trial starts only after you complete secure checkout.');
    }).catch(e=>{if(!cancelled){setStatus('error');setMessage(e.message||'Unable to load your membership. Please refresh.');}});
    return()=>{cancelled=true;};
  },[isAuthenticated,sessionId,location.search]);
  useEffect(()=>{
    if(!isAuthenticated||!sessionId)return;
    let cancelled=false,timer:ReturnType<typeof setTimeout>;
    const check=async(attempt=0)=>{
      setStatus('processing');setMessage('Confirming your membership…');
      try {
        const result=await confirmStripeMembershipCheckout(sessionId);
        if(cancelled)return;
        if(result.active){await refreshUser();if(cancelled)return;setStatus('success');setMessage('Your Ventus membership is active.');timer=setTimeout(()=>window.location.assign('/subscription'),900);}
        else if(result.pending&&attempt<5)timer=setTimeout(()=>check(attempt+1),2000);
        else{setStatus('error');setMessage('Your membership has not yet been confirmed. Check again or contact Ventus before starting another checkout.');}
      }catch(e){if(!cancelled){setStatus('error');setMessage(e instanceof Error?e.message:'Unable to confirm your membership.');}}
    };
    void check();return()=>{cancelled=true;clearTimeout(timer);};
  },[isAuthenticated,sessionId,refreshUser]);
  const checkout=async()=>{
    if(locked||!accepted)return;setStatus('processing');setMessage('Opening secure checkout…');
    try{window.location.assign(await createStripeMembershipCheckout(appliedCoupon||undefined));}
    catch(e){setStatus('error');setMessage(e instanceof Error?e.message:'Unable to open checkout.');}
  };
  const apply=async()=>{
    setCouponMessage('');setAccepted(false);
    try{const q=await getMembershipQuote(coupon);if(!q.couponValid){setCouponMessage('That membership code is not valid.');return;}setQuote(q);setAppliedCoupon(coupon.trim());setCouponMessage(q.couponDescription||'Membership code applied.');}
    catch(e){setCouponMessage(e instanceof Error?e.message:'Unable to check that code.');}
  };
  const complimentary=async()=>{
    if(locked||!appliedCoupon)return;setStatus('processing');
    try{await activateComplimentaryMembership(appliedCoupon);await refreshUser();setStatus('ready');setMessage('Your membership is active.');}
    catch(e){setStatus('error');setMessage(e instanceof Error?e.message:'Unable to activate membership.');}
  };
  const cancel=async()=>{
    if(locked)return;setStatus('processing');setMessage('Cancelling your renewal…');
    try{const state=await cancelRecurringMembership();setRecurring(state.subscription);await refreshUser();setStatus('ready');setMessage('Your renewal is cancelled. No further membership payments will be taken.');}
    catch(e){setStatus('error');setMessage(e instanceof Error?e.message:'Unable to cancel. Please try again.');}
  };
  const manage=async()=>{
    if(locked)return;setStatus('processing');
    try{window.location.assign(await openMembershipBilling());}
    catch(e){setStatus('error');setMessage(e instanceof Error?e.message:'Unable to open your billing details.');}
  };
  if(isLoading||!isAuthenticated)return <Layout><div className="container section-padding text-center"><p>Loading your account…</p></div></Layout>;
  return <Layout><section className="subscription-page section-padding"><div className="container"><div className="row justify-content-center"><div className="col-lg-8"><div className="auth-card membership-checkout-card">
    <img src="/assets/img/ventus-logo.png" alt="Ventus" className="membership-checkout-logo" />
    {message&&<div className={`alert ${status==='error'?'alert-danger':'alert-info'}`} role="status">{message}</div>}
    {sessionId ? <div className="text-center">{status==='error'&&<><button type="button" className="btn btn-outline-dark" onClick={()=>window.location.reload()}>Check membership again</button><p className="mt-3"><a href="mailto:daniella@ventustravel.co.uk">Contact Ventus</a></p></>}</div> : continuing ? <div className="text-center">
      <h2>{billing.status && billing.status!=='active'?'Your membership is inactive':billing.cancelAtPeriodEnd?'Your renewal is cancelled':billing.billingStatus==='trialing'?'Your free trial is active':billing.billingStatus==='active'?'Your membership is active':'Your membership needs attention'}</h2>
      {billing.cancelAtPeriodEnd?<p>{billing.status==='active'||!billing.status?<>You can enjoy member access until <strong>{dateLabel(billing.expiresAt)}</strong>. </>:null}There will be no renewal payment.</p>:<>
        <p>{billing.billingStatus==='trialing'?'Your complimentary trial ends':'Your next renewal is'} on <strong>{dateLabel(billing.expiresAt)}</strong>.</p>
        <p>£{(billing.renewalAmount??299).toFixed(2)} per year, renewing automatically until cancelled.</p>
        <p>{billing.billingStatus==='trialing'?'We’ll email you three days and one day before your trial ends.':'We’ll email you one month, one week and one day before renewal.'}</p>
      </>}
      <Link to="/" className="btn btn-primary btn-lg butn-dark">Explore hotels</Link>
      <div className="d-flex flex-wrap justify-content-center gap-3 mt-4">
        <button className="btn btn-outline-dark" type="button" onClick={manage} disabled={locked}>Payment details &amp; invoices</button>
        {!billing.cancelAtPeriodEnd&&<button className="btn btn-outline-dark" type="button" onClick={cancel} disabled={locked}>{status==='processing'?'Please wait…':'Cancel membership renewal'}</button>}
      </div>
      <p className="small mt-3">Cancellation takes one click. Your existing hotel reservations remain available in <Link to="/my-bookings">My Bookings</Link>.</p>
    </div> : existingAnnual ? <div className="text-center"><h2>Your membership is active</h2><p>{user?.membership?.expiresAt?`Your membership is valid until ${dateLabel(user.membership.expiresAt)}.`:'Enjoy your Ventus member benefits.'}</p><p>Your existing membership does not renew automatically.</p><Link to="/" className="btn btn-primary btn-lg butn-dark">Explore hotels</Link></div> : <>
      {legacyTrial&&<div className="membership-trial-panel"><h2>Your free trial is active</h2><p>Your original card-free trial lasts until <strong>{dateLabel(user?.trial?.expiresAt)}</strong>. No automatic charge applies to this trial.</p><Link to="/">Explore hotels</Link></div>}
      {!hasActiveMembership&&user?.trial?.used&&<p>Your free trial has ended. You can still manage existing reservations in <Link to="/my-bookings">My Bookings</Link>.</p>}
      <div className="text-center mb-4"><h2>{eligible?'Your first 7 days, complimentary':'Your annual Travel membership'}</h2><div className="membership-checkout-price">{eligible?'£0 today':`£${price.toFixed(2)}`}<small>{eligible?`, then £${price.toFixed(2)} per year`:' per year'}</small></div><p>{eligible?'Add your card to start your trial. No membership payment is taken today.':'Annual membership renews automatically until cancelled.'}</p></div>
      <ul className="membership-checkout-benefits">{BENEFITS.map(b=><li key={b}>{b}</li>)}</ul>
      <div className="membership-coupon-row"><input aria-label="Membership code" className="form-control" placeholder="Membership code (optional)" value={coupon} onChange={e=>setCoupon(e.target.value)} disabled={locked}/><button type="button" className="btn btn-outline-dark" disabled={locked||!coupon.trim()} onClick={apply}>Apply</button></div>
      {couponMessage&&<p>{couponMessage}</p>}
      {quote?.finalPrice===0?<><button type="button" className="btn btn-primary btn-lg butn-dark w-100" disabled={locked} onClick={complimentary}>Activate complimentary membership</button><p className="small mt-3">Your code provides one year of access with no automatic renewal.</p></>:<>
        <label className="booking-terms-confirmation mt-3"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} disabled={locked}/><span>{eligible?`I agree to a 7-day complimentary trial, then £${price.toFixed(2)} per year`:`I agree to pay £${price.toFixed(2)} now and each year`}, renewing automatically until I cancel. I can cancel in one click from My Membership before the next payment. <Link to="/terms-of-service">Membership terms</Link> apply.</span></label>
        {config?.stripe?.configured&&quote?<button type="button" className="btn btn-primary btn-lg butn-dark w-100" onClick={checkout} disabled={locked||!accepted}>{status==='processing'?'Opening secure checkout…':eligible?'Add card & start free trial':`Join for £${price.toFixed(2)} per year`}</button>:<p role="status">{status==='loading'?'Preparing your membership…':'Checkout is temporarily unavailable. Please refresh or contact Ventus.'}</p>}
        <p className="text-center small mt-3">{eligible?'We’ll remind you three days and one day before your trial ends. ':''}Cancel anytime before your next payment. Hotel bookings are paid separately under the hotel’s terms.</p>
      </>}
    </>}
  </div></div></div></div></section><BannerCTA/></Layout>;
};
export default Subscription;
