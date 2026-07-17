#!/usr/bin/env node
// scripts/mapstyle/build.mjs — paper-muted basemap generator (Map style Track 1).
//
// Reads the FROZEN upstream style snapshots in ./snapshots/ (outdoors-v12 +
// dark-v11, fetched 2026-07-16 — never refetched implicitly, so upstream layer
// renames can't break us) and derives ClimMate "paper" variants aligned with
// docs/DESIGN_LANGUAGE.md §0: quiet desaturated land, gray roads, muted water,
// fewer labels. Outputs go to src/features/mapscreen/mapstyles/ and are wired
// via MapView's styleJSON prop (runtime overlay layers — rings, pins,
// TrailLayer — are ShapeSource children on top and are untouched by design).
//
// Usage: node scripts/mapstyle/build.mjs   (rerun after editing PARAMS; commit
// both this script and the regenerated outputs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, '../../src/features/mapscreen/mapstyles');

// ─── Tuning table (device-iterated; keep every knob here) ────────────────
const PARAMS = {
  light: {
    name: 'ClimMate Paper Light',
    // Non-vegetation land (bare land, buildings, structures): quietest tier.
    landSatMul: 0.45,
    landLightAdd: 0.04,
    // Vegetation (landcover / landuse / national-park / wetland): keep a
    // breath of living green — uniform desat read as "死气沉沉" on device
    // (2026-07-16), so plants sit a full tier above bare land.
    vegSatMul: 0.78,
    vegLightAdd: 0.02,
    // roads: near-grayscale, slightly lifted so they read as hairlines
    roadSatMul: 0.15,
    roadLightAdd: 0.08,
    // water: muted but present — water is where a quiet map affords color
    waterSatMul: 0.58,
    waterLightAdd: 0.03,
    // background: warm paper tint, same family as app `background #F4F3F2`
    // (upstream is hsl(60,20%,85%) — cooler and darker than our paper)
    backgroundColor: 'hsl(45, 22%, 93%)',
    // text labels keep contrast; halos keep as-is (readability)
    minorSettlementMinzoom: 11, // Kelso/Kent tier: only when zoomed in
    subdivisionMinzoom: 13, // neighborhood names: later still
    deleteLayers: ['poi-label', 'road-number-shield', 'road-exit-shield'],
    // natural-point-label (peaks) + water-point-label intentionally KEPT —
    // terrain names are signal for climbers, unlike shop/restaurant POIs.
  },
  dark: {
    name: 'ClimMate Paper Dark',
    landSatMul: 0.5,
    landLightAdd: 0, // dark style is already muted; don't lift lightness
    vegSatMul: 0.75,
    vegLightAdd: 0,
    roadSatMul: 0.2,
    roadLightAdd: 0,
    waterSatMul: 0.6,
    waterLightAdd: 0,
    backgroundColor: null, // dark base is fine as-is
    minorSettlementMinzoom: 11,
    subdivisionMinzoom: 13,
    deleteLayers: ['poi-label', 'road-number-shield', 'road-exit-shield'],
  },
};

const BUILDS = [
  { snapshot: 'outdoors-v12.json', out: 'outdoors-paper.json', params: PARAMS.light },
  { snapshot: 'dark-v11.json', out: 'dark-paper.json', params: PARAMS.dark },
];

// ─── Color plumbing: parse hex/rgb(a)/hsl(a) → {h,s,l,a} → hsl(a) string ──
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s, l };
}

function parseColor(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return { ...rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255), a: 1 };
  }
  m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) {
    const [r, g, b] = m[1].split('').map((c) => parseInt(c + c, 16));
    return { ...rgbToHsl(r, g, b), a: 1 };
  }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s);
  if (m) {
    return { ...rgbToHsl(+m[1], +m[2], +m[3]), a: m[4] === undefined ? 1 : +m[4] };
  }
  m = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s);
  if (m) {
    return { h: +m[1], s: +m[2] / 100, l: +m[3] / 100, a: m[4] === undefined ? 1 : +m[4] };
  }
  return null; // named colors / expressions handled elsewhere
}

function formatColor({ h, s, l, a }) {
  const H = Math.round(h * 10) / 10;
  const S = Math.round(s * 1000) / 10;
  const L = Math.round(l * 1000) / 10;
  return a === 1 ? `hsl(${H}, ${S}%, ${L}%)` : `hsla(${H}, ${S}%, ${L}%, ${Math.round(a * 100) / 100})`;
}

