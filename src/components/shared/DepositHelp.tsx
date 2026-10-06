import React from 'react';
const DepositHelp:React.FC<{description?:string|null}>=({description})=> /deposit/i.test(description||'')&&!/no deposit|deposit (?:is )?not required/i.test(description||'')?<p className="deposit-help">Need to know the exact deposit amount? Click on our <a href="https://wa.me/447342840963" target="_blank" rel="noreferrer">live chat</a> and we’ll be happy to assist you.</p>:null;
export default DepositHelp;
