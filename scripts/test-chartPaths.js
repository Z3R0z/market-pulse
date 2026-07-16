/**
 * Smoke test for public/chartPaths.js — run: node scripts/test-chartPaths.js
 */
const { projectionPathsToSvg } = require("../public/chartPaths");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const bear = [100, 98, 96, 94, 92, 90, 88, 86, 84, 82];
const base = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
const bull = [100, 103, 106, 109, 112, 115, 118, 121, 124, 127];

const out = projectionPathsToSvg(bear, base, bull);
assert(out.viewBox === "0 0 800 400", "default viewBox");
assert(out.bear.d.startsWith("M"), "bear path starts with M");
assert(out.base.d.includes("L"), "base path has line segments");
assert(out.bull.coords.length === 10, "bull coord count");

const pad = out.padding;
const chartW = out.width - pad.left - pad.right;
const chartH = out.height - pad.top - pad.bottom;

for (const key of ["bear", "base", "bull"]) {
  for (const pt of out[key].coords) {
    assert(pt.x >= pad.left && pt.x <= pad.left + chartW + 0.01, `${key} x in bounds`);
    assert(pt.y >= pad.top && pt.y <= pad.top + chartH + 0.01, `${key} y in bounds`);
  }
}

const custom = projectionPathsToSvg(bear, base, bull, {
  width: 900,
  height: 380,
  padding: { left: 64, right: 80, top: 26, bottom: 44 },
});
assert(custom.viewBox === "0 0 900 380", "custom viewBox");

try {
  projectionPathsToSvg(bear, base.slice(0, 5), bull);
  throw new Error("expected length mismatch error");
} catch (e) {
  assert(/same length/.test(e.message), "length mismatch caught");
}

console.log("chartPaths OK", {
  viewBox: out.viewBox,
  bearD: out.bear.d.slice(0, 40) + "…",
  bounds: out.bounds,
});
