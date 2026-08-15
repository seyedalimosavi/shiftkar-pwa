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

/* ---------------- New app icon drawing ----------------
   Brand mark: a cream tile with a golden-yellow curved arrow over the
   top and a forest-green curved arrow over the right + bottom, forming a
   refresh/sync loop. In the middle, a white rounded tile carries a navy
   clock face (four ticks) whose hands are a checkmark. The mark is drawn
   at size 512 and scaled down, so it stays crisp at every icon size. */

const BRAND = {
  cream: [247, 245, 238, 255], // #F7F5EE
  yellow: [244, 180, 26, 255], // #F4B41A
  green: [18, 144, 72, 255], // #129048
  navy: [16, 24, 48, 255], // #101830
  white: [255, 255, 255, 255],
};

/** Thick arc stroke from angle a0 to a1 (degrees; 0=right, 90=down). */
function arcStroke(c, cx, cy, radius, width, color, a0, a1) {
  const span = a1 - a0;
  const total = span > 0 ? span : span + 360;
  const steps = Math.max(10, Math.ceil(total / 1.2));
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + (total * i) / steps) * Math.PI) / 180;
    fillCircle(c, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, width / 2, color);
  }
}

/** V-shaped arrowhead at (px,py) pointing along (dx,dy). */
function arrowhead(c, px, py, dx, dy, len, width, color) {
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const bx = px - ux * len;
  const by = py - uy * len;
  line(c, px, py, bx - uy * width * 0.5, by + ux * width * 0.5, width * 0.42, color);
  line(c, px, py, bx + uy * width * 0.5, by - ux * width * 0.5, width * 0.42, color);
}

function drawIcon(size, { rounded = true, maskable = false } = {}) {
  const c = canvas(size);
  const s = size;
  const k = s / 512; // scale from the 512 design grid

  const x0 = rounded ? s * 0.08 : 0;
  const y0 = rounded ? s * 0.08 : 0;
  const x1 = s - x0;
  const y1 = s - y0;
  const radius = rounded ? s * 0.2 : 0;

  // Cream tile background
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      if (!rounded || insideRoundRect(x + 0.5, y + 0.5, x0, y0, x1, y1, radius))
        blendPixel(c, x, y, BRAND.cream);
    }
  }

  const cx = 256 * k;
  const cy = 256 * k;
  const R = 168 * k; // loop radius
  const W = 40 * k; // stroke width

  // Golden arrow — top arc, from center-left over the top to the upper-right
  arcStroke(c, cx, cy, R, W, BRAND.yellow, 200, 330);
  const yTipX = cx + Math.cos((330 * Math.PI) / 180) * R;
  const yTipY = cy + Math.sin((330 * Math.PI) / 180) * R;
  arrowhead(c, yTipX, yTipY, 0.707, -0.707, 56 * k, W, BRAND.yellow);

  // Green arrow — right + bottom arc, from the upper-right to the bottom-left
  arcStroke(c, cx, cy, R, W, BRAND.green, 330, 150);
  const gTipX = cx + Math.cos((150 * Math.PI) / 180) * R;
  const gTipY = cy + Math.sin((150 * Math.PI) / 180) * R;
  arrowhead(c, gTipX, gTipY, -1, 0, 52 * k, W, BRAND.green);

  // White rounded center tile with the navy clock + checkmark
  const half = 100 * k;
  const t0 = 256 - half;
  const t1 = 256 + half;
  const tr = 40 * k;
  for (let y = Math.floor(t0); y <= Math.ceil(t1); y++) {
    for (let x = Math.floor(t0); x <= Math.ceil(t1); x++) {
      if (insideRoundRect(x + 0.5, y + 0.5, t0, t0, t1, t1, tr))
        blendPixel(c, x, y, BRAND.white);
    }
  }

  const tw = 13 * k; // tick thickness
  line(c, 256 * k, 178 * k, 256 * k, 200 * k, tw, BRAND.navy); // 12
  line(c, 312 * k, 256 * k, 334 * k, 256 * k, tw, BRAND.navy); // 3
  line(c, 256 * k, 312 * k, 256 * k, 334 * k, tw, BRAND.navy); // 6
  line(c, 178 * k, 256 * k, 200 * k, 256 * k, tw, BRAND.navy); // 9

  const cw = 15 * k; // checkmark stroke width
  line(c, 196 * k, 298 * k, 254 * k, 248 * k, cw, BRAND.navy);
  line(c, 254 * k, 248 * k, 326 * k, 302 * k, cw, BRAND.navy);

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
