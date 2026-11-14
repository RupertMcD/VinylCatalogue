// Barcodes on records: cleaning up what was typed or scanned, checking it
// adds up, and comparing two barcodes that may be written differently.
//
// Records use EAN-13 (13 digits, most of the world), UPC-A (12 digits,
// North America), and occasionally EAN-8 or UPC-E (8 digits).
// The last digit of every barcode is a "check digit" worked out from the
// others, so most typing mistakes can be spotted before searching.

// Keeps only the digits, so "5 012394 144777" becomes "5012394144777".
export function cleanBarcode(text) {
  return String(text ?? '').replace(/\D/g, '');
}

// The standard check-digit sum: from the right (ignoring the check digit),
// digits are weighted 3, 1, 3, 1…
function checkDigitFor(digitsWithoutCheck) {
  let sum = 0;
  [...digitsWithoutCheck].reverse().forEach((digit, i) => {
    sum += Number(digit) * (i % 2 === 0 ? 3 : 1);
  });
  return String((10 - (sum % 10)) % 10);
}

function hasValidCheckDigit(digits) {
  return checkDigitFor(digits.slice(0, -1)) === digits.slice(-1);
}

// UPC-E is a squashed UPC-A. This expands it so its check digit can be tested.
export function expandUpcE(digits) {
  if (!/^[01]\d{7}$/.test(digits)) return '';
  const [system, d1, d2, d3, d4, d5, d6, check] = digits;
  let body;
  if ('012'.includes(d6)) body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === '3') body = `${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === '4') body = `${d1}${d2}${d3}${d4}00000${d5}`;
  else body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${system}${body}${check}`;
}

// Returns { valid, digits, error }. `error` is a friendly message.
export function checkBarcode(text) {
  const digits = cleanBarcode(text);
  if (digits.length === 0) {
    return { valid: false, digits, error: 'Type the numbers under the barcode.' };
  }
  if (![8, 12, 13].includes(digits.length)) {
    return {
      valid: false,
      digits,
      error: `A record barcode is usually 12 or 13 numbers long. This one has ${digits.length}.`,
    };
  }
  const addsUp = digits.length === 8
    ? hasValidCheckDigit(digits) || (expandUpcE(digits) !== '' && hasValidCheckDigit(expandUpcE(digits)))
    : hasValidCheckDigit(digits);
  if (!addsUp) {
    return {
      valid: false,
      digits,
      error: "That barcode doesn't add up. Please check each number.",
    };
  }
  return { valid: true, digits, error: '' };
}

// The same 12-digit UPC is often written as 13 digits with a leading 0, so
// ignore leading zeros when comparing.
export function sameBarcode(a, b) {
  const strip = (value) => cleanBarcode(value).replace(/^0+/, '');
  const left = strip(a);
  return left !== '' && left === strip(b);
}

// The forms worth searching Discogs for, best first.
export function barcodeSearchForms(digits) {
  const forms = [digits];
  if (digits.length === 12) forms.push(`0${digits}`);
  if (digits.length === 13 && digits.startsWith('0')) forms.push(digits.slice(1));
  if (digits.length === 8) {
    const expanded = expandUpcE(digits);
    if (expanded && hasValidCheckDigit(expanded)) forms.push(expanded);
  }
  return forms;
}
