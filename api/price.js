function moneyFromText(v){
  if(!v)return null;
  const m=String(v).match(/R\$\s*([0-9.]+,[0-9]{2})/);
  return m ? `R$ ${m[1]}` : null;
}
function plain(html){
  return html.replace(/&nbsp;/g," ").replace(/&#36;/g,"$").replace(/&amp;/g,"&").replace(/<[^>]*>/g," ").replace(/\s+/g," ");
}
const wearLabels={
  WearCategory0:["Factory New","Nova de Fábrica"],
  WearCategory1:["Minimal Wear","Pouco Usada"],
  WearCategory2:["Field-Tested","Testada em Campo"],
  WearCategory3:["Well-Worn","Bem Desgastada"],
  WearCategory4:["Battle-Scarred","Veterana de Guerra"]
};
async function priceFromExactFilteredPage(rawUrl){
  const u=new URL(rawUrl);
  const wear=u.searchParams.get("category_Exterior");
  if(!wear||!wearLabels[wear])return null;
  const r=await fetch(rawUrl,{headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36","Accept-Language":"en-US,en;q=.9,pt-BR;q=.8"}});
  if(!r.ok)return null;
  const txt=plain(await r.text());
  for(const label of wearLabels[wear]){
    const pos=txt.toLowerCase().indexOf(label.toLowerCase());
    if(pos>=0){
      const section=txt.slice(pos,pos+2500);
      const p=moneyFromText(section);
      if(p)return p;
    }
  }
  return null;
}
function cleanPrice(v){
  if(v==null)return null;
  const n=Number(v);
  return Number.isFinite(n)&&n>0 ? new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100) : null;
}
export default async function handler(req,res){
  const marketName=String(req.query.marketName||""), rawUrl=String(req.query.url||"");
  if(!marketName)return res.status(400).json({success:false,error:"Item ausente"});
  try{
    // Links agrupados G... com filtro de exterior: lê a linha da condição escolhida.
    if(rawUrl){
      const filtered=await priceFromExactFilteredPage(rawUrl);
      if(filtered){
        res.setHeader("Cache-Control","s-maxage=180, stale-while-revalidate=300");
        return res.json({success:true,median_price:filtered,lowest_price:filtered,source:"filtered_wear"});
      }
    }

    // Itens comuns: tenta o order book da página.
    const listing=rawUrl||`https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketName)}`;
    const lr=await fetch(listing,{headers:{"User-Agent":"Mozilla/5.0","Accept-Language":"pt-BR,pt;q=.9,en;q=.8"}});
    if(lr.ok){
      const html=await lr.text(),m=/Market_LoadOrderSpread\(\s*(\d+)\s*\)/.exec(html);
      if(m){
        const hr=await fetch(`https://steamcommunity.com/market/itemordershistogram?country=BR&language=brazilian&currency=7&item_nameid=${m[1]}&two_factor=0`,{headers:{"User-Agent":"Mozilla/5.0"}});
        if(hr.ok){
          const h=await hr.json(),p=cleanPrice(h.lowest_sell_order);
          if(p){res.setHeader("Cache-Control","s-maxage=180, stale-while-revalidate=300");return res.json({success:true,median_price:p,lowest_price:p,source:"orderbook"})}
        }
      }
    }

    const url=`https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name=${encodeURIComponent(marketName)}`;
    const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}});
    const d=await r.json();
    if(!d.success)throw new Error("Preço indisponível");
    res.setHeader("Cache-Control","s-maxage=180, stale-while-revalidate=300");
    res.json(d);
  }catch(e){res.status(502).json({success:false,error:e.message||"Erro ao consultar preço"})}
}
