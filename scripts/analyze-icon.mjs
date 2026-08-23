import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";

const buf = readFileSync("public/assets/icons/icon-512.png");
let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
const idat = [];
while (off + 8 <= buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString("ascii", off + 4, off + 8);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
  else if (type === "IDAT") idat.push(data);
  else if (type === "IEND") break;
  off += 12 + len;
}
console.log("size:", width, "x", height, "bitDepth:", bitDepth, "colorType:", colorType);

const bpp = 4, stride = width * bpp;
const raw = inflateSync(Buffer.concat(idat));
const out = Buffer.alloc(height * stride);
const paeth = (a, b, c) => { const p = a + b - c; const pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c); return pa<=pb&&pa<=pc?a:pb<=pc?b:c; };
for (let y = 0; y < height; y++) {
  const filter = raw[y*(stride+1)], row = y*stride, prev = row - stride;
  for (let x = 0; x < stride; x++) {
    const rb = raw[y*(stride+1)+1+x];
    const a = x>=bpp ? out[row+x-bpp] : 0;
    const b = y>0 ? out[prev+x] : 0;
    const c = y>0&&x>=bpp ? out[prev+x-bpp] : 0;
    let v; switch(filter){case 0:v=rb;break;case 1:v=rb+a;break;case 2:v=rb+b;break;case 3:v=rb+((a+b)>>1);break;case 4:v=rb+paeth(a,b,c);break;default:throw new Error("filter"+filter);}
    out[row+x] = v & 0xff;
  }
}
const px = (x,y) => { const i=(y*width+x)*4; return [out[i],out[i+1],out[i+2],out[i+3]]; };
console.log("corners:", px(2,2), px(width-3,2), px(2,height-3), px(width-3,height-3));
console.log("center:", px(256,256));

// scan center axes: first/last near-white pixel = white circle edge
const isWhite = ([r,g,b,a]) => a<10 || (r>245&&g>245&&b>245);
let L=-1,R=-1,T=-1,B=-1;
for(let x=0;x<width;x++){ if(isWhite(px(x,256))){L=x;break;} }
for(let x=width-1;x>=0;x--){ if(isWhite(px(x,256))){R=x;break;} }
for(let y=0;y<height;y++){ if(isWhite(px(256,y))){T=y;break;} }
for(let y=height-1;y>=0;y--){ if(isWhite(px(256,y))){B=y;break;} }
console.log('white circle: x',L,'..',R,'(d=',R-L+1,') y',T,'..',B,'(d=',B-T+1,')');
// colored glyph bounds inside the circle
const isColored = ([r,g,b]) => Math.abs(r-g)>18||Math.abs(g-b)>18||Math.abs(r-b)>18;
let gl=512,gr=-1,gt=512,gb=-1;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(isColored(px(x,y))){if(x<gl)gl=x;if(x>gr)gr=x;if(y<gt)gt=y;if(y>gb)gb=y;}}
console.log('colored glyph bounds:',gl,'..',gr,'x',gt,'..',gb);
// non-white = colored ring/glyph region; white circle edge = just outside
