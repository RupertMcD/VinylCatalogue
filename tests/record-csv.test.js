import { test, assert, assertEqual, assertDeepEqual } from './test-runner.js';
import { recordsToCsv, exportFileName, CSV_COLUMNS, protectCell, unprotectCell } from '../models/record-csv.js';
import { parseCsv } from '../utils/csv.js';
import { createRecord } from '../models/record.js';

const record = createRecord({
  id: 'r1',
  artist: 'Björk',
  title: 'Debut',
  year: 1993,
  label: 'One Little Indian',
  format: 'LP',
  vinylGrade: 'VG+',
  sleeveGrade: 'NM',
  pricePaid: 12.5,
  dateAdded: '2026-11-14T10:30:00.000Z',
  notes: 'Bought at "Rough Trade", gatefold\nSecond line',
  barcode: '5016958997028',
  discogsId: '12345',
  coverImage: 'https://i.discogs.com/example.jpg',
});

test('export: the first row names every field', () => {
  const [header] = parseCsv(recordsToCsv([record]));
  assertDeepEqual(header, CSV_COLUMNS);
});

test('export: one row per record, with every field', () => {
  const rows = parseCsv(recordsToCsv([record, { ...record, id: 'r2', year: null, pricePaid: null }]));
  assertEqual(rows.length, 3);
  assertDeepEqual(rows[1], [
    'r1', 'Björk', 'Debut', '1993', 'One Little Indian', 'LP', 'VG+', 'NM', '12.50',
    '2026-11-14T10:30:00.000Z', 'Bought at "Rough Trade", gatefold\nSecond line',
    '5016958997028', '12345', 'https://i.discogs.com/example.jpg',
  ]);
  assertEqual(rows[2][3], '', 'no year');
  assertEqual(rows[2][8], '', 'no price');
});

test('export: starts with a BOM so Excel reads accents', () => {
  assertEqual(recordsToCsv([]).charCodeAt(0), 0xfeff);
});

test('export: an empty collection still has the header row', () => {
  assertEqual(parseCsv(recordsToCsv([])).length, 1);
});

test('export: text a spreadsheet would run as a formula is made safe', () => {
  assertEqual(protectCell('=HYPERLINK("x")'), '\'=HYPERLINK("x")');
  assertEqual(protectCell('-1 crackle on side B'), "'-1 crackle on side B");
  assertEqual(protectCell('Fine'), 'Fine');
  const rows = parseCsv(recordsToCsv([{ ...record, notes: '=1+1' }]));
  assertEqual(rows[1][10], "'=1+1");
});

test('export: made-safe text comes back exactly on import', () => {
  for (const text of ['=1+1', '+44 sticker', '-1 crackle', '@home', 'plain', "'quoted"]) {
    assertEqual(unprotectCell(protectCell(text)), text);
  }
});

test('export: the file name has today\'s date', () => {
  assertEqual(exportFileName(new Date(2026, 10, 4)), 'vinyl-catalogue-2026-11-04.csv');
});

test('export: photos picked on the phone are kept whole', () => {
  const photo = `data:image/jpeg;base64,${'A'.repeat(50000)}`;
  const rows = parseCsv(recordsToCsv([{ ...record, coverImage: photo }]));
  assert(rows[1][13] === photo, 'photo should round-trip unchanged');
});
