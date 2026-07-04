function clean(s=""){return s.replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim()}
function meta(html,prop){const a=new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,"i").exec(html);const b=new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,"i").exec(html);return clean((a||b||[])[1]||"")}
function priceToBRL(s){if(!s)return 0;return Number(s.replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",", "."))||0}
export default async function handler(req,res){
  const raw=String(req.query.url||"");
  if(!raw.startsWith("https://steamcommunity.com/market/listings/730/"))return res.status(400).json({success:false,error:"Link inválido"});
  try{
    const u=new URL(raw), marketName=decodeURIComponent(u.pathname.split("/").pop());
    const r=await fetch(raw,{headers:{"User-Agent":"Mozilla/5.0","Accept-Language":"pt-BR,pt;q=.9,en;q=.8"}});
    if(!r.ok)throw new Error("A Steam não respondeu.");
    const html=await r.text();
    let name=meta(html,"og:title")||marketName;
    name=name.replace(/\s*[—-]\s*(Steam Community Market|Mercado da Comunidade Steam).*$/i,"").replace(/\s*on Steam Community Market.*$/i,"").trim();
    const image=meta(html,"og:image");
    const pm=/Market_LoadOrderSpread\(\s*(\d+)\s*\)/.exec(html);
    let price=0;
    if(pm){
      const h=await fetch(`https://steamcommunity.com/market/itemordershistogram?country=BR&language=brazilian&currency=7&item_nameid=${pm[1]}&two_factor=0`,{headers:{"User-Agent":"Mozilla/5.0"}});
      if(h.ok){const j=await h.json();price=priceToBRL(j.lowest_sell_order||"")}
    }
    res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
    res.json({success:true,name,marketName,image,price,canonicalUrl:raw});
  }catch(e){res.status(500).json({success:false,error:e.message||"Erro ao identificar item"})}
}
