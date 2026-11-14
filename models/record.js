// What a record is: its fields, the allowed values, and checks.

import { normaliseShelves } from './shelves.js';

export const FORMATS = ['LP', '12"', '7"', 'Box set'];

// Which list a record is on: owned, or wanted.
export const LISTS = ['collection', 'wishlist'];

// Goldmine grading scale, best to worst.
export const GRADES = [
  { code: 'M', name: 'Mint' },
  { code: 'NM', name: 'Near Mint' },
  { code: 'VG+', name: 'Very Good Plus' },
  { code: 'VG', name: 'Very Good' },
  { code: 'G+', name: 'Good Plus' },
  { code: 'G', name: 'Good' },
  { code: 'F', name: 'Fair' },
  { code: 'P', name: 'Poor' },
];

export const GRADE_CODES = GRADES.map((grade) => grade.code);

export const EARLIEST_YEAR = 1900;

export function gradeName(code) {
  const grade = GRADES.find((g) => g.code === code);
  return grade ? grade.name : '';
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

// "1975" -> 1975, "" -> null, "abc" -> NaN (so the check can reject it).
export function parseYear(value) {
  if (value == null || text(value) === '') return null;
  if (typeof value === 'number') return value;
  return /^\d+$/.test(text(value)) ? Number(text(value)) : NaN;
}

// "£12.50", "12,5" or 12.5 -> 12.5; "" -> null; "abc" -> NaN.
export function parsePrice(value) {
  if (value == null || text(value) === '') return null;
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  const cleaned = text(value).replace(/[£\s]/g, '').replace(',', '.');
  if (!/^\d*\.?\d+$/.test(cleaned)) return NaN;
  return Math.round(Number(cleaned) * 100) / 100;
}

function newId() {
  return crypto.randomUUID();
}

// Builds a complete record from partial details, filling in defaults.
// Used for new records, edits and (later) imports and upgrades.
export function createRecord(input = {}, { now = new Date(), makeId = newId } = {}) {
  return {
    id: text(input.id) || makeId(),
    artist: text(input.artist),
    title: text(input.title),
    year: parseYear(input.year),
    label: text(input.label),
    format: FORMATS.includes(input.format) ? input.format : 'LP',
    vinylGrade: text(input.vinylGrade),
    sleeveGrade: text(input.sleeveGrade),
    pricePaid: parsePrice(input.pricePaid),
    dateAdded: text(input.dateAdded) || now.toISOString(),
    notes: input.notes == null ? '' : String(input.notes).trim(),
    barcode: text(input.barcode),
    discogsId: text(input.discogsId),
    coverImage: text(input.coverImage),
    list: LISTS.includes(input.list) ? input.list : 'collection',
    shelves: normaliseShelves(input.shelves),
    shopLink: text(input.shopLink),
  };
}

// Brings a record saved by an older version of the app up to date by
// adding any missing fields. Everything already there is kept as it is.
export function upgradeRecord(record) {
  return {
    ...record,
    list: LISTS.includes(record.list) ? record.list : 'collection',
    shelves: normaliseShelves(record.shelves),
    shopLink: text(record.shopLink),
  };
}

// Only ordinary web addresses are allowed as shop links.
export function isWebAddress(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// Checks a record. Returns { valid, errors } where errors maps a field
// name to a friendly message.
export function validateRecord(record, { now = new Date() } = {}) {
  const errors = {};
  const latestYear = now.getFullYear() + 1;

  if (!record.artist) errors.artist = 'Enter the artist.';
  if (!record.title) errors.title = 'Enter the title.';

  if (record.year !== null) {
    if (!Number.isInteger(record.year) || record.year < EARLIEST_YEAR || record.year > latestYear) {
      errors.year = `Enter a year between ${EARLIEST_YEAR} and ${latestYear}, like 1975.`;
    }
  }

  if (!FORMATS.includes(record.format)) errors.format = 'Choose a format.';

  if (record.vinylGrade && !GRADE_CODES.includes(record.vinylGrade)) {
    errors.vinylGrade = 'Choose a grade from the list.';
  }
  if (record.sleeveGrade && !GRADE_CODES.includes(record.sleeveGrade)) {
    errors.sleeveGrade = 'Choose a grade from the list.';
  }

  if (record.pricePaid !== null && !(Number.isFinite(record.pricePaid) && record.pricePaid >= 0)) {
    errors.pricePaid = 'Enter a price like 12.50.';
  }

  if (record.shopLink && !isWebAddress(record.shopLink)) {
    errors.shopLink = 'Enter a web address starting with https://';
  }

  if (Number.isNaN(Date.parse(record.dateAdded))) {
    errors.dateAdded = 'Choose the date it was added.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
