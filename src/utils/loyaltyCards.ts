import { getAuthToken } from './authService';
export interface LoyaltyCard { id: string; programme: string; number: string }
const base=process.env.REACT_APP_AUTH_API_URL?process.env.REACT_APP_AUTH_API_URL.replace(/\/auth\/?$/,''):process.env.NODE_ENV==='production'?'https://ventus-backend.onrender.com/api':'/api';
async function request(path='',method='GET',body?:unknown){
  const token=getAuthToken();if(!token)throw new Error('Please sign in to manage your loyalty cards.');
  const response=await fetch(`${base}/loyalty-cards${path}`,{method,cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to update your loyalty cards.');return data;
}
export const getLoyaltyCards=async():Promise<LoyaltyCard[]> => (await request()).cards;
export const saveLoyaltyCard=(programme:string,number:string)=>request('','POST',{programme,number});
export const removeLoyaltyCard=(id:string)=>request(`/${encodeURIComponent(id)}`,'DELETE');
