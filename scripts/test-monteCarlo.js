/**
 * Smoke test for lib/monteCarlo.js — run: node scripts/test-monteCarlo.js
 */
const { runMonteCarloProjection, logReturns, mean, stdDev } = require("../lib/monteCarlo");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// synthetic upward drift with noise
const prices = [100];
for (let i = 1; i < 252; i++) {
  prices.push(prices[i - 1] * Math.exp(0.0004 + 0.015 * (Math.random() - 0.5)));
}

const returns = logReturns(prices);
const mu = mean(returns);
const sigma = stdDev(returns, mu);
assert(returns.length === prices.length - 1, "log return count");
assert(Number.isFinite(mu), "mu finite");
assert(sigma > 0, "sigma positive");

const result = runMonteCarloProjection(prices, { simulations: 1000, days: 30 });
assert(result.bear.length === 31, "bear path length (day 0 + 30)");
assert(result.base.length === 31, "base path length");
assert(result.bull.length === 31, "bull path length");
assert(result.bear[0] === result.startPrice, "day 0 equals start");
assert(result.base[0] === result.startPrice, "day 0 base equals start");
assert(result.bull[0] === result.startPrice, "day 0 bull equals start");

for (let t = 1; t <= 30; t++) {
  assert(result.bear[t] <= result.base[t], `bear <= base at day ${t}`);
  assert(result.base[t] <= result.bull[t], `base <= bull at day ${t}`);
}

assert(result.startPrice === prices[prices.length - 1], "default start is last price");

console.log("monteCarlo OK", {
  mu: result.mu.toFixed(6),
  sigma: result.sigma.toFixed(6),
  startPrice: result.startPrice.toFixed(2),
  day30: {
    bear: result.bear[30].toFixed(2),
    base: result.base[30].toFixed(2),
    bull: result.bull[30].toFixed(2),
  },
});
