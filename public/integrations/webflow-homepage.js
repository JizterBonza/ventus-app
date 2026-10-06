/* Ventus marketing homepage integration. Add as a deferred script in Webflow. */
(()=>{
  'use strict';
  const portal='https://destinations.ventustravel.co.uk',api='https://ventus-backend.onrender.com/api';
  const safeUrl=value=>{try{const url=new URL(value,portal);return url.protocol==='https:'?url.href:null;}catch{return null;}};
  const start=()=>{
    // Remove navigation to the superseded Webflow destinations index everywhere.
    document.querySelectorAll('a[href]').forEach(a=>{
      try {
        const url=new URL(a.href,location.href);
        if(['ventustravel.co.uk','www.ventustravel.co.uk',location.hostname].includes(url.hostname)&&/^\/destinations\/?$/.test(url.pathname))a.href=portal+'/';
      }catch{/* Leave unrelated links unchanged. */}
    });
    if(location.pathname!=='/')return;
    const items=[...document.querySelectorAll('#destinations .destinations-list_items')];
    Promise.all([fetch(api+'/homepage').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch(api+'/categories').then(r=>{if(!r.ok)throw Error();return r.json();})]).then(([home,pages])=>{
      const cards=home.content.cards;
      const categories=pages.categories.filter(c=>c.published&&c.showOnHomepage&&!cards.some(card=>card.href==='/categories/'+c.slug)).map(c=>({title:c.title,description:c.description,image:c.image,href:'/categories/'+c.slug}));
      [...categories,...cards].slice(0,3).forEach((card,index)=>{
        const item=items[index],href=safeUrl(card.href),image=safeUrl(card.image);if(!item||!href||!image)return;
        const img=item.querySelector('img.home_blog-list_image'),title=item.querySelector('.destination-card_heading'),description=item.querySelector('.destinations-heading .text-size-regular');
        if(img){img.removeAttribute('srcset');img.src=image;img.alt=card.title;}
        if(title)title.textContent=card.title;if(description)description.textContent=card.description||'';
        item.querySelectorAll('a').forEach(a=>{a.href=href;});
        const tags=item.querySelector('.destination-categories_wrapper');if(tags)tags.hidden=true;
      });
    }).catch(()=>{/* Existing cards remain usable if the destination feed is unavailable. */});
    const cookies=document.cookie.split(';').map(c=>c.trim());
    const dismissed=cookies.find(c=>c.startsWith('ventus_trial_welcome_dismissed_until='));
    if(cookies.includes('ventus_account_known=1')||Number(dismissed?.split('=')[1])>Date.now())return;
    const iframe=document.createElement('iframe');iframe.src=portal+'/welcome-embed';iframe.title='Discover Ventus membership';
    iframe.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:transparent;visibility:hidden;';
    const previous=document.body.style.overflow,focus=document.activeElement;
    let timeout;
    const close=()=>{clearTimeout(timeout);iframe.remove();document.body.style.overflow=previous;window.removeEventListener('message',message);if(focus&&focus.focus)focus.focus();};
    const message=e=>{
      if(e.origin!==portal||e.source!==iframe.contentWindow)return;
      if(e.data?.type==='ventus-welcome-close')close();
      if(e.data?.type==='ventus-welcome-ready'){clearTimeout(timeout);iframe.style.visibility='visible';document.body.style.overflow='hidden';iframe.focus();}
    };
    window.addEventListener('message',message);iframe.addEventListener('error',close);document.body.append(iframe);timeout=setTimeout(close,15000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
