export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  // Verified working mirrors (tested with POST + User-Agent)
  const MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  const errors = [];

  for (const url of MIRRORS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'HealthBridgeAI/1.0 (health-bridge-ai.vercel.app)'
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        errors.push(`${url}: HTTP ${response.status}`);
        continue;
      }

      const text = await response.text();

      try {
        const data = JSON.parse(text);
        return res.status(200).json(data);
      } catch (parseErr) {
        errors.push(`${url}: Response not valid JSON`);
        continue;
      }
    } catch (err) {
      errors.push(`${url}: ${err.name === 'AbortError' ? 'Timeout' : err.message}`);
      continue;
    }
  }

  return res.status(502).json({
    error: 'All Overpass mirrors failed',
    details: errors
  });
}