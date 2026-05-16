import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      name: 'overpass-dev-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !req.url.startsWith('/api/hospitals')) {
            return next();
          }

          try {
            const fullUrl = new URL(req.url, 'http://localhost:5173');
            const query = fullUrl.searchParams.get('query');

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (!query) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing query' }));
              return;
            }

            // Same mirrors as api/hospitals.js — verified working with POST + User-Agent
            const mirrors = [
              'https://overpass-api.de/api/interpreter',
              'https://lz4.overpass-api.de/api/interpreter',
              'https://z.overpass-api.de/api/interpreter',
              'https://overpass.kumi.systems/api/interpreter'
            ];

            for (const mirror of mirrors) {
              try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 10000);

                const resp = await fetch(mirror, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'HealthBridgeAI/1.0 (health-bridge-ai.vercel.app)'
                  },
                  body: 'data=' + encodeURIComponent(query),
                  signal: controller.signal
                });

                clearTimeout(timer);

                if (!resp.ok) {
                  console.log(`[overpass-proxy] ${mirror} returned ${resp.status}`);
                  continue;
                }

                const text = await resp.text();
                try {
                  JSON.parse(text);
                  res.statusCode = 200;
                  res.end(text);
                  return;
                } catch {
                  console.log(`[overpass-proxy] ${mirror} returned invalid JSON`);
                  continue;
                }
              } catch (err) {
                console.log(`[overpass-proxy] ${mirror}: ${err.name === 'AbortError' ? 'timeout' : err.message}`);
                continue;
              }
            }

            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'All Overpass mirrors failed' }));
          } catch (err) {
            console.error('[overpass-proxy] Unexpected error:', err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal proxy error' }));
            }
          }
        });
      }
    }
  ]
})