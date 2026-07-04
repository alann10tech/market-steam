
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

function clean(s=""){return s.replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim()}
function meta(html,prop){
  const a=new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,"i").exec(html);
  const b=new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,"i").exec(html);
  return clean((a||b||[])[1]||"");
}
function parseBRL(s){if(!s)return 0;return Number(s.replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",", "."))||0}
export default async function handler(req,res){
  const raw=String(req.query.url||"");
  if(!raw.startsWith("https://steamcommunity.com/market/listings/730/"))return res.status(400).json({success:false,error:"Link inválido"});
  try{
    const u=new URL(raw),marketName=decodeURIComponent(u.pathname.split("/").pop()),wear=u.searchParams.get("category_Exterior");
    const r=await fetch(raw,{headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36","Accept-Language":"en-US,en;q=.9,pt-BR;q=.8"}});
    if(!r.ok)throw new Error("A Steam não respondeu.");
    const html=await r.text();
    let name=meta(html,"og:title")||marketName;
    name=name.replace(/\s*[—-]\s*(Steam Community Market|Mercado da Comunidade Steam).*$/i,"").replace(/\s*on Steam Community Market.*$/i,"").trim();
    const image=meta(html,"og:image");
    const fp=wear?filteredWearPrice(html,wear):null;
    return res.json({success:true,name,marketName,image,price:parseBRL(fp),canonicalUrl:raw});
  }catch(e){return res.status(500).json({success:false,error:e.message||"Erro ao identificar item"})}
}
