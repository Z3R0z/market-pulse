/**
 * Technical indicators — dependency-free, resilient to missing data.
 *
 * Both functions accept an array of closing prices that may contain gaps
 * (null / undefined / NaN). Non-finite entries are treated as "no data":
 * they are skipped rather than zero-filled, so a missing print never
 * silently drags an average toward zero or fabricates a return.
 */

/** Keep only finite, positive prices, preserving order. */
function cleanPrices(prices) {
  if (!Array.isArray(prices)) return [];
  return prices.filter((p) => typeof p === "number" && Number.isFinite(p));
}

/**
 * Simple Moving Average over a trailing window.
 *
 * @param {number[]} prices  chronological closes (oldest first); gaps allowed
 * @param {number}   period  window length in valid data points (> 0)
 * @returns {number[]} SMA series aligned to the cleaned price series. The first
 *   `period - 1` entries are `null` (not enough history yet); each later entry
 *   is the mean of the trailing `period` valid closes.
 */
function sma(prices, period) {
  const p = cleanPrices(prices);
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("sma: period must be a positive integer");
  }
  const out = new Array(p.length).fill(null);
  if (p.length < period) return out;

  // Rolling sum so the whole series is O(n) rather than O(n * period).
  let windowSum = 0;
  for (let i = 0; i < p.length; i++) {
    windowSum += p[i];
    if (i >= period) windowSum -= p[i - period];
    if (i >= period - 1) out[i] = windowSum / period;
  }
  return out;
}

/** Latest (most recent) SMA value, or null if there isn't enough data. */
function smaLast(prices, period) {
  const series = sma(prices, period);
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null) return series[i];
  }
  return null;
}

/**
 * Relative Strength Index using Wilder's smoothing.
 *
 * Seeds with a simple average of the first `period` gains/losses, then applies
 * Wilder's recursive smoothing for every subsequent step — the standard RSI,
 * not a plain rolling mean.
 *
 * @param {number[]} prices  chronological closes (oldest first); gaps allowed
 * @param {number}   [period=14]
 * @returns {number[]} RSI series (0–100) aligned to the cleaned price series.
 *   Entries before the indicator can be defined are `null`.
 */
function rsi(prices, period = 14) {
  const p = cleanPrices(prices);
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("rsi: period must be a positive integer");
  }
  const out = new Array(p.length).fill(null);
  if (p.length <= period) return out; // need period+1 prices for period changes

  // Seed average gain/loss from the first `period` price changes.
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = p[i] - p[i - 1];
    if (change >= 0) gainSum += change;
    else lossSum -= change; // losses stored as positive magnitudes
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = rsiFromAverages(avgGain, avgLoss);

  // Wilder smoothing for the rest of the series.
  for (let i = period + 1; i < p.length; i++) {
    const change = p[i] - p[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = rsiFromAverages(avgGain, avgLoss);
  }
  return out;
}

function rsiFromAverages(avgGain, avgLoss) {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100; // no losses -> maximally strong
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Latest RSI value, or null if there isn't enough data. */
function rsiLast(prices, period = 14) {
  const series = rsi(prices, period);
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null) return series[i];
  }
  return null;
}

module.exports = { sma, smaLast, rsi, rsiLast, cleanPrices };
