const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const MD = fs.readFileSync(path.join(__dirname, '사용설명서.md'), 'utf8');
const FONT = 'C:/Windows/Fonts/malgun.ttf';
const FONT_BOLD = 'C:/Windows/Fonts/malgunbd.ttf';
const OUT = path.join(__dirname, '사용설명서.pdf');

const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
doc.registerFont('kr', FONT);
doc.registerFont('krb', fs.existsSync(FONT_BOLD) ? FONT_BOLD : FONT);
doc.pipe(fs.createWriteStream(OUT));

const PAGE_W = doc.page.width - 56 * 2;
const INK = '#1f2937', SUB = '#6b7280', ACCENT = '#4F46E5', LINE = '#e5e7eb', BG = '#eef2ff';

function inline(t) {
  return t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/<kbd>(.+?)<\/kbd>/g, '$1');
}
// render text with bold segments
function richText(t, opts = {}) {
  const size = opts.size || 10.5;
  const color = opts.color || INK;
  const parts = t.split(/(\*\*.+?\*\*)/g).filter(Boolean);
  parts.forEach((p, i) => {
    const bold = /^\*\*.+\*\*$/.test(p);
    const txt = inline(p);
    doc.font(bold ? 'krb' : 'kr').fontSize(size).fillColor(bold ? ACCENT : color);
    doc.text(txt, { continued: i < parts.length - 1 });
  });
}

function ensure(h) { if (doc.y + h > doc.page.height - 56) doc.addPage(); }

function hr() {
  ensure(16); doc.moveDown(0.3);
  doc.strokeColor(LINE).lineWidth(1).moveTo(56, doc.y).lineTo(56 + PAGE_W, doc.y).stroke();
  doc.moveDown(0.5);
}

function table(rows) {
  const cols = rows[0].length;
  const cw = PAGE_W / cols;
  const pad = 5;
  rows.forEach((row, ri) => {
    // compute row height
    doc.font(ri === 0 ? 'krb' : 'kr').fontSize(9);
    let hMax = 0;
    row.forEach((c) => { const h = doc.heightOfString(inline(c), { width: cw - pad * 2 }); if (h > hMax) hMax = h; });
    const rh = hMax + pad * 2;
    ensure(rh);
    const y0 = doc.y;
    if (ri === 0) { doc.rect(56, y0, PAGE_W, rh).fill(BG); }
    row.forEach((c, ci) => {
      const x = 56 + ci * cw;
      doc.font(ri === 0 ? 'krb' : 'kr').fontSize(9).fillColor(ri === 0 ? ACCENT : INK);
      doc.text(inline(c), x + pad, y0 + pad, { width: cw - pad * 2 });
    });
    doc.strokeColor(LINE).lineWidth(0.5).rect(56, y0, PAGE_W, rh).stroke();
    for (let ci = 1; ci < cols; ci++) { doc.moveTo(56 + ci * cw, y0).lineTo(56 + ci * cw, y0 + rh).stroke(); }
    doc.y = y0 + rh;
  });
  doc.moveDown(0.6);
}

const lines = MD.split('\n');
let i = 0;
while (i < lines.length) {
  let line = lines[i];

  // table
  if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|/.test(lines[i + 1])) {
    const rows = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      }
      i++;
    }
    table(rows);
    continue;
  }

  const t = line.trim();
  if (t === '') { doc.moveDown(0.35); i++; continue; }
  if (/^---+$/.test(t)) { hr(); i++; continue; }

  if (t.startsWith('# ')) {
    ensure(40); doc.moveDown(0.2);
    doc.font('krb').fontSize(21).fillColor(ACCENT).text(inline(t.slice(2)));
    doc.moveDown(0.3);
  } else if (t.startsWith('## ')) {
    ensure(30); doc.moveDown(0.5);
    doc.font('krb').fontSize(15).fillColor(INK).text(inline(t.slice(3)));
    doc.moveDown(0.25);
  } else if (t.startsWith('### ')) {
    ensure(24); doc.moveDown(0.3);
    doc.font('krb').fontSize(12.5).fillColor(INK).text(inline(t.slice(4)));
    doc.moveDown(0.2);
  } else if (t.startsWith('> ')) {
    ensure(24);
    const y0 = doc.y;
    doc.font('kr').fontSize(10).fillColor(SUB);
    const txt = inline(t.slice(2));
    const h = doc.heightOfString(txt, { width: PAGE_W - 16 });
    doc.rect(56, y0 - 2, 3, h + 4).fill(ACCENT);
    doc.fillColor(SUB).text(txt, 56 + 12, y0, { width: PAGE_W - 16 });
    doc.moveDown(0.3);
  } else if (/^[-*]\s+/.test(t)) {
    ensure(18);
    const txt = t.replace(/^[-*]\s+/, '');
    const x0 = 56 + 10;
    doc.font('kr').fontSize(10.5).fillColor(ACCENT).text('•', 56, doc.y, { continued: false, width: 10 });
    doc.moveUp(1);
    doc.x = x0;
    richText(txt, { size: 10.5 });
    doc.x = 56;
  } else if (/^\d+\.\s+/.test(t)) {
    ensure(18);
    const num = t.match(/^(\d+)\./)[1];
    const txt = t.replace(/^\d+\.\s+/, '');
    doc.font('krb').fontSize(10.5).fillColor(ACCENT).text(num + '.', 56, doc.y, { continued: false, width: 18 });
    doc.moveUp(1);
    doc.x = 56 + 20;
    richText(txt, { size: 10.5 });
    doc.x = 56;
  } else {
    ensure(16);
    richText(t, { size: 10.5 });
  }
  i++;
}

doc.end();
console.log('PDF written:', OUT);
