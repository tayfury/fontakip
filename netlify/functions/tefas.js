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

  // TEFAS public endpoint - farklı URL dene
  try {
    const r = await fetch(`https://www.tefas.gov.tr/api/DB/BindHistoryInfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx',
        'Origin': 'https://www.tefas.gov.tr',
        'X-Requested-With': 'XMLHttpRequest',
        'sec-ch-ua': '"Chromium";v="124"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      body: `fontip=YAT&fongrup=&fonkod=${fonKod}&bastarih=&bittarih=&fonturkod=&fonunvantip=&sfontur=`,
    });

    const text = await r.text();
    console.log('TEFAS response status:', r.status);
    console.log('TEFAS response:', text.substring(0, 500));

    if (r.ok) {
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
                body: JSON.stringify({ fiyat, kaynak: 'TEFAS', fonKod })
              };
            }
          }
        }
      }
    }
    return { statusCode: 200, headers: cors, body: JSON.stringify({ debug: `status:${r.status}`, text: text.substring(0, 200), fonKod }) };
  } catch(e) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ error: e.message, fonKod }) };
  }
};
