/**
 * Generates the ShiftKar logo and PWA icons as PNG files.
 * Pure Node (zlib + manual PNG encoding) — no dependencies.
 * Run: node scripts/generate-assets.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------- PNG encoding ---------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------- Canvas helpers ---------------- */

function canvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}

function blendPixel(c, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= c.size || y >= c.size) return;
  const i = (y * c.size + x) * 4;
  const da = c.data[i + 3] / 255;
  const sa = a / 255;
  const outA = sa + da * (1 - sa);
  if (outA === 0) return;
  c.data[i] = Math.round((r * sa + c.data[i] * da * (1 - sa)) / outA);
  c.data[i + 1] = Math.round((g * sa + c.data[i + 1] * da * (1 - sa)) / outA);
  c.data[i + 2] = Math.round((b * sa + c.data[i + 2] * da * (1 - sa)) / outA);
  c.data[i + 3] = Math.round(outA * 255);
}

function insideRoundRect(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x1 - r, px));
  const cy = Math.max(y0 + r, Math.min(y1 - r, py));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function fillCircle(c, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++)
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++)
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r2) blendPixel(c, x, y, color);
}

function ring(c, cx, cy, rOuter, rInner, color) {
  for (let y = Math.floor(cy - rOuter); y <= Math.ceil(cy + rOuter); y++)
    for (let x = Math.floor(cx - rOuter); x <= Math.ceil(cx + rOuter); x++) {
      const d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
      if (d2 <= rOuter * rOuter && d2 >= rInner * rInner) blendPixel(c, x, y, color);
    }
}

function line(c, x0, y0, x1, y1, width, color) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  const r = width / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, color);
  }
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/* ---------------- Icon drawing ---------------- */

function drawIcon(size, { rounded = true, maskable = false } = {}) {
  const c = canvas(size);
  const s = size;

  const x0 = rounded ? s * 0.08 : 0;
  const y0 = rounded ? s * 0.08 : 0;
  const x1 = s - x0;
  const y1 = s - y0;
  const radius = rounded ? s * 0.2 : 0;

  // Vertical gradient background (day-sky blue -> deep blue)
  const top = [143, 178, 255];
  const bottom = [47, 86, 214];
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const col = [lerp(top[0], bottom[0], t), lerp(top[1], bottom[1], t), lerp(top[2], bottom[2], t), 255];
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      if (!rounded || insideRoundRect(x + 0.5, y + 0.5, x0, y0, x1, y1, radius))
        blendPixel(c, x, y, col);
    }
  }

  // Day/night clock motif (maskable icons keep the motif inside the safe zone)
  const scale = maskable ? 0.6 : 0.74;
  const cx = s / 2;
  const cy = s / 2;
  const rOuter = s * 0.5 * scale;
  const rInner = rOuter - s * 0.05 * (maskable ? 1.2 : 1);

  // Inner face: right half amber (day), left half deep indigo (night)
  for (let y = Math.floor(cy - rInner); y <= Math.ceil(cy + rInner); y++) {
    for (let x = Math.floor(cx - rInner); x <= Math.ceil(cx + rInner); x++) {
      const d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
      if (d2 > rInner * rInner) continue;
      if (x + 0.5 >= cx) blendPixel(c, x, y, [255, 195, 77, 255]);
      else blendPixel(c, x, y, [31, 44, 110, 255]);
    }
  }

  ring(c, cx, cy, rOuter, rInner, [255, 255, 255, 255]);

  const hw = s * 0.026;
  line(c, cx, cy, cx + rInner * 0.42, cy - rInner * 0.55, hw, [255, 255, 255, 255]); // hour hand
  line(c, cx, cy, cx - rInner * 0.55, cy + rInner * 0.3, hw * 0.82, [255, 255, 255, 255]); // minute hand
  fillCircle(c, cx, cy, hw * 1.2, [255, 255, 255, 255]);

  return c;
}

/* ---------------- Output ---------------- */

const files = [
  { path: "assets/logo.png", size: 512, opts: { rounded: true } },
  { path: "assets/icons/icon-192.png", size: 192, opts: { rounded: true } },
  { path: "assets/icons/icon-512.png", size: 512, opts: { rounded: true } },
  { path: "assets/icons/icon-maskable-512.png", size: 512, opts: { rounded: false, maskable: true } },
  { path: "assets/icons/apple-touch-icon.png", size: 180, opts: { rounded: false } },
];

for (const f of files) {
  const c = drawIcon(f.size, f.opts);
  const out = join(root, f.path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodePng(f.size, c.data));
  console.log("wrote", f.path, `(${f.size}x${f.size})`);
}
