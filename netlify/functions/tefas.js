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

  // Önce oturum açıp cookie al
  try {
    const session = await fetch('https://www.tefas.gov.tr/TarihselVeriler.aspx', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      }
    });

    const cookies = session.headers.get('set-cookie') || '';

    const tarihler = [];
    for (let i = 0; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      tarihler.push(`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`);
    }

    for (const tarih of tarihler) {
      for (const fontip of ['YAT', 'EMK', 'BYF']) {
        try {
          const body = `fontip=${fontip}&fongrup=&fonkod=${fonKod}&bastarih=${tarih}&bittarih=${tarih}&fonturkod=&fonunvantip=&sfontur=`;
          const r = await fetch('https://www.tefas.gov.tr/api/DB/BindHistoryInfo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
              'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx',
              'Origin': 'https://www.tefas.gov.tr',
              'X-Requested-With': 'XMLHttpRequest',
              'Cookie': cookies,
            },
            body
          });

          if (!r.ok) continue;
          const text = await r.text();
          if (text.includes('<html')) continue;
          const json = JSON.parse(text);
          const rows = json?.data || json?.Data || [];
          if (rows.length > 0) {
            const row = rows[0];
            for (const alan of ['BORSABULTENFIYAT', 'FIYAT', 'BirimPayDegeri', 'BIRIMPAYDEGERI']) {
              if (row[alan] && row[alan] !== '-' && row[alan] !== 'null') {
                const fiyat = parseFloat(row[alan].toString().replace(',', '.'));
                if (fiyat > 0) {
                  return {
                    statusCode: 200, headers: cors,
                    body: JSON.stringify({ fiyat, kaynak: 'TEFAS', tarih, fontip, fonKod })
                  };
                }
              }
            }
          }
        } catch(e) {}
      }
    }
  } catch(e) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ error: e.message, fonKod }) };
  }

  return {
    statusCode: 404, headers: cors,
    body: JSON.stringify({ error: `${fonKod} fiyatı bulunamadı.`, fonKod })
  };
};
