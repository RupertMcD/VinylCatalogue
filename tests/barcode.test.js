import { test, assert, assertEqual, assertDeepEqual } from './test-runner.js';
import { cleanBarcode, checkBarcode, sameBarcode, barcodeSearchForms, expandUpcE } from '../utils/barcode.js';

test('barcode: spaces and dashes are removed', () => {
  assertEqual(cleanBarcode(' 5 012394-144777 '), '5012394144777');
  assertEqual(cleanBarcode(null), '');
});

test('barcode: a correct EAN-13 is accepted', () => {
  const result = checkBarcode('5 012394 144777');
  assert(result.valid, result.error);
  assertEqual(result.digits, '5012394144777');
});

test('barcode: a correct 12-digit UPC is accepted', () => {
  assert(checkBarcode('075678263927').valid);
});

test('barcode: a correct EAN-8 is accepted', () => {
  assert(checkBarcode('96385074').valid);
});

test('barcode: a correct UPC-E is accepted', () => {
  assertEqual(expandUpcE('04252614'), '042100005264');
  assert(checkBarcode('04252614').valid);
});

test('barcode: a mistyped number is caught', () => {
  const result = checkBarcode('5012394144778');
  assert(!result.valid);
  assert(result.error.includes("doesn't add up"), result.error);
});

test('barcode: the wrong length gets a friendly message', () => {
  const result = checkBarcode('12345');
  assert(!result.valid);
  assert(result.error.includes('has 5'), result.error);
});

test('barcode: an empty barcode asks for numbers', () => {
  assert(!checkBarcode('  ').valid);
});

test('barcode: the same UPC with and without a leading 0 match', () => {
  assert(sameBarcode('075678263927', '0075678263927'));
  assert(sameBarcode('5 012394 144777', '5012394144777'));
  assert(!sameBarcode('5012394144777', '5012394144770'));
  assert(!sameBarcode('', ''));
});

test('barcode: search tries the other common forms', () => {
  assertDeepEqual(barcodeSearchForms('075678263927'), ['075678263927', '0075678263927']);
  assertDeepEqual(barcodeSearchForms('0075678263927'), ['0075678263927', '075678263927']);
  assertDeepEqual(barcodeSearchForms('5012394144777'), ['5012394144777']);
});
