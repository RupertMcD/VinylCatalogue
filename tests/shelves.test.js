import { test, assertEqual, assertDeepEqual } from './test-runner.js';
import { cleanShelfName, normaliseShelves, listShelves, filterByShelf, renameShelf, removeShelf, NO_SHELF } from '../models/shelves.js';

const records = [
  { id: '1', shelves: ['Jazz', 'Favourites'] },
  { id: '2', shelves: ['jazz'] },
  { id: '3', shelves: [] },
  { id: '4', shelves: ['For sale'] },
];
const ids = (list) => list.map((r) => r.id);

test('shelves: names are tidied and limited in length', () => {
  assertEqual(cleanShelfName('  living   room  '), 'living room');
  assertEqual(cleanShelfName('x'.repeat(60)).length, 40);
});

test('shelves: duplicates (ignoring capitals) and blanks are removed, A–Z', () => {
  assertDeepEqual(normaliseShelves(['Jazz', ' jazz', '', 'Favourites']), ['Favourites', 'Jazz']);
  assertDeepEqual(normaliseShelves('For sale; Jazz;;'), ['For sale', 'Jazz']);
  assertDeepEqual(normaliseShelves(undefined), []);
});

test('shelves: every shelf in use, with counts', () => {
  assertDeepEqual(listShelves(records), [
    { name: 'Favourites', count: 1 }, { name: 'For sale', count: 1 }, { name: 'Jazz', count: 2 },
  ]);
});

test('shelves: filtering by a shelf, all, or no shelf', () => {
  assertDeepEqual(ids(filterByShelf(records, 'JAZZ')), ['1', '2']);
  assertDeepEqual(ids(filterByShelf(records, '')), ['1', '2', '3', '4']);
  assertDeepEqual(ids(filterByShelf(records, NO_SHELF)), ['3']);
});

test('shelves: renaming updates only the records on that shelf', () => {
  const changed = renameShelf(records, 'jazz', 'Jazz & Blues');
  assertDeepEqual(ids(changed), ['1', '2']);
  assertDeepEqual(changed[0].shelves, ['Favourites', 'Jazz & Blues']);
  assertDeepEqual(changed[1].shelves, ['Jazz & Blues']);
});

test('shelves: renaming onto an existing shelf merges them', () => {
  const changed = renameShelf(records, 'Favourites', 'jazz');
  assertDeepEqual(changed[0].shelves, ['Jazz']);
});

test('shelves: renaming to a blank name changes nothing', () => {
  assertDeepEqual(renameShelf(records, 'Jazz', '   '), []);
});

test('shelves: deleting a shelf takes it off records but keeps the records', () => {
  const changed = removeShelf(records, 'JAZZ');
  assertDeepEqual(ids(changed), ['1', '2']);
  assertDeepEqual(changed[0].shelves, ['Favourites']);
  assertDeepEqual(changed[1].shelves, []);
});
