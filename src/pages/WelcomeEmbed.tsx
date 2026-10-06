import React,{useCallback,useEffect} from 'react';
import TrialWelcomePopup from '../components/shared/TrialWelcomePopup';
const parents=['https://ventustravel.co.uk','https://www.ventustravel.co.uk','https://ventus-travel.webflow.io'];
const WelcomeEmbed:React.FC=()=>{
  const notify=useCallback((type:string)=>{
    let origin='';try{origin=new URL(document.referrer).origin;}catch{}
    if(parents.includes(origin))window.parent.postMessage({type},origin);
  },[]);
  const dismiss=useCallback(()=>notify('ventus-welcome-close'),[notify]);
  const ready=useCallback(()=>notify('ventus-welcome-ready'),[notify]);
  useEffect(()=>{const previous=document.body.style.background;document.body.style.background='transparent';return()=>{document.body.style.background=previous;};},[]);
  return <TrialWelcomePopup embedded onDismiss={dismiss} onOpen={ready}/>;
};
export default WelcomeEmbed;
