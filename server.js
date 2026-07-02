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
  if (cache.size > 250) cache.delete(cache.keys().next().value); // cap memory from arbitrary symbol lookups
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

// GET /api/analyze?symbol=AAPL -> { symbol, name, currency, price, prevClose, timestamps, closes }
// 1 year of daily closes for any ticker so the browser can chart it and compute
// trend/momentum indicators. Cached 5 min per symbol.
const SYMBOL_RE = /^[A-Za-z0-9.\-^=]{1,15}$/;
app.get("/api/analyze", async (req, res) => {
  const sym = String(req.query.symbol || "").trim().toUpperCase();
  if (!SYMBOL_RE.test(sym)) return res.status(400).json({ error: "invalid symbol" });
  try {
    const data = await cached("analyze:" + sym, 300_000, async () => {
      const c = await fetchChart(sym, "1y");
      const meta = c.meta || {};
      const ts = c.timestamp || [];
      const rawCloses = c.indicators?.quote?.[0]?.close || [];
      const timestamps = [];
      const closes = [];
      for (let i = 0; i < rawCloses.length; i++) {
        if (rawCloses[i] != null) { timestamps.push(ts[i]); closes.push(rawCloses[i]); }
      }
      if (closes.length < 30) throw new Error("not enough price history for this symbol");
      return {
        symbol: meta.symbol || sym,
        name: meta.shortName || meta.longName || meta.symbol || sym,
        currency: meta.currency || "",
        price: meta.regularMarketPrice ?? closes[closes.length - 1],
        prevClose: meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2] ?? closes[closes.length - 1],
        timestamps,
        closes,
      };
    });
    res.json(data);
  } catch (e) {
    const msg = String(e.message || e);
    const notFound = /HTTP 404|not enough|empty result/.test(msg);
    res.status(notFound ? 404 : 502).json({ error: msg });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log(`Market Pulse listening on :${PORT}`));
