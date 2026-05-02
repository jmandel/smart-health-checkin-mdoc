#!/usr/bin/env bun
//
// Fetch the upstream SMART logo, strip everything except the colored
// starburst (the stylized "A"), compute a tight square viewBox, and rasterize
// to PNG at one or more sizes via rsvg-convert.
//
// Outputs:
//   wallet-android/app/matcher-rs/assets/starburst.svg       # the cropped-and-squared SVG
//   wallet-android/app/matcher-rs/assets/icon.png            # default size
//   wallet-android/app/matcher-rs/assets/icon-<size>.png     # one per --sizes entry
//
// Usage:
//   bun run wallet-android/app/matcher-rs/assets/build-icon.ts [--sizes 96,144,192,256] [--default 192]
//
// Re-run after the upstream logo changes, or when we want a new size.

import { spawnSync } from "node:child_process";

const SOURCE_URL = "https://smarthealthit.org/wp-content/themes/SMART/images/logo.svg";

// CSS classes on the upstream SVG that identify the colored starburst polygons.
// In the upstream artwork:
//   cls-1 = grey "SMART" wordmark — drop
//   cls-2 = blue triangle that forms the bottom point of the "A" descender — drop
//          (it sits visibly detached from the star body when the wordmark is removed)
//   cls-3..cls-7 = the five colored wedges that compose the star — keep
const STARBURST_CLASSES: Record<string, string> = {
  "cls-3": "#722772",
  "cls-4": "#e24a31",
  "cls-5": "#89bf44",
  "cls-6": "#e77d26",
  "cls-7": "#f1b42a",
};

type Args = { sizes: number[]; defaultSize: number };
function parseArgs(argv: string[]): Args {
  let sizes = [96, 144, 192, 256];
  let defaultSize = 192;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--sizes" && argv[i + 1]) {
      sizes = argv[++i]!.split(",").map((s) => Number.parseInt(s, 10));
    } else if (arg === "--default" && argv[i + 1]) {
      defaultSize = Number.parseInt(argv[++i]!, 10);
    }
  }
  return { sizes, defaultSize };
}

type Polygon = { fill: string; points: number[][] };

function extractPolygons(svg: string): Polygon[] {
  const out: Polygon[] = [];
  const re = /<polygon\b([^>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const attrs = m[1]!;
    const cls = /class="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const fill = STARBURST_CLASSES[cls];
    if (!fill) continue;
    const pointsAttr = /points="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const numbers = pointsAttr
      .trim()
      .split(/[\s,]+/)
      .map((s) => Number.parseFloat(s))
      .filter((n) => Number.isFinite(n));
    const points: number[][] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      points.push([numbers[i]!, numbers[i + 1]!]);
    }
    out.push({ fill, points });
  }
  return out;
}

function bbox(polys: Polygon[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of polys) {
    for (const [x, y] of p.points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function buildCroppedSvg(polys: Polygon[], padFraction = 0.04): string {
  const { minX, minY, maxX, maxY } = bbox(polys);
  // Center in a square viewBox larger of width/height.
  const w = maxX - minX;
  const h = maxY - minY;
  const side = Math.max(w, h);
  const pad = side * padFraction;
  const finalSide = side + pad * 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const vbX = cx - finalSide / 2;
  const vbY = cy - finalSide / 2;
  const polygonsXml = polys
    .map(
      (p) =>
        `  <polygon fill="${p.fill}" points="${p.points
          .map(([x, y]) => `${x} ${y}`)
          .join(", ")}"/>`,
    )
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(vbX)} ${fmt(vbY)} ${fmt(finalSide)} ${fmt(finalSide)}">`,
    `  <title>SMART starburst (cropped from ${SOURCE_URL})</title>`,
    polygonsXml,
    `</svg>`,
    "",
  ].join("\n");
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(4);
}

function rasterize(svgPath: string, pngPath: string, size: number) {
  const r = spawnSync(
    "rsvg-convert",
    ["-w", String(size), "-h", String(size), "--keep-aspect-ratio", svgPath, "-o", pngPath],
    { stdio: "inherit" },
  );
  if (r.status !== 0) {
    throw new Error(`rsvg-convert exited ${r.status}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.error(`fetching ${SOURCE_URL}…`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const svg = await res.text();
  const polys = extractPolygons(svg);
  if (polys.length !== Object.keys(STARBURST_CLASSES).length) {
    throw new Error(
      `expected ${Object.keys(STARBURST_CLASSES).length} starburst polygons; found ${polys.length}`,
    );
  }
  const cropped = buildCroppedSvg(polys);
  const here = new URL(".", import.meta.url).pathname;
  await Bun.write(`${here}starburst.svg`, cropped);
  console.error(`wrote ${here}starburst.svg`);

  for (const size of args.sizes) {
    const out = `${here}icon-${size}.png`;
    rasterize(`${here}starburst.svg`, out, size);
    console.error(`wrote ${out}`);
  }
  // Canonical name (the matcher's `include_bytes!` target).
  rasterize(`${here}starburst.svg`, `${here}icon.png`, args.defaultSize);
  console.error(`wrote ${here}icon.png (size=${args.defaultSize})`);
}

await main();
