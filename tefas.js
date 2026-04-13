exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  let fonKod = '';
  try {
    const p = new URLSearchParams(event.body || '');
    fonKod = (p.get('fonkod') || '').trim().toUpperCase();
  } catch(e) {}

  if (!fonKod) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'fonkod eksik' }) };

  const tarihler = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    tarihler.push(`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`);
  }

  const tefasHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx',
    'Origin': 'https://www.tefas.gov.tr',
    'X-Requested-With': 'XMLHttpRequest',
  };

  const fonTipleri = ['YAT', 'EMK', 'BYF'];

  for (const tarih of tarihler) {
    for (const fontip of fonTipleri) {
      try {
        const body = `fontip=${fontip}&fongrup=&fonkod=${fonKod}&bastarih=${tarih}&bittarih=${tarih}&fonturkod=&fonunvantip=&sfontur=`;
        const r = await fetch('https://www.tefas.gov.tr/api/DB/BindHistoryInfo', {
          method: 'POST', headers: tefasHeaders, body
        });
        if (!r.ok) continue;
        const json = await r.json();
        const rows = json?.data || json?.Data || [];
        if (rows.length > 0) {
          const row = rows[0];
          const alanlar = ['BORSABULTENFIYAT', 'FIYAT', 'BirimPayDegeri', 'BIRIMPAYDEGERI'];
          for (const alan of alanlar) {
            if (row[alan] && row[alan] !== '-' && row[alan] !== 'null') {
              const fiyat = parseFloat(row[alan].toString().replace(',', '.'));
              if (fiyat > 0) {
                return {
                  statusCode: 200, headers: cors,
                  body: JSON.stringify({ fiyat, kaynak: 'TEFAS', tarih, fontip, fonAdi: row.FONUNVAN || '', fonKod })
                };
              }
            }
          }
        }
      } catch(e) {}
    }
  }

  try {
    const r = await fetch(`https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${fonKod}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' }
    });
    if (r.ok) {
      const html = await r.text();
      const patterns = [
        /LabelPriceValue[^>]*>([0-9]+[,\.][0-9]+)/,
        /"BORSABULTENFIYAT"\s*:\s*"([0-9]+[,\.][0-9]+)"/i,
        /id="[^"]*Price[^"]*"[^>]*>([0-9]+[,\.][0-9]+)/i,
      ];
      for (const pat of patterns) {
        const m = html.match(pat);
        if (m) {
          const fiyat = parseFloat(m[1].replace(',', '.'));
          if (fiyat > 0) return { statusCode: 200, headers: cors, body: JSON.stringify({ fiyat, kaynak: 'HTML', fonKod }) };
        }
      }
    }
  } catch(e) {}

  return {
    statusCode: 404, headers: cors,
    body: JSON.stringify({ error: `${fonKod} fiyatı bulunamadı.`, fonKod })
  };
};
