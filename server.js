// Market Pulse server — serves the site and relays market data.
// Because the request happens server-side, there's no browser CORS issue
// and no API key exposed to visitors.

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const SYMBOLS = ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX", "GC=F", "CL=F", "BTC-USD"];
const YH = (sym, range = "1d") =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d`;
const HEADERS = { "User-Agent": "Mozilla/5.0 (MarketPulse/1.0)", Accept: "application/json" };

// ---- tiny in-memory cache so we never hammer the data source ----
const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

async function fetchChart(sym, range) {
  const r = await fetch(YH(sym, range), { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${sym}: HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error(`${sym}: empty result`);
  return res;
}

// GET /api/quotes -> { "^GSPC": { price, prevClose }, ... }  (60s cache)
app.get("/api/quotes", async (_req, res) => {
  try {
    const data = await cached("quotes", 60_000, async () => {
      const out = {};
      await Promise.all(
        SYMBOLS.map(async (s) => {
          try {
            const c = await fetchChart(s, "1d");
            const m = c.meta || {};
            if (m.regularMarketPrice != null) {
              out[s] = {
                price: m.regularMarketPrice,
                prevClose: m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice,
              };
            }
          } catch (_) { /* skip symbol on failure */ }
        })
      );
      if (Object.keys(out).length === 0) throw new Error("no quotes available");
      return out;
    });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

// GET /api/history -> { closes: [...] } for ^GSPC, 1 year daily (10 min cache)
app.get("/api/history", async (_req, res) => {
  try {
    const data = await cached("history", 600_000, async () => {
      const c = await fetchChart("^GSPC", "1y");
      const closes = (c.indicators?.quote?.[0]?.close || []).filter((v) => v != null);
      if (closes.length < 210) throw new Error("insufficient history");
      return { closes };
    });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log(`Market Pulse listening on :${PORT}`));
