# Market Pulse — web service version

A small Node/Express server that serves the dashboard AND relays live
market data through its own API (/api/quotes, /api/history). Because the
data fetching happens server-side, there are no CORS proxies, nothing to
steal from the page source, and responses are cached (quotes 60s,
history 10 min) so the data source is never hammered.

## Files

  server.js           the backend (Express, ~90 lines)
  package.json        dependencies (just express)
  render.yaml         Render config (Web Service, free plan)
  public/index.html   the dashboard

## Deploy to Render (3 steps)

1. github.com -> New repository -> Create. Upload ALL files from this
   zip, keeping the structure (public/index.html must stay inside the
   public folder). Easiest way: on the repo page choose "uploading an
   existing file" and drag the unzipped contents in, or use GitHub
   Desktop / git.
2. render.com -> New -> Web Service -> pick the repo.
     Build Command:  npm install
     Start Command:  npm start
     Instance Type:  Free
3. Create Web Service. Live in ~2 minutes at your-name.onrender.com.

## Run locally

  npm install
  npm start
  open http://localhost:3000

## Real-time quotes (optional)

The "Analyze any stock" search shows a LIVE last price when a Finnhub API
key is present (the free tier is real-time for U.S. stocks/ETFs). Without
a key it still works — the price just carries a DELAYED badge and uses the
latest daily close.

  1. Get a free key at finnhub.io (Dashboard -> API key).
  2. Local:
       macOS/Linux:  FINNHUB_API_KEY=xxxx npm start
       Windows PS:   $env:FINNHUB_API_KEY="xxxx"; npm start
  3. Render: Dashboard -> your service -> Environment -> add
       FINNHUB_API_KEY = xxxx   (never commit the key to the repo)

History and the trend/momentum indicators always come from Yahoo (daily
closes); the key only powers the live price, polled every ~4s. Free
real-time covers U.S. stocks/ETFs — not indices or futures — so the top
quote board stays on the delayed Yahoo feed.

## Good to know

- FREE PLAN SLEEP: Render free web services spin down after ~15 min of
  no traffic. The first visit afterward takes 30-60s to wake. Upgrade
  the instance or use a free uptime pinger if that bothers you.
- If quotes show "SNAPSHOT": the upstream data source didn't answer.
  The page falls back to the July 1, 2026 close and retries every 2 min.
  Check your-url/api/quotes to see the raw API response.
- Data comes from Yahoo Finance's public chart endpoint (unofficial,
  delayed). To switch to a keyed provider later (Finnhub, Twelve Data),
  only server.js needs editing — set the key as an environment variable
  in Render's dashboard, never in the code.

