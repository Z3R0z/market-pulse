/**
 * Map Bear / Base / Bull price projections to SVG path d-strings.
 * Scales all series together so nothing clips inside the chart area.
 */
(function (root) {
  const DEFAULTS = {
    width: 800,
    height: 400,
    padding: { top: 26, right: 80, bottom: 44, left: 64 },
  };

  function resolvePadding(padding) {
    const p = { ...DEFAULTS.padding, ...padding };
    return {
      top: p.top,
      right: p.right,
      bottom: p.bottom,
      left: p.left,
    };
  }

  function priceBounds(bear, base, bull) {
    const all = bear.concat(base, bull).filter((v) => Number.isFinite(v));
    if (all.length === 0) return { min: 0, max: 1 };
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    const span = hi - lo || Math.abs(hi) || 1;
    lo -= span * 0.08;
    hi += span * 0.08;
    return { min: lo, max: hi };
  }

  function buildCoords(prices, chartW, chartH, pad, bounds) {
    const n = prices.length;
    const xAt = (i) => pad.left + (n <= 1 ? 0 : (i / (n - 1)) * chartW);
    const yAt = (v) =>
      pad.top + chartH * (1 - (v - bounds.min) / (bounds.max - bounds.min));
    return prices.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  }

  function toPathD(coords) {
    if (coords.length === 0) return "";
    return coords
      .map((pt, i) => `${i ? "L" : "M"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`)
      .join(" ");
  }

  /**
   * @param {number[]} bear
   * @param {number[]} base
   * @param {number[]} bull
   * @param {object} [options]
   * @param {number} [options.width=800]
   * @param {number} [options.height=400]
   * @param {{top?:number,right?:number,bottom?:number,left?:number}} [options.padding]
   * @returns {{
   *   viewBox: string,
   *   width: number,
   *   height: number,
   *   padding: {top:number,right:number,bottom:number,left:number},
   *   bounds: {min:number,max:number},
   *   bear: { d: string, coords: {x:number,y:number}[] },
   *   base: { d: string, coords: {x:number,y:number}[] },
   *   bull: { d: string, coords: {x:number,y:number}[] }
   * }}
   */
  function projectionPathsToSvg(bear, base, bull, options = {}) {
    const width = options.width ?? DEFAULTS.width;
    const height = options.height ?? DEFAULTS.height;
    const pad = resolvePadding(options.padding);
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    if (chartW <= 0 || chartH <= 0) {
      throw new Error("chart area must be positive after padding");
    }

    const len = bear.length;
    if (base.length !== len || bull.length !== len) {
      throw new Error("bear, base, and bull arrays must have the same length");
    }
    if (len < 1) throw new Error("projection arrays must not be empty");

    const bounds = priceBounds(bear, base, bull);
    const bearCoords = buildCoords(bear, chartW, chartH, pad, bounds);
    const baseCoords = buildCoords(base, chartW, chartH, pad, bounds);
    const bullCoords = buildCoords(bull, chartW, chartH, pad, bounds);

    return {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      padding: pad,
      bounds,
      bear: { d: toPathD(bearCoords), coords: bearCoords },
      base: { d: toPathD(baseCoords), coords: baseCoords },
      bull: { d: toPathD(bullCoords), coords: bullCoords },
    };
  }

  const api = { projectionPathsToSvg, DEFAULTS };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.MarketPulseChartPaths = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
