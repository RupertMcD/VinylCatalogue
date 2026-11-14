// Writing and reading CSV ("comma-separated values"), the plain-text table
// format spreadsheets use. Handles the tricky parts: commas, quotes and
// line breaks inside a value (for example in notes).

const NEEDS_QUOTES = /[",\r\n]|^\s|\s$/;

function cell(value) {
  const text = value == null ? '' : String(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// rows: an array of arrays. Lines end with CRLF, as the CSV standard says.
export function toCsv(rows) {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

// Returns an array of rows (arrays of strings). Blank lines are skipped.
// Throws an Error with a friendly message if a quote is never closed.
export function parseCsv(text) {
  const source = String(text ?? '').replace(/^\uFEFF/, ''); // Excel's "BOM" marker
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;
  let i = 0;

  const endValue = () => { row.push(value); value = ''; };
  const endRow = () => {
    endValue();
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };

  while (i < source.length) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') { value += '"'; i += 2; continue; }
        inQuotes = false;
      } else {
        value += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '"' && value === '') {
      inQuotes = true;
    } else if (ch === ',') {
      endValue();
    } else if (ch === '\r' || ch === '\n') {
      endRow();
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
    } else {
      value += ch;
    }
    i += 1;
  }

  if (inQuotes) throw new Error("This file isn't a complete CSV file: a quote mark is never closed.");
  if (value !== '' || row.length > 0) endRow();
  return rows;
}
