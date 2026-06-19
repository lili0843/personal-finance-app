const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x >= x0 + r && x <= x1 - r && y >= y0 && y <= y1) return true;
  if (x >= x0 && x <= x1 && y >= y0 + r && y <= y1 - r) return true;
  const cs = [[x0+r,y0+r],[x1-r,y0+r],[x0+r,y1-r],[x1-r,y1-r]];
  for (const [cx, cy] of cs) if ((x-cx)**2 + (y-cy)**2 <= r*r) return true;
  return false;
}
function makePNG(size) {
  const bg = [79, 70, 229];      // indigo-600
  const white = [255, 255, 255];
  const accent = [199, 210, 254]; // indigo-200
  const cx0 = size*0.21, cy0 = size*0.34, cx1 = size*0.79, cy1 = size*0.66, r = size*0.06;
  const stripeY0 = size*0.40, stripeY1 = size*0.455; // top stripe
  const raw = Buffer.alloc((size*3 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter
    for (let x = 0; x < size; x++) {
      let col = bg;
      if (inRoundRect(x, y, cx0, cy0, cx1, cy1, r)) {
        col = (y >= stripeY0 && y <= stripeY1 && x >= cx0 && x <= cx1) ? accent : white;
      }
      raw[p++] = col[0]; raw[p++] = col[1]; raw[p++] = col[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const pub = path.join(__dirname, 'public');
if (!fs.existsSync(pub)) fs.mkdirSync(pub);
fs.writeFileSync(path.join(pub, 'icon-192.png'), makePNG(192));
fs.writeFileSync(path.join(pub, 'icon-512.png'), makePNG(512));
fs.writeFileSync(path.join(pub, 'icon-maskable-512.png'), makePNG(512));
console.log('icons generated');
