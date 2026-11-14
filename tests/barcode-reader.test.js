// Draws real EAN-13 barcodes on a canvas and checks the scanner reads them.

import { test, assertEqual } from './test-runner.js';
import { readBarcodeFrom } from '../utils/barcode-reader.js';

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = L.map((pattern) => [...pattern].map((bit) => (bit === '0' ? '1' : '0')).join(''));
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function drawEan13(code) {
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (PARITY[+code[0]][i - 1] === 'L' ? L : G)[+code[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[+code[i]];
  bits += '101';

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 220;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const unit = 5;
  const left = (canvas.width - unit * bits.length) / 2;
  context.fillStyle = '#000';
  [...bits].forEach((bit, i) => {
    if (bit === '1') context.fillRect(left + i * unit, 20, unit, canvas.height - 40);
  });
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

test('scanner: reads an EAN-13 barcode', async () => {
  assertEqual(await readBarcodeFrom(drawEan13('5012394144777')), '5012394144777');
});

test('scanner: reads a UPC-A barcode (an EAN-13 starting with 0)', async () => {
  const digits = await readBarcodeFrom(drawEan13('0075678263927'));
  assertEqual(digits.replace(/^0/, ''), '075678263927');
});

test('scanner: a picture with no barcode gives nothing', async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  assertEqual(await readBarcodeFrom(canvas.getContext('2d').getImageData(0, 0, 200, 100)), '');
});
