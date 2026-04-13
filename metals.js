exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  const result = { usd: null, eur: null, goldTryGram: null, silverTryGram: null, goldUsdOz: null, silverUsdOz: null };
  const TROY = 31.1035;
  const cb = `_cb=${Date.now()}`;

  try {
    const r = await fetch(`https://api.frankfurter.app/latest?from=USD&to=TRY,EUR&${cb}`, {
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' }
    });
    if (r.ok) {
      const d = await r.json();
      result.usd = d.rates?.TRY || null;
      if (result.usd && d.rates?.EUR) result.eur = result.usd / d.rates.EUR;
    }
  } catch(e) {}

  if (!result.usd) {
    try {
      const r = await fetch(`https://api.exchangerate-api.com/v4/latest/USD?${cb}`, {
        headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' }
      });
      if (r.ok) {
        const d = await r.json();
        result.usd = d.rates?.TRY || null;
        if (result.usd && d.rates?.EUR) result.eur = result.usd / d.rates.EUR;
      }
    } catch(e) {}
  }

  try {
    const r = await fetch(`https://api.gold-api.com/price/XAU?${cb}`, {
      headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' }
    });
    if (r.ok) {
      const d = await r.json();
      result.goldUsdOz = d.price || d.ask || null;
    }
  } catch(e) {}

  try {
    const r = await fetch(`https://api.gold-api.com/price/XAG?${cb}`, {
      headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' }
    });
    if (r.ok) {
      const d = await r.json();
      result.silverUsdOz = d.price || d.ask || null;
    }
  } catch(e) {}

  if (!result.goldUsdOz) {
    try {
      const r = await fetch(`https://api.exchangerate-api.com/v4/latest/XAU?${cb}`);
      if (r.ok) { const d = await r.json(); result.goldUsdOz = d.rates?.USD || null; }
    } catch(e) {}
  }
  if (!result.silverUsdOz) {
    try {
      const r = await fetch(`https://api.exchangerate-api.com/v4/latest/XAG?${cb}`);
      if (r.ok) { const d = await r.json(); result.silverUsdOz = d.rates?.USD || null; }
    } catch(e) {}
  }

  if (result.goldUsdOz && result.usd) result.goldTryGram = (result.goldUsdOz * result.usd) / TROY;
  if (result.silverUsdOz && result.usd) result.silverTryGram = (result.silverUsdOz * result.usd) / TROY;

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ ...result, timestamp: new Date().toISOString() })
  };
};
