
function plainText(html){
  return html.replace(/&nbsp;/g," ").replace(/&#36;/g,"$").replace(/&amp;/g,"&").replace(/<[^>]*>/g," ").replace(/\s+/g," ");
}
function filteredWearPrice(html, wear){
  const labels={
    WearCategory0:["Factory New","Nova de Fábrica"],
    WearCategory1:["Minimal Wear","Pouco Usada"],
    WearCategory2:["Field-Tested","Testada em Campo"],
    WearCategory3:["Well-Worn","Bem Desgastada"],
    WearCategory4:["Battle-Scarred","Veterana de Guerra"]
  };
  if(!labels[wear]) return null;
  const txt=plainText(html);
  for(const label of labels[wear]){
    const re=new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\s+R\\$\\s*([0-9.]+,[0-9]{2})","i");
    const m=txt.match(re);
    if(m) return `R$ ${m[1]}`;
  }
  return null;
}

export default async function handler(req,res){
  const marketName=String(req.query.marketName||"");
  const rawUrl=String(req.query.url||"");
  if(!marketName)return res.status(400).json({success:false,error:"Item ausente"});
  try{
    if(rawUrl){
      const u=new URL(rawUrl);
      const wear=u.searchParams.get("category_Exterior");
      if(wear){
        const r=await fetch(rawUrl,{headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36","Accept-Language":"en-US,en;q=.9,pt-BR;q=.8"}});
        if(r.ok){
          const p=filteredWearPrice(await r.text(),wear);
          if(p){
            res.setHeader("Cache-Control","no-store");
            return res.json({success:true,median_price:p,lowest_price:p,source:"exact_filtered_row"});
          }
        }
      }
    }
    const url=`https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name=${encodeURIComponent(marketName)}`;
    const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}});
    const d=await r.json();
    if(!d.success)throw new Error("Preço indisponível");
    res.setHeader("Cache-Control","no-store");
    return res.json(d);
  }catch(e){return res.status(502).json({success:false,error:e.message||"Erro ao consultar preço"})}
}
