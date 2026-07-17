/**
 * Smoke test for lib/indicators.js — run: node scripts/test-indicators.js
 */
const { sma, smaLast, rsi, rsiLast, cleanPrices } = require("../lib/indicators");

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
}
function close(a, b, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

// ---- SMA ----
const s = sma([1, 2, 3, 4, 5], 3);
assert(s[0] === null && s[1] === null, "SMA warmup should be null");
assert(close(s[2], 2) && close(s[3], 3) && close(s[4], 4), "SMA values wrong: " + s);
assert(close(smaLast([1, 2, 3, 4, 5], 3), 4), "smaLast wrong");
assert(smaLast([1, 2], 5) === null, "SMA with too little data should be null");

// SMA ignores gaps rather than zero-filling
const gappy = sma([2, null, 4, undefined, 6, NaN, 8], 3);
// cleaned = [2,4,6,8]; last SMA = (4+6+8)/3
assert(close(smaLast([2, null, 4, undefined, 6, NaN, 8], 3), 6), "SMA gap handling wrong");
assert(cleanPrices([1, null, 2, NaN, 3]).length === 3, "cleanPrices wrong");

// ---- RSI ----
// Strictly rising prices -> RSI should pin at 100 (no losses)
assert(close(rsiLast([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 14), 100),
  "RSI of monotonic rise should be 100");
// Strictly falling -> RSI 0
assert(close(rsiLast([15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 14), 0),
  "RSI of monotonic fall should be 0");

// Known reference: classic Wilder worked example (first 14 changes) should
// land near the mid-50s..70s band for a mixed but net-up series.
const mixed = [
  44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
  45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
];
const r = rsiLast(mixed, 14);
assert(r > 50 && r < 90, "RSI mixed series out of expected band: " + r);

// Not enough data -> null, no throw
assert(rsiLast([1, 2, 3], 14) === null, "RSI too-short should be null");

// Flat prices -> neither gain nor loss -> 50 (neutral), not NaN
assert(close(rsiLast([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], 14), 50),
  "RSI of flat series should be 50");

// Gaps don't crash and don't fabricate values. Need >14 *clean* prices for RSI-14,
// so this series has 16 valid closes plus 2 gaps interspersed.
const rg = rsiLast([44, null, 44.5, NaN, 45, 44.8, 45.2, 45.5, 45.1, 45.6,
  46.0, 45.8, 46.2, 46.5, 46.1, 46.8, 47.0, 46.9], 14);
assert(rg != null && rg >= 0 && rg <= 100, "RSI with gaps produced invalid value: " + rg);

// Confirm the "not quite enough clean data" case returns null rather than guessing:
// 14 clean prices (2 gaps) is one short of the 15 needed for RSI-14.
assert(rsiLast([44, null, 44.5, NaN, 45, 44.8, 45.2, 45.5, 45.1, 45.6,
  46.0, 45.8, 46.2, 46.5, 46.1, 46.8], 14) === null,
  "RSI should return null when clean data is one short of period+1");

// Bad params throw
let threw = false;
try { sma([1, 2, 3], 0); } catch { threw = true; }
assert(threw, "SMA should throw on period 0");

console.log("indicators: all tests passed");
