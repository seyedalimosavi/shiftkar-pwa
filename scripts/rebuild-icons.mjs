/**
 * Rebuilds ALL PWA icons + the splash logo from the source artwork.
 *
 *  - public/assets/icon.png  (1024×1024 RGB)  → navy full-bleed tiles
 *
 * The source is a cream tile with the brand mark (two curved arrows around a
 * cream clock medallion). Browsers show the splash/launcher icon on the
 * manifest's `background_color`; a cream tile on the dark navy splash reads
 * as a white box — the complaint. So every output becomes a NAVY full-bleed
 * tile (#101830 — the manifest background_color): the mark (arrows +
 * medallion + clock) keeps its colors, the surrounding cream becomes navy.
 * Result: the installed-app launch splash is a seamless navy canvas in dark
 * mode, and the launcher icon is the classic full-bleed navy artwork.
 *
 * The colored mark is measured per-output (saturation-based bounding box),
 * then scaled:
 *  - 'any' icons: mark fits ~86% of the tile (browser-safe padding);
 *  - maskable:    mark tangent to the maskable safe zone (d = 80% of the
 *                 canvas), auto-refined so no ink pokes out of the circle —
 *                 the largest size no launcher can crop.
 *
 * Pure Node (zlib + manual PNG encode/decode) — no dependencies.
 * Run: node scripts/rebuild-icons.mjs
 */
import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------- PNG encode (RGBA) ---------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])));
  return Buffer.concat([len, Buffer.from(type, "ascii"), data, crcBuf]);
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
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------- PNG decode (8-bit RGB or RGBA) ---------------- */

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6))
    throw new Error(`unsupported PNG: bitDepth=${bitDepth} colorType=${colorType}`);
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = y * stride, prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const rb = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[row + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = y > 0 && x >= bpp ? out[prev + x - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = rb; break;
        case 1: v = rb + a; break;
        case 2: v = rb + b; break;
        case 3: v = rb + ((a + b) >> 1); break;
        case 4: v = rb + paeth(a, b, c); break;
        default: throw new Error("bad filter");
      }
      out[row + x] = v & 0xff;
    }
  }
  return { width, height, bpp, px: out };
}

/* ---------------- bilinear sample ---------------- */

function makeSampler(img) {
  const { width, height, bpp, px } = img;
  return (x, y, ch) => {
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    const i00 = (y0 * width + x0) * bpp + ch;
    const i10 = (y0 * width + x1) * bpp + ch;
    const i01 = (y1 * width + x0) * bpp + ch;
    const i11 = (y1 * width + x1) * bpp + ch;
    const top = px[i00] * (1 - fx) + px[i10] * fx;
    const bot = px[i01] * (1 - fx) + px[i11] * fx;
    return top * (1 - fy) + bot * fy;
  };
}

/* ---------------- build ---------------- */

const NAVY = [16, 24, 48]; // #101830 — manifest background_color
const src = decodePng(readFileSync(join(root, "public/assets/icon.png")));
const S = src.width;
const sample = makeSampler(src);
console.log(`source: ${S}x${S}, bpp=${src.bpp}`);

const isColored = (r, g, b) =>
  Math.abs(r - g) > 18 || Math.abs(g - b) > 18 || Math.abs(r - b) > 18;

// The navy tile itself is NOT ink — exclude it from ink-distance checks.
const isNavy = (r, g, b) =>
  Math.abs(r - NAVY[0]) < 14 && Math.abs(g - NAVY[1]) < 14 && Math.abs(b - NAVY[2]) < 14;

const isInk = (r, g, b) => !isNavy(r, g, b) && isColored(r, g, b);

// Colored-mark bounding box (the arrows + clock; the cream medallion sits
// inside this ring, so it is preserved along with the ink).
let gl = S, gr = -1, gt = S, gb = -1;
for (let y = 0; y < S; y += 2) {
  for (let x = 0; x < S; x += 2) {
    if (isColored(sample(x, y, 0), sample(x, y, 1), sample(x, y, 2))) {
      if (x < gl) gl = x;
      if (x > gr) gr = x;
      if (y < gt) gt = y;
      if (y > gb) gb = y;
    }
  }
}
const gw = gr - gl + 1, gh = gb - gt + 1;
console.log(`mark bbox: x ${gl}..${gr} (w=${gw})  y ${gt}..${gb} (h=${gh})`);

/** Build one tile: navy background + the mark scaled by `scale`, with the
 *  mark centered. Pixels inside the mark bbox keep their source color
 *  (arrows, cream medallion, clock); everything else is navy. */
function rasterize(M, scale) {
  const buf = Buffer.alloc(M * M * 4);
  const ox = (M - gw * scale) / 2 - gl * scale;
  const oy = (M - gh * scale) / 2 - gt * scale;
  for (let y = 0; y < M; y++) {
    for (let x = 0; x < M; x++) {
      const i = (y * M + x) * 4;
      const sx = (x - ox) / scale;
      const sy = (y - oy) / scale;
      const inMark =
        sx >= gl - 1 && sx <= gr + 1 && sy >= gt - 1 && sy <= gb + 1;
      if (inMark) {
        buf[i] = Math.round(sample(sx, sy, 0));
        buf[i + 1] = Math.round(sample(sx, sy, 1));
        buf[i + 2] = Math.round(sample(sx, sy, 2));
        buf[i + 3] = 255;
      } else {
        buf[i] = NAVY[0];
        buf[i + 1] = NAVY[1];
        buf[i + 2] = NAVY[2];
        buf[i + 3] = 255;
      }
    }
  }
  return buf;
}

function writeIcon(path, size, scale, label) {
  const out = join(root, path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodePng(size, rasterize(size, scale)));
  console.log(`wrote ${path} (${size}x${size}, scale=${scale.toFixed(3)}) ${label}`);
}

/* 'any' icons + logo: mark fits ~86% of the tile — large and full-bleed,
   with padding for launchers that don't crop (browser dialog, taskbar…). */
const anyScale = (size) => (size * 0.86) / Math.max(gw, gh);

writeIcon("public/assets/logo.png", 512, anyScale(512), "(splash/about logo)");
writeIcon("public/assets/icons/icon-192.png", 192, anyScale(192), "");
writeIcon("public/assets/icons/icon-512.png", 512, anyScale(512), "");
writeIcon("public/assets/icons/apple-touch-icon.png", 180, anyScale(180), "");

/* Maskable 512: mark tangent to the safe-zone circle (d = 80% of canvas),
   auto-refined so no ink pokes out (arrow tips bulge past the bbox). */
const M = 512;
const SAFE_R = M * 0.4 - 1;
let scale = (M * 0.8) / Math.max(gw, gh);
let out;
for (let iter = 0; iter < 6; iter++) {
  out = rasterize(M, scale);
  const c = (M - 1) / 2;
  let maxD = 0;
  for (let y = 0; y < M; y++) {
    for (let x = 0; x < M; x++) {
      const i = (y * M + x) * 4;
      if (isInk(out[i], out[i + 1], out[i + 2])) {
        const d = Math.hypot(x - c, y - c);
        if (d > maxD) maxD = d;
      }
    }
  }
  console.log(`maskable iter ${iter}: scale=${scale.toFixed(3)} maxInk=${maxD.toFixed(1)} (safe ${SAFE_R.toFixed(1)})`);
  if (maxD <= SAFE_R) break;
  scale *= (SAFE_R / maxD) * 0.999;
}

const maskablePath = join(root, "public/assets/icons/icon-maskable-512.png");
writeFileSync(maskablePath, encodePng(M, out));
console.log("wrote public/assets/icons/icon-maskable-512.png (512x512, maskable)");
