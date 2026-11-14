import { test, assert, assertEqual } from './test-runner.js';
import { createRecord, validateRecord, parsePrice, parseYear, gradeName, GRADE_CODES } from '../models/record.js';

const now = new Date('2026-11-14T10:00:00Z');
const fixed = { now, makeId: () => 'test-id' };

test('new record gets an id and today’s date', () => {
  const record = createRecord({ artist: 'Björk', title: 'Debut' }, fixed);
  assertEqual(record.id, 'test-id');
  assertEqual(record.dateAdded, '2026-11-14T10:00:00.000Z');
});

test('new record keeps an existing id and date', () => {
  const record = createRecord({ id: 'abc', dateAdded: '2020-01-01T00:00:00.000Z', artist: 'A', title: 'B' }, fixed);
  assertEqual(record.id, 'abc');
  assertEqual(record.dateAdded, '2020-01-01T00:00:00.000Z');
});

test('new record has every field, with blanks where nothing was given', () => {
  const record = createRecord({}, fixed);
  const fields = ['id', 'artist', 'title', 'year', 'label', 'format', 'vinylGrade', 'sleeveGrade',
    'pricePaid', 'dateAdded', 'notes', 'barcode', 'discogsId', 'coverImage', 'list', 'shelves', 'shopLink'];
  assertEqual(Object.keys(record).join(','), fields.join(','));
  assertEqual(record.year, null);
  assertEqual(record.pricePaid, null);
  assertEqual(record.format, 'LP');
  assertEqual(record.list, 'collection');
  assertEqual(record.shelves.length, 0);
  assertEqual(record.shopLink, '');
});

test('text is trimmed', () => {
  const record = createRecord({ artist: '  Kate Bush ', title: ' Hounds of Love' }, fixed);
  assertEqual(record.artist, 'Kate Bush');
  assertEqual(record.title, 'Hounds of Love');
});

test('year and price become numbers', () => {
  const record = createRecord({ artist: 'A', title: 'B', year: '1985', pricePaid: '£12.50' }, fixed);
  assertEqual(record.year, 1985);
  assertEqual(record.pricePaid, 12.5);
});

test('price accepts a comma and rounds to pence', () => {
  assertEqual(parsePrice('7,99'), 7.99);
  assertEqual(parsePrice('3.456'), 3.46);
  assertEqual(parsePrice(''), null);
  assert(Number.isNaN(parsePrice('cheap')));
});

test('year rejects words', () => {
  assertEqual(parseYear(' '), null);
  assert(Number.isNaN(parseYear('nineteen')));
});

test('unknown format falls back to LP', () => {
  assertEqual(createRecord({ format: 'CD' }, fixed).format, 'LP');
  assertEqual(createRecord({ format: '7"' }, fixed).format, '7"');
});

test('a complete record is valid', () => {
  const record = createRecord({ artist: 'A', title: 'B', year: 1999, vinylGrade: 'VG+', sleeveGrade: 'NM', pricePaid: 10 }, fixed);
  assert(validateRecord(record, { now }).valid);
});

test('missing artist and title are rejected', () => {
  const { valid, errors } = validateRecord(createRecord({}, fixed), { now });
  assertEqual(valid, false);
  assert(errors.artist && errors.title);
});

test('years outside 1900 to next year are rejected', () => {
  assert(validateRecord(createRecord({ artist: 'A', title: 'B', year: 1899 }, fixed), { now }).errors.year);
  assert(validateRecord(createRecord({ artist: 'A', title: 'B', year: 2028 }, fixed), { now }).errors.year);
  assert(!validateRecord(createRecord({ artist: 'A', title: 'B', year: 2027 }, fixed), { now }).errors.year);
  assert(validateRecord(createRecord({ artist: 'A', title: 'B', year: 'abc' }, fixed), { now }).errors.year);
});

test('grades must be on the Goldmine scale', () => {
  const bad = validateRecord(createRecord({ artist: 'A', title: 'B', vinylGrade: 'Excellent', sleeveGrade: 'X' }, fixed), { now });
  assert(bad.errors.vinylGrade && bad.errors.sleeveGrade);
  assertEqual(GRADE_CODES.join(' '), 'M NM VG+ VG G+ G F P');
  assertEqual(gradeName('VG+'), 'Very Good Plus');
});

test('a bad price is rejected', () => {
  assert(validateRecord(createRecord({ artist: 'A', title: 'B', pricePaid: 'cheap' }, fixed), { now }).errors.pricePaid);
});
