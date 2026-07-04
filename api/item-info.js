const WEAR = {
  WearCategory0: "Factory New",
  WearCategory1: "Minimal Wear",
  WearCategory2: "Field-Tested",
  WearCategory3: "Well-Worn",
  WearCategory4: "Battle-Scarred"
};

function clean(s="") {
  return s.replace(/&amp;/g,"&")
    .replace(/&#39;/g,"'")
    .replace(/&quot;/g,'"')
    .trim();
}

function meta(html, prop) {
  const a = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i"
  ).exec(html);

  const b = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
    "i"
  ).exec(html);

  return clean((a || b || [])[1] || "");
}

export default async function handler(req, res) {
  const raw = String(req.query.url || "");

  if (!raw.startsWith("https://steamcommunity.com/market/listings/730/")) {
    return res.status(400).json({ success:false, error:"Link inválido" });
  }

  try {
    const u = new URL(raw);
    const pathName = decodeURIComponent(u.pathname.split("/").pop());
    const wearCode = u.searchParams.get("category_Exterior");
    const wearName = WEAR[wearCode];

    const r = await fetch(raw, {
      headers: {
        "User-Agent":"Mozilla/5.0",
        "Accept-Language":"en-US,en;q=.9,pt-BR;q=.8"
      }
    });

    if (!r.ok) throw new Error("A Steam não respondeu.");

    const html = await r.text();

    let baseName = meta(html, "og:title") || pathName;
    baseName = baseName
      .replace(/\s*[—-]\s*(Steam Community Market|Mercado da Comunidade Steam).*$/i,"")
      .replace(/\s*on Steam Community Market.*$/i,"")
      .trim();

    // Em páginas G..., o título é o nome base. Acrescenta o exterior real.
    const exactName =
      wearName && !baseName.endsWith(`(${wearName})`)
        ? `${baseName} (${wearName})`
        : baseName;

    const image = meta(html, "og:image");

    return res.json({
      success:true,
      name:exactName,
      marketName:exactName,
      image,
      price:0,
      canonicalUrl:raw
    });

  } catch (e) {
    return res.status(500).json({
      success:false,
      error:e.message || "Erro ao identificar item"
    });
  }
}
