/**
 * Verifies the vendored OCR assets actually recognise text and that the result flows
 * through the real analysis engine.
 *
 *   npm run check:ocr -- path/to/image.png
 *
 * Node runs its own worker build, so what this proves is the vendored language data
 * and the engine's recognition, plus the handoff into the analysis engine. The browser
 * worker and WASM core in `public/ocr` are exercised by the browser itself.
 */
import { createWorker } from 'tesseract.js';
import { analyze } from '../lib/analysis/index.ts';

const image = process.argv[2];
if (!image) {
  console.error('usage: node --conditions=react-server scripts/check-ocr.mjs <image>');
  process.exit(1);
}

// The worker and WASM core in public/ocr are browser builds, so Node uses its own.
// `langPath` is pointed at the vendored language data, which is the part this script
// is here to prove: the same eng.traineddata.gz the browser downloads from this origin.
const ocrDir = new URL('../public/ocr/', import.meta.url).pathname;
const worker = await createWorker('eng', 1, { langPath: ocrDir, gzip: true });
const { data } = await worker.recognize(image);
await worker.terminate();

const text = (data.text ?? '').replace(/\n{3,}/g, '\n\n').trim();
console.log('--- extracted ---');
console.log(text || '(nothing readable — the app says so rather than guessing)');

const result = analyze({ kind: 'image', content: text });
console.log('--- analysed ---');
console.log('outcome :', result.outcome);
console.log('headline:', result.headline);
console.log('claim   :', result.claimType);
console.log('rules   :', result.findings.map((f) => f.code).join(', ') || '(none)');
