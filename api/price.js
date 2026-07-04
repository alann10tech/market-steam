function cleanPrice(v){if(v==null)return null;const n=Number(v);if(Number.isFinite(n)&&n>0)return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);return null}
export default async function handler(req,res){
  const marketName=String(req.query.marketName||""), rawUrl=String(req.query.url||"");
  if(!marketName)return res.status(400).json({success:false,error:"Item ausente"});
  try{
    // Primeiro tenta a página exata informada pelo usuário. Isso preserva filtros/exterior.
    const listing=rawUrl||`https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketName)}`;
    const lr=await fetch(listing,{headers:{"User-Agent":"Mozilla/5.0","Accept-Language":"pt-BR,pt;q=.9,en;q=.8"}});
    if(lr.ok){
      const html=await lr.text(),m=/Market_LoadOrderSpread\(\s*(\d+)\s*\)/.exec(html);
      if(m){
        const hr=await fetch(`https://steamcommunity.com/market/itemordershistogram?country=BR&language=brazilian&currency=7&item_nameid=${m[1]}&two_factor=0`,{headers:{"User-Agent":"Mozilla/5.0"}});
        if(hr.ok){const h=await hr.json(),p=cleanPrice(h.lowest_sell_order);if(p){res.setHeader("Cache-Control","s-maxage=180, stale-while-revalidate=300");return res.json({success:true,median_price:p,lowest_price:p})}}
      }
    }
    // Fallback para itens tradicionais.
    const url=`https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name=${encodeURIComponent(marketName)}`;
    const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}});
    const d=await r.json();if(!d.success)throw new Error("Preço indisponível");
    res.setHeader("Cache-Control","s-maxage=180, stale-while-revalidate=300");res.json(d);
  }catch(e){res.status(502).json({success:false,error:e.message||"Erro ao consultar preço"})}
}