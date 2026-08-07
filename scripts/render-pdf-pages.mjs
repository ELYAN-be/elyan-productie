import fs from 'fs';
import path from 'path';
import { createCanvas, DOMMatrix, Path2D } from '@napi-rs/canvas';
import { fileURLToPath, pathToFileURL } from 'url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

globalThis.DOMMatrix = DOMMatrix;
globalThis.Path2D = Path2D;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'tmp-pdf-qa');
const STANDARD_FONTS = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'standard_fonts') + path.sep;
const files = ['A-dak.pdf', 'B-badkamer.pdf', 'C-keuken.pdf', 'D-vloer.pdf', 'E-schilder.pdf'];

const canvasFactory = {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  },
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
};

async function renderPdf(file) {
  const data = new Uint8Array(fs.readFileSync(path.join(OUT, file)));
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory,
    standardFontDataUrl: pathToFileURL(STANDARD_FONTS).href,
    useSystemFonts: true,
    disableFontFace: false
  }).promise;
  const base = file.replace(/\.pdf$/, '');
  const dir = path.join(OUT, base);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  console.log(file, 'pages', doc.numPages);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.4 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: ctx,
      viewport,
      canvasFactory
    }).promise;
    fs.writeFileSync(path.join(dir, 'page-' + i + '.png'), canvas.toBuffer('image/png'));
  }
  return doc.numPages;
}

const summary = {};
for (const f of files) {
  summary[f] = await renderPdf(f);
}
fs.writeFileSync(path.join(OUT, 'page-counts.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
