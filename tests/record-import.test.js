import { test, assert, assertEqual, assertDeepEqual } from './test-runner.js';
import { recordsToCsv, readRecordsCsv, planImport, headerToField } from '../models/record-csv.js';
import { createRecord } from '../models/record.js';

const now = new Date('2026-11-14T12:00:00.000Z');
let counter = 0;
const options = { now, makeId: () => `new-${++counter}` };

const collection = [
  createRecord({ id: 'a1', artist: 'Björk', title: 'Debut', year: 1993, format: 'LP', vinylGrade: 'NM', pricePaid: 12.5, notes: 'Gatefold, "mint"\nInsert', dateAdded: '2026-11-01T10:00:00.000Z', coverImage: 'data:image/jpeg;base64,AAAA' }),
  createRecord({ id: 'a2', artist: 'Kate Bush', title: 'Hounds of Love', year: 1985, format: 'LP', barcode: '5099924012418', discogsId: '377432', dateAdded: '2026-11-02T10:00:00.000Z' }),
];

test('import: an export read back gives the same records', () => {
  const { rows, fileError } = readRecordsCsv(recordsToCsv(collection), options);
  assertEqual(fileError, undefined);
  assertDeepEqual(rows.map((row) => row.record), collection);
});

test('import: importing your own backup adds nothing', () => {
  const { rows } = readRecordsCsv(recordsToCsv(collection), options);
  const plan = planImport(rows, collection);
  assertEqual(plan.toAdd.length, 0);
  assertEqual(plan.alreadyHave.length, 2);
  assertEqual(plan.problems.length, 0);
});

test('import: a backup restores everything into an empty collection', () => {
  const { rows } = readRecordsCsv(recordsToCsv(collection), options);
  assertDeepEqual(planImport(rows, []).toAdd, collection);
});

test('import: a hand-made file with friendly column names works', () => {
  const csv = 'Artist,Title,Year,Format,Vinyl Grade,Sleeve grade,Price,Notes\nNick Drake,Pink Moon,1972,lp,vg+,G+,£8,Island pink rim\n';
  const { rows } = readRecordsCsv(csv, options);
  const { record, errors, hadId } = rows[0];
  assertDeepEqual(errors, []);
  assertEqual(hadId, false);
  assertEqual(record.format, 'LP');
  assertEqual(record.vinylGrade, 'VG+');
  assertEqual(record.sleeveGrade, 'G+');
  assertEqual(record.pricePaid, 8);
  assertEqual(record.dateAdded, now.toISOString());
  assert(record.id.startsWith('new-'), 'gets a new ID');
});

test('import: records without IDs already in the collection are skipped', () => {
  const csv = 'artist,title,year,format,barcode,discogsId\nkate bush,Hounds of Love,1985,LP,5 099924 012418,377432\nKate Bush,The Kick Inside,1978,LP,,\n';
  const plan = planImport(readRecordsCsv(csv, options).rows, collection);
  assertDeepEqual(plan.alreadyHave.map((item) => item.record.title), ['Hounds of Love']);
  assertDeepEqual(plan.toAdd.map((record) => record.title), ['The Kick Inside']);
});

test('import: the same record twice in one file is only added once', () => {
  const csv = 'artist,title\nNico,Chelsea Girl\nNico,Chelsea Girl\n';
  const plan = planImport(readRecordsCsv(csv, options).rows, []);
  assertEqual(plan.toAdd.length, 1);
  assertEqual(plan.alreadyHave.length, 1);
  assertEqual(plan.alreadyHave[0].line, 3);
});

test('import: rows with problems are skipped with their row number and reason', () => {
  const csv = 'artist,title,year,format,vinylGrade\nCan,,1971,LP,\nCan,Tago Mago,197x,LP,\nCan,Ege Bamyasi,1972,CD,\nCan,Future Days,1973,LP,Excellent\nCan,Soon Over Babaluma,1974,LP,VG\n';
  const plan = planImport(readRecordsCsv(csv, options).rows, []);
  assertDeepEqual(plan.toAdd.map((record) => record.title), ['Soon Over Babaluma']);
  assertDeepEqual(plan.problems.map((problem) => problem.line), [2, 3, 4, 5]);
  assert(plan.problems[0].errors[0].includes('title'), plan.problems[0].errors[0]);
  assert(plan.problems[1].errors[0].includes('year'), plan.problems[1].errors[0]);
  assert(plan.problems[2].errors[0].includes('CD'), plan.problems[2].errors[0]);
  assert(plan.problems[3].errors[0].includes('grade'), plan.problems[3].errors[0]);
});

test('import: made-safe spreadsheet text is restored', () => {
  const csv = "artist,title,notes\nSuicide,Suicide,'=crackle\n";
  assertEqual(readRecordsCsv(csv, options).rows[0].record.notes, '=crackle');
});

test('import: files that can\'t be used get a friendly message', () => {
  assert(readRecordsCsv('', options).fileError.includes('empty'));
  assert(readRecordsCsv('name,email\nA,b\n', options).fileError.includes('Artist and Title'));
  assert(readRecordsCsv('artist,title\n,\n', options).fileError.includes('no records'));
  assert(readRecordsCsv('artist,title\n"Open,quote\n', options).fileError.includes('quote'));
});

test('import: column names are matched loosely', () => {
  assertEqual(headerToField('Vinyl Grade'), 'vinylGrade');
  assertEqual(headerToField('discogs_id'), 'discogsId');
  assertEqual(headerToField('Price Paid (£)'), 'pricePaid');
  assertEqual(headerToField('Genre'), null);
  assertEqual(headerToField('PRICE'), 'pricePaid');
});

test('import: list, shelves and shop link come back from an export', () => {
  const records = [
    createRecord({ id: 'w1', artist: 'Nico', title: 'Chelsea Girl', list: 'wishlist', shopLink: 'https://www.juno.co.uk/x/', dateAdded: '2026-11-03T10:00:00.000Z' }),
    createRecord({ id: 'c1', artist: 'Can', title: 'Tago Mago', shelves: ['Krautrock', 'Favourites'], dateAdded: '2026-11-04T10:00:00.000Z' }),
  ];
  const { rows } = readRecordsCsv(recordsToCsv(records), options);
  assertDeepEqual(rows.map((row) => row.record), records);
});

test('import: an older backup without the new columns imports as collection', () => {
  const old = 'id,artist,title,year,label,format,vinylGrade,sleeveGrade,pricePaid,dateAdded,notes,barcode,discogsId,coverImage\r\n'
    + 'o1,Björk,Debut,1993,,LP,,,,2026-11-01T10:00:00.000Z,,,,\r\n';
  const { record, errors } = readRecordsCsv(old, options).rows[0];
  assertDeepEqual(errors, []);
  assertEqual(record.list, 'collection');
  assertDeepEqual(record.shelves, []);
  assertEqual(record.shopLink, '');
});

test('import: list and shelves are read loosely, and bad values are flagged', () => {
  const csv = 'artist,title,list,shelf,shop\nA,One,Wishlist,jazz; Soul,\nA,Two,owned,,\nA,Three,,,javascript:alert(1)\n';
  const { rows } = readRecordsCsv(csv, options);
  assertEqual(rows[0].record.list, 'wishlist');
  assertDeepEqual(rows[0].record.shelves, ['jazz', 'Soul']);
  assert(rows[1].errors[0].includes('owned'), rows[1].errors[0]);
  assert(rows[2].errors[0].includes('shop link'), rows[2].errors[0]);
});
