const crypto=require('crypto');
function registerLoyaltyRoutes(app,pool,authenticate) {
  const ensureSchema=()=>pool.query(`CREATE TABLE IF NOT EXISTS hotel_loyalty_cards(
    id UUID PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    programme VARCHAR(100) NOT NULL,membership_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,programme)
  )`);
  const route=fn=>async(req,res)=>{res.set('Cache-Control','private, no-store');try{await fn(req,res);}catch(e){res.status(503).json({error:'Unable to update your hotel loyalty cards. Please try again.'});}};
  app.get('/api/loyalty-cards',authenticate,route(async(req,res)=>{
    const result=await pool.query('SELECT id,programme,membership_number AS number FROM hotel_loyalty_cards WHERE user_id=$1 ORDER BY programme',[req.user.id]);
    res.json({cards:result.rows});
  }));
  app.post('/api/loyalty-cards',authenticate,route(async(req,res)=>{
    const programme=typeof req.body.programme==='string'?req.body.programme.trim():'';
    const number=typeof req.body.number==='string'?req.body.number.trim():'';
    if(!programme||programme.length>100||!number||! /^[A-Za-z0-9 -]{1,100}$/.test(number))return res.status(400).json({error:'Enter a hotel loyalty programme and a valid membership number.'});
    await pool.query(`INSERT INTO hotel_loyalty_cards(id,user_id,programme,membership_number) VALUES($1,$2,$3,$4)
      ON CONFLICT(user_id,programme) DO UPDATE SET membership_number=EXCLUDED.membership_number`,[crypto.randomUUID(),req.user.id,programme,number]);
    res.status(201).json({success:true});
  }));
  app.delete('/api/loyalty-cards/:id',authenticate,route(async(req,res)=>{
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id))return res.status(400).json({error:'Invalid loyalty card.'});
    await pool.query('DELETE FROM hotel_loyalty_cards WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
    res.json({success:true});
  }));
  return {ensureSchema};
}
module.exports={registerLoyaltyRoutes};
