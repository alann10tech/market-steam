const WEAR = {
  WearCategory0: "Factory New",
  WearCategory1: "Minimal Wear",
  WearCategory2: "Field-Tested",
  WearCategory3: "Well-Worn",
  WearCategory4: "Battle-Scarred"
};

async function overview(name) {
  const url =
    "https://steamcommunity.com/market/priceoverview/?" +
    "appid=730&currency=7&market_hash_name=" + encodeURIComponent(name);

  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json"
    }
  });

  if (!r.ok) return null;
  const d = await r.json();
  return d && d.success ? d : null;
}

export default async function handler(req, res) {
  const marketName = String(req.query.marketName || "");
  const rawUrl = String(req.query.url || "");

  if (!marketName) {
    return res.status(400).json({ success:false, error:"Item ausente" });
  }

  try {
    let exactName = marketName;

    // Para páginas agrupadas G..., converte o filtro de exterior
    // no market_hash_name real usado pelo priceoverview.
    if (rawUrl) {
      const u = new URL(rawUrl);
      const wearCode = u.searchParams.get("category_Exterior");
      const wearName = WEAR[wearCode];

      if (wearName && !exactName.endsWith(`(${wearName})`)) {
        exactName = `${exactName} (${wearName})`;
      }
    }

    let data = await overview(exactName);

    // Fallback somente para itens sem exterior.
    if (!data && exactName === marketName) {
      data = await overview(marketName);
    }

    if (!data) {
      return res.status(502).json({
        success:false,
        error:`Preço indisponível para ${exactName}`
      });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      ...data,
      resolved_market_name: exactName
    });

  } catch (e) {
    return res.status(502).json({
      success:false,
      error:e.message || "Erro ao consultar preço"
    });
  }
}