let unparsedColors = new Set(); // visibility: formats parseColor skips pass through UNMUTED

function muteColor(str, satMul, lightAdd) {
  const c = parseColor(str);
  if (!c) {
    unparsedColors.add(str);
    return str;
  }
  c.s = Math.max(0, Math.min(1, c.s * satMul));
  c.l = Math.max(0, Math.min(1, c.l + lightAdd));
  return formatColor(c);
}

// Recursively transform every color-looking string inside a paint value
// (handles nested expressions like ["interpolate", ..., "hsl(...)"]).
function mapColors(value, fn) {
  if (typeof value === 'string') {
    return parseColor(value) ? fn(value) : value;
  }
  if (Array.isArray(value)) return value.map((v) => mapColors(v, fn));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapColors(v, fn);
    return out;
  }
  return value;
}

// ─── Layer classification ────────────────────────────────────────────────
const ROAD_RE = /road|motorway|trunk|primary|secondary|tertiary|street|bridge|tunnel|turning|aeroway|ferry/;
const WATER_RE = /water|waterway/;
// Living green tier (fill ids verified against the frozen outdoors-v12
// snapshot): landcover, landuse, national-park, wetland*, plus vegetation
// lines (tree rows). Hillshade stays 'land' (terrain depth ≠ vegetation).
const VEG_RE = /landcover|landuse|national-park|wetland|grass|wood|forest|scrub|pitch|golf/;

function classify(layer) {
  if (layer.type === 'symbol') return 'symbol'; // text/icons: leave colors alone
  if (VEG_RE.test(layer.id)) return 'vegetation';
  if (WATER_RE.test(layer.id)) return 'water';
  if (ROAD_RE.test(layer.id)) return 'road';
  return 'land'; // background, hillshade, contours, buildings, structures
}

function transformStyle(style, p) {
  const layers = [];
  for (const layer of style.layers) {
    if (p.deleteLayers.includes(layer.id)) continue;
    const out = { ...layer };
    if (layer.id === 'settlement-minor-label') {
      out.minzoom = Math.max(layer.minzoom ?? 0, p.minorSettlementMinzoom);
    }
    if (layer.id === 'settlement-subdivision-label') {
      out.minzoom = Math.max(layer.minzoom ?? 0, p.subdivisionMinzoom);
    }
    const cls = classify(layer);
    if (cls !== 'symbol' && layer.paint) {
      const [satMul, lightAdd] =
        cls === 'road'
          ? [p.roadSatMul, p.roadLightAdd]
          : cls === 'water'
            ? [p.waterSatMul, p.waterLightAdd]
            : cls === 'vegetation'
              ? [p.vegSatMul, p.vegLightAdd]
              : [p.landSatMul, p.landLightAdd];
      out.paint = mapColors(layer.paint, (c) => muteColor(c, satMul, lightAdd));
    }
    if (layer.type === 'background' && p.backgroundColor) {
      out.paint = { ...out.paint, 'background-color': p.backgroundColor };
    }
    layers.push(out);
  }
  return { ...style, name: p.name, layers };
}

// ─── Build ────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const b of BUILDS) {
  const src = JSON.parse(fs.readFileSync(path.join(HERE, 'snapshots', b.snapshot), 'utf8'));
  unparsedColors = new Set();
  const out = transformStyle(src, b.params);
  // INVARIANT: the transform only touches `layers`/`name`. sources/sprite/
  // glyphs must stay byte-identical to the snapshot — offline packs are
  // created against the STOCK styleURL (offlineManager.ts STYLE_URL_MAP) and
  // only serve the paper style because both request the same resources.
  for (const key of ['sources', 'sprite', 'glyphs']) {
    if (JSON.stringify(out[key]) !== JSON.stringify(src[key])) {
      throw new Error(`transform touched style.${key} — this breaks offline pack coverage; see offlineManager.ts`);
    }
  }
  const dest = path.join(OUT_DIR, b.out);
  fs.writeFileSync(dest, JSON.stringify(out));
  const skipped = unparsedColors.size
    ? ` · unparsed colors passed through unmuted: ${[...unparsedColors].join(', ')}`
    : '';
  console.log(`${b.snapshot} (${src.layers.length} layers) → ${path.relative(process.cwd(), dest)} (${out.layers.length} layers)${skipped}`);
}
