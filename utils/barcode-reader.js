// Reads a record barcode from a camera picture. This is the only file that
// uses the zxing-wasm library (in vendor/), so it's easy to swap later,
// for example if Safari gets its own barcode reader.

import { prepareZXingModule, readBarcodes } from '../vendor/zxing-wasm/es/reader/index.js';
import { checkBarcode } from './barcode.js';

// Use our own copy of the scanning engine, never another website's.
const WASM_URL = new URL('../vendor/zxing-wasm/reader/zxing_reader.wasm', import.meta.url).href;

let ready = null;

// Loads the scanning engine (about 1 MB, saved for offline use).
export function loadBarcodeReader() {
  if (!ready) {
    ready = Promise.resolve(prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) => (path.endsWith('.wasm') ? WASM_URL : prefix + path),
      },
      fireImmediately: true,
    })).catch((error) => {
      ready = null;
      console.error(error);
      throw new Error("The barcode scanner couldn't start. You can type the barcode instead.");
    });
  }
  return ready;
}

// Returns the barcode's digits, or '' if none could be read.
// `image` is ImageData (from a canvas) or an image file.
export async function readBarcodeFrom(image) {
  await loadBarcodeReader();
  const results = await readBarcodes(image, {
    formats: ['EANUPC'], // EAN-13, EAN-8, UPC-A and UPC-E: the ones records use.
    tryHarder: true,
    maxNumberOfSymbols: 1,
  });
  for (const result of results) {
    if (!result.isValid) continue;
    const { valid, digits } = checkBarcode(result.text);
    if (valid) return digits;
  }
  return '';
}
