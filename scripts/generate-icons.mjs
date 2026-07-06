/**
 * Generates all StoreCount app icons as PNGs with zero dependencies.
 * The mark matches components/ui/icons.tsx `Logo`: brand-green square
 * with three rising white bars.
 *
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Brand values — keep in sync with app/globals.css */
const PRIMARY = [14, 159, 110]; // #0e9f6e
const WHITE = [255, 255, 255];

/* ------------------------------ PNG encoding ------------------------------ */

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // Raw scanlines, each prefixed with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------ Rasterizing ------------------------------ */

/** Signed distance to a rounded rectangle centered at (cx, cy). */
function roundedRectSdf(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - (halfW - radius);
  const dy = Math.abs(py - cy) - (halfH - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

/** Bars on the 64-unit design grid: [x, y, w, h], radius 4. */
const BARS = [
  { rect: [14, 34, 8, 16], alpha: 0.7 },
  { rect: [28, 26, 8, 24], alpha: 0.85 },
  { rect: [42, 16, 8, 34], alpha: 1 },
];

function renderIcon(size, { safeZoneScale = 1 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const unit = (size / 64) * safeZoneScale;
  const offset = (size * (1 - safeZoneScale)) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let [r, g, b] = PRIMARY;
      const px = x + 0.5;
      const py = y + 0.5;
      for (const { rect, alpha } of BARS) {
        const [bx, by, bw, bh] = rect;
        const dist = roundedRectSdf(
          px,
          py,
          offset + (bx + bw / 2) * unit,
          offset + (by + bh / 2) * unit,
          (bw / 2) * unit,
          (bh / 2) * unit,
          4 * unit,
        );
        // 1px anti-aliased edge
        const coverage = Math.min(1, Math.max(0, 0.5 - dist)) * alpha;
        if (coverage > 0) {
          r = r + (WHITE[0] - r) * coverage;
          g = g + (WHITE[1] - g) * coverage;
          b = b + (WHITE[2] - b) * coverage;
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

const outputs = [
  ["public/icons/icon-192.png", renderIcon(192)],
  ["public/icons/icon-512.png", renderIcon(512)],
  // Maskable: artwork pulled into the 80% safe zone
  ["public/icons/icon-maskable-512.png", renderIcon(512, { safeZoneScale: 0.72 })],
  // Next.js file-convention icons (favicon + apple touch icon)
  ["app/icon.png", renderIcon(512)],
  ["app/apple-icon.png", renderIcon(180)],
];

for (const [path, png] of outputs) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, png);
  console.log(`wrote ${path} (${png.length} bytes)`);
}
