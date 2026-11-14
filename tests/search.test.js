import { test, assertEqual, assertDeepEqual } from './test-runner.js';
import { searchRecords, sortRecords, normaliseText } from '../utils/search.js';

const records = [
  { id: '1', artist: 'Miles Davis', title: 'Kind of Blue', year: 1959 },
  { id: '2', artist: 'Joni Mitchell', title: 'Blue', year: 1971 },
  { id: '3', artist: 'Björk', title: 'Debut', year: 1993 },
  { id: '4', artist: 'Sigur Rós', title: 'Ágætis byrjun', year: 1999 },
  { id: '5', artist: 'The Smiths', title: 'This Charming Man', year: 1983 },
  { id: '6', artist: 'New Order', title: 'Blue Monday', year: 1983 },
];

const ids = (list) => list.map((r) => r.id);

test('search matches the artist', () => {
  assertDeepEqual(ids(searchRecords(records, 'miles')), ['1']);
});

test('search matches the title', () => {
  assertDeepEqual(ids(searchRecords(records, 'debut')), ['3']);
});

test('search matches part of a word', () => {
  assertDeepEqual(ids(searchRecords(records, 'charm')), ['5']);
});

test('search finds every record with the word in artist or title', () => {
  assertDeepEqual(ids(searchRecords(records, 'blue')), ['1', '2', '6']);
});

test('search ignores capital letters', () => {
  assertDeepEqual(ids(searchRecords(records, 'JONI')), ['2']);
});

test('search ignores accents both ways', () => {
  assertDeepEqual(ids(searchRecords(records, 'bjork')), ['3']);
  assertDeepEqual(ids(searchRecords(records, 'sigur ros')), ['4']);
  assertDeepEqual(ids(searchRecords(records, 'Agætis')), ['4']);
  assertDeepEqual(ids(searchRecords([{ id: 'x', artist: 'Bjork', title: '' }], 'Björk')), ['x']);
});

test('several words must all match, across artist and title', () => {
  assertDeepEqual(ids(searchRecords(records, 'miles blue')), ['1']);
  assertDeepEqual(ids(searchRecords(records, 'blue monday order')), ['6']);
  assertDeepEqual(ids(searchRecords(records, 'miles debut')), []);
});

test('blank search or only spaces shows everything', () => {
  assertEqual(searchRecords(records, '').length, records.length);
  assertEqual(searchRecords(records, '   ').length, records.length);
  assertEqual(searchRecords(records, undefined).length, records.length);
});

test('extra spaces around and between words are ignored', () => {
  assertDeepEqual(ids(searchRecords(records, '  kind   of  ')), ['1']);
});

test('no match gives an empty list', () => {
  assertDeepEqual(searchRecords(records, 'zeppelin'), []);
});

test('search does not match other fields like year', () => {
  assertDeepEqual(searchRecords(records, '1959'), []);
});

test('records with missing fields do not break search', () => {
  const messy = [{ id: 'a' }, { id: 'b', artist: null, title: 'Blue' }];
  assertDeepEqual(ids(searchRecords(messy, 'blue')), ['b']);
});

test('search does not change the original list', () => {
  const copy = records.slice();
  searchRecords(records, 'blue');
  assertDeepEqual(ids(records), ids(copy));
});

test('normaliseText lower-cases, trims and strips accents', () => {
  assertEqual(normaliseText('  Sigur RÓS '), 'sigur ros');
  assertEqual(normaliseText(null), '');
});

test('sort is by artist A–Z, ignoring a leading "The"', () => {
  assertDeepEqual(ids(sortRecords(records)), ['3', '2', '1', '6', '4', '5']);
});

test('sort puts the same artist in year order, undated last', () => {
  const same = [
    { id: 'c', artist: 'Kate Bush', title: 'Aerial', year: null },
    { id: 'b', artist: 'Kate Bush', title: 'Hounds of Love', year: 1985 },
    { id: 'a', artist: 'kate bush', title: 'The Kick Inside', year: 1978 },
  ];
  assertDeepEqual(ids(sortRecords(same)), ['a', 'b', 'c']);
});
