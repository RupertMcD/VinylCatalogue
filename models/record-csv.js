// Records to CSV (the backup file) and, in import, CSV back to records.
// One row per record, one column per field.

import { toCsv, parseCsv } from '../utils/csv.js';
import { createRecord, validateRecord, FORMATS, GRADE_CODES } from './record.js';
import { normaliseText } from '../utils/search.js';

export const CSV_COLUMNS = [
  'id', 'artist', 'title', 'year', 'label', 'format', 'vinylGrade', 'sleeveGrade',
  'pricePaid', 'dateAdded', 'notes', 'barcode', 'discogsId', 'coverImage',
];

// Spreadsheets treat text starting with = + - @ as a formula, which can be
// dangerous. Such values get a leading apostrophe in the file, which is
// removed again on import.
const FORMULA_START = /^[=+\-@\t\r]/;

export function protectCell(text) {
  return FORMULA_START.test(text) ? `'${text}` : text;
}

export function unprotectCell(text) {
  return /^'[=+\-@\t\r]/.test(text) ? text.slice(1) : text;
}

function exportValue(record, column) {
  const value = record[column];
  if (column === 'year') return Number.isInteger(value) ? String(value) : '';
  if (column === 'pricePaid') return Number.isFinite(value) ? value.toFixed(2) : '';
  return protectCell(value == null ? '' : String(value));
}

// The whole backup file. Starts with a "BOM" marker so Excel reads accents
// (like the ö in Björk) correctly.
export function recordsToCsv(records) {
  const rows = [CSV_COLUMNS, ...records.map((record) => CSV_COLUMNS.map((column) => exportValue(record, column)))];
  return `\uFEFF${toCsv(rows)}`;
}

// e.g. vinyl-catalogue-2026-11-14.csv (using the phone's own date).
export function exportFileName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `vinyl-catalogue-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;
}

// ---- Import -------------------------------------------------------------

// Column names are matched loosely, so "Vinyl Grade" or "vinyl_grade" also
// work (for example in a file made by hand in a spreadsheet).
const HEADER_ALIASES = {
  id: 'id', recordid: 'id',
  artist: 'artist',
  title: 'title',
  year: 'year',
  label: 'label',
  format: 'format',
  vinylgrade: 'vinylGrade', vinyl: 'vinylGrade',
  sleevegrade: 'sleeveGrade', sleeve: 'sleeveGrade',
  pricepaid: 'pricePaid', price: 'pricePaid',
  dateadded: 'dateAdded', added: 'dateAdded',
  notes: 'notes',
  barcode: 'barcode',
  discogsid: 'discogsId', discogs: 'discogsId',
  coverimage: 'coverImage', cover: 'coverImage',
};

export function headerToField(header) {
  return HEADER_ALIASES[String(header ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')] || null;
}

// "lp" -> "LP", "box set" -> "Box set"; anything else is left as typed.
function matchFrom(list, value) {
  const wanted = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  return list.find((item) => item.toLowerCase() === wanted) ?? String(value).trim();
}

const GRADE_LIST = GRADE_CODES.join(', ');

function importMessage(field, raw) {
  const value = `“${raw}”`;
  switch (field) {
    case 'artist': return 'The artist is missing.';
    case 'title': return 'The title is missing.';
    case 'year': return `The year ${value} isn't a year like 1975.`;
    case 'vinylGrade': return `The vinyl grade ${value} isn't on the Goldmine scale (${GRADE_LIST}).`;
    case 'sleeveGrade': return `The sleeve grade ${value} isn't on the Goldmine scale (${GRADE_LIST}).`;
    case 'pricePaid': return `The price ${value} isn't a price like 12.50.`;
    case 'dateAdded': return `The date added ${value} isn't a date.`;
    default: return `The ${field} ${value} isn't valid.`;
  }
}

// Reads a CSV backup. Returns { fileError } if the file can't be used at all,
// otherwise { rows: [{ line, record, hadId, errors }] }. `line` is the row
// number as a spreadsheet shows it (the header is row 1).
export function readRecordsCsv(text, options = {}) {
  let table;
  try {
    table = parseCsv(text);
  } catch (error) {
    return { fileError: error.message };
  }
  if (table.length === 0) return { fileError: 'This file is empty.' };

  const fields = table[0].map(headerToField);
  if (!fields.includes('artist') || !fields.includes('title')) {
    return { fileError: "This doesn't look like a Vinyl Catalogue backup. It needs Artist and Title columns." };
  }

  const rows = [];
  table.slice(1).forEach((cells, index) => {
    const values = {};
    fields.forEach((field, column) => {
      if (field && values[field] === undefined) values[field] = unprotectCell(String(cells[column] ?? '')).trim();
    });
    if (Object.values(values).every((value) => value === '')) return; // A blank row.

    const extraErrors = [];
    if (values.format) {
      values.format = matchFrom(FORMATS, values.format);
      if (!FORMATS.includes(values.format)) {
        extraErrors.push(`Format “${values.format}” isn't one of ${FORMATS.join(', ')}.`);
      }
    }
    for (const grade of ['vinylGrade', 'sleeveGrade']) {
      if (values[grade]) values[grade] = matchFrom(GRADE_CODES, values[grade]);
    }

    const record = createRecord(values, options);
    const { errors } = validateRecord(record, options);
    // Say what's wrong with the row, using what was in the file.
    const messages = [...extraErrors, ...Object.keys(errors)
      .filter((key) => key !== 'format') // Already explained above.
      .map((key) => importMessage(key, values[key]))];
    rows.push({ line: index + 2, record, hadId: Boolean(values.id), errors: messages });
  });

  if (rows.length === 0) return { fileError: 'This file has no records in it.' };
  return { rows };
}

// Two records without IDs are the same if all of these match.
function sameRecordKey(record) {
  return [
    normaliseText(record.artist), normaliseText(record.title), record.year ?? '',
    record.format, String(record.discogsId).trim(), String(record.barcode).replace(/\D/g, ''),
  ].join('|');
}

// Decides what an import will do, without changing anything.
// Returns { toAdd: [record], alreadyHave: [{ line, record }], problems: [{ line, record, errors }] }.
export function planImport(rows, existingRecords) {
  const ids = new Set(existingRecords.map((record) => record.id));
  const keys = new Set(existingRecords.map(sameRecordKey));
  const plan = { toAdd: [], alreadyHave: [], problems: [] };

  for (const row of rows) {
    if (row.errors.length > 0) {
      plan.problems.push({ line: row.line, record: row.record, errors: row.errors });
      continue;
    }
    const key = sameRecordKey(row.record);
    const known = row.hadId ? ids.has(row.record.id) : keys.has(key);
    if (known) {
      plan.alreadyHave.push({ line: row.line, record: row.record });
      continue;
    }
    // Also catches the same record twice in one file.
    ids.add(row.record.id);
    keys.add(key);
    plan.toAdd.push(row.record);
  }
  return plan;
}
