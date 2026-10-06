import React,{useEffect,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import Layout from '../components/layout/Layout';
import {useAuth} from '../contexts/AuthContext';
import {getLoyaltyCards,saveLoyaltyCard,removeLoyaltyCard,LoyaltyCard} from '../utils/loyaltyCards';
const PROGRAMMES=['Accor Live Limitless','GHA DISCOVERY','Hilton Honors','IHG One Rewards','Marriott Bonvoy','Shangri-La Circle','World of Hyatt'];
const LoyaltyCards:React.FC=()=>{
  const {isAuthenticated,isLoading}=useAuth(),navigate=useNavigate();
  const [cards,setCards]=useState<LoyaltyCard[]>([]),[programme,setProgramme]=useState(''),[number,setNumber]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
  useEffect(()=>{if(!isLoading&&!isAuthenticated)navigate('/login');},[isLoading,isAuthenticated,navigate]);
  useEffect(()=>{if(!isAuthenticated)return;let ignore=false;getLoyaltyCards().then(c=>{if(!ignore)setCards(c);}).catch(e=>{if(!ignore)setError(e.message);}).finally(()=>{if(!ignore)setLoading(false);});return()=>{ignore=true;};},[isAuthenticated]);
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');try{await saveLoyaltyCard(programme,number);setCards(await getLoyaltyCards());setProgramme('');setNumber('');setMessage('Your loyalty card is saved. You can select it when booking a hotel.');}catch(e){setError(e instanceof Error?e.message:'Unable to save your card.');}finally{setBusy(false);}};
  const remove=async(id:string)=>{if(busy)return;setBusy(true);setError('');try{await removeLoyaltyCard(id);setCards(c=>c.filter(card=>card.id!==id));setMessage('Loyalty card removed.');}catch(e){setError(e instanceof Error?e.message:'Unable to remove your card.');}finally{setBusy(false);}};
  return <Layout><section className="section-padding"><div className="container" style={{maxWidth:760}}><h1>Hotel loyalty cards</h1><p>Save your hotel loyalty numbers here, then choose the matching programme when you book. We’ll include that number with your reservation.</p><p className="small">Points and benefits depend on the hotel, rate and loyalty programme. Saving a card does not link previous bookings.</p>
    {error&&<div className="alert alert-danger" role="alert">{error}</div>}{message&&<div className="alert alert-success" role="status">{message}</div>}
    {loading?<p>Loading your cards…</p>:cards.length?<ul className="list-group mb-4">{cards.map(card=><li className="list-group-item d-flex justify-content-between align-items-center gap-3" key={card.id}><div><strong>{card.programme}</strong><div>{card.number}</div></div><button type="button" className="btn btn-outline-dark" onClick={()=>remove(card.id)} disabled={busy} aria-label={`Remove ${card.programme}`}>Remove</button></li>)}</ul>:<p>You haven’t saved any loyalty cards yet.</p>}
    <form onSubmit={save} className="auth-card"><h2>Add a loyalty card</h2><label className="form-label" htmlFor="loyaltyProgramme">Hotel loyalty programme</label><input className="form-control mb-3" id="loyaltyProgramme" list="loyaltyProgrammes" value={programme} onChange={e=>setProgramme(e.target.value)} maxLength={100} required disabled={busy}/><datalist id="loyaltyProgrammes">{PROGRAMMES.map(p=><option key={p} value={p}/>)}</datalist><label className="form-label" htmlFor="loyaltyNumber">Membership number</label><input className="form-control mb-4" id="loyaltyNumber" value={number} onChange={e=>setNumber(e.target.value)} maxLength={100} pattern="[A-Za-z0-9 -]+" required disabled={busy}/><button type="submit" className="btn btn-primary butn-dark" disabled={busy}>{busy?'Saving…':'Save loyalty card'}</button></form><p className="mt-4"><Link to="/">Explore hotels</Link> · <Link to="/my-bookings">My Bookings</Link></p>
  </div></section></Layout>;
};
export default LoyaltyCards;
