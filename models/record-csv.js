// Records to CSV (the backup file) and, in import, CSV back to records.
// One row per record, one column per field.

import { toCsv } from '../utils/csv.js';

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
  return `﻿${toCsv(rows)}`;
}

// e.g. vinyl-catalogue-2026-11-14.csv (using the phone's own date).
export function exportFileName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `vinyl-catalogue-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;
}
