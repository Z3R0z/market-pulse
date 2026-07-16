/**
 * Monte Carlo price projection via Geometric Brownian Motion (GBM).
 * S(t+1) = S(t) * exp((μ - σ²/2) * dt + σ * sqrt(dt) * Z), dt = 1, Z ~ N(0,1)
 */

function logReturns(prices) {
  const out = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev > 0 && curr > 0) out.push(Math.log(curr / prev));
  }
  return out;
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr, mu) {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, r) => s + (r - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function randn() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

/**
 * @param {number[]} prices - chronological daily closing prices (oldest first)
 * @param {object} [opts]
 * @param {number} [opts.simulations=1000]
 * @param {number} [opts.days=30]
 * @param {number} [opts.startPrice] - defaults to last price in array
 * @returns {{
 *   mu: number,
 *   sigma: number,
 *   startPrice: number,
 *   logReturns: number[],
 *   bear: number[],
 *   base: number[],
 *   bull: number[],
 *   simulations: number,
 *   days: number
 * }}
 */
function runMonteCarloProjection(prices, opts = {}) {
  const simulations = opts.simulations ?? 1000;
  const days = opts.days ?? 30;

  if (!Array.isArray(prices) || prices.length < 2) {
    throw new Error("prices must be an array with at least 2 entries");
  }

  const returns = logReturns(prices);
  if (returns.length < 1) throw new Error("need at least one valid log return");

  const mu = mean(returns);
  const sigma = stdDev(returns, mu);
  const startPrice = opts.startPrice ?? prices[prices.length - 1];
  if (!(startPrice > 0)) throw new Error("startPrice must be positive");

  const drift = mu - (sigma * sigma) / 2;
  const paths = Array.from({ length: simulations }, () => {
    const path = [startPrice];
    let s = startPrice;
    for (let d = 0; d < days; d++) {
      s = s * Math.exp(drift + sigma * randn());
      path.push(s);
    }
    return path;
  });

  const bear = [];
  const base = [];
  const bull = [];
  for (let t = 0; t <= days; t++) {
    if (t === 0) {
      bear.push(startPrice);
      base.push(startPrice);
      bull.push(startPrice);
      continue;
    }
    const slice = paths.map((p) => p[t]);
    bear.push(percentile(slice, 10));
    base.push(percentile(slice, 50));
    bull.push(percentile(slice, 90));
  }

  return {
    mu,
    sigma,
    startPrice,
    logReturns: returns,
    bear,
    base,
    bull,
    simulations,
    days,
  };
}

module.exports = { runMonteCarloProjection, logReturns, mean, stdDev, percentile };
