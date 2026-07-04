const WEAR={WearCategory0:"Factory New",WearCategory1:"Minimal Wear",WearCategory2:"Field-Tested",WearCategory3:"Well-Worn",WearCategory4:"Battle-Scarred"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function overview(name){
  const url="https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name="+encodeURIComponent(name);
  let status=0;
  for(let a=0;a<4;a++){
    const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36","Accept":"application/json,text/plain,*/*","Accept-Language":"pt-BR,pt;q=.9,en;q=.8"}});
    status=r.status;
    if(r.ok){
      const d=await r.json();
      if(d&&d.success&&(d.median_price||d.lowest_price))return d;
    }
    await sleep(1500*(a+1));
  }
  throw new Error(`Steam temporariamente indisponível (${status||"sem resposta"})`);
}
export default async function handler(req,res){
  const marketName=String(req.query.marketName||""),rawUrl=String(req.query.url||"");
  if(!marketName)return res.status(400).json({success:false,error:"Item ausente"});
  try{
    let exactName=marketName;
    if(rawUrl){
      const u=new URL(rawUrl),wearName=WEAR[u.searchParams.get("category_Exterior")];
      if(wearName&&!exactName.endsWith(`(${wearName})`))exactName=`${exactName} (${wearName})`;
    }
    const data=await overview(exactName);
    res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=900");
    return res.json({...data,resolved_market_name:exactName});
  }catch(e){
    return res.status(503).json({success:false,error:e.message||"Erro temporário ao consultar preço"});
  }
}
