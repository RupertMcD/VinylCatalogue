// Checks that records saved by older versions of the app are converted,
// never lost, when the database is upgraded.

import { test, assert, assertEqual, assertDeepEqual } from './test-runner.js';
import { createRecord, upgradeRecord, validateRecord } from '../models/record.js';
import { upgrade } from '../services/record-store.js';

// A record exactly as phase 1 to 4 saved it (no list, shelves or shopLink).
const oldRecord = {
  id: 'old-1', artist: 'Björk', title: 'Debut', year: 1993, label: 'One Little Indian', format: 'LP',
  vinylGrade: 'NM', sleeveGrade: 'VG+', pricePaid: 12.5, dateAdded: '2026-11-01T10:00:00.000Z',
  notes: 'Gatefold', barcode: '5016958997028', discogsId: '12345', coverImage: 'data:image/jpeg;base64,AAAA',
};

test('upgrade: an old record keeps every field and gains the new ones', () => {
  const upgraded = upgradeRecord(oldRecord);
  for (const [key, value] of Object.entries(oldRecord)) assertEqual(upgraded[key], value, key);
  assertEqual(upgraded.list, 'collection');
  assertDeepEqual(upgraded.shelves, []);
  assertEqual(upgraded.shopLink, '');
});

test('upgrade: an already up-to-date record is left as it is', () => {
  const current = createRecord({ ...oldRecord, list: 'wishlist', shelves: ['Jazz'], shopLink: 'https://example.com/x' });
  assertDeepEqual(upgradeRecord(current), current);
});

test('model: wishlist, shelves and shop links', () => {
  const record = createRecord({ artist: 'A', title: 'B', list: 'wishlist', shelves: ' jazz ; Favourites;JAZZ ', shopLink: ' https://shop.example/x ' });
  assertEqual(record.list, 'wishlist');
  assertDeepEqual(record.shelves, ['Favourites', 'jazz']);
  assertEqual(record.shopLink, 'https://shop.example/x');
  assertEqual(createRecord({ list: 'nonsense' }).list, 'collection');
});

test('model: a shop link must be a web address', () => {
  const now = new Date('2026-11-14T10:00:00Z');
  const bad = createRecord({ artist: 'A', title: 'B', shopLink: 'javascript:alert(1)' }, { now });
  assert(validateRecord(bad, { now }).errors.shopLink, 'should be rejected');
  const good = createRecord({ artist: 'A', title: 'B', shopLink: 'https://www.juno.co.uk/products/x' }, { now });
  assertEqual(validateRecord(good, { now }).errors.shopLink, undefined);
});

// Runs the real upgrade on a separate, throwaway database.
function openTestDb(name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (event) => onUpgrade(request.result, event.oldVersion, request.transaction);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteTestDb(name) {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
}

test('upgrade: version 1 to 2 converts every saved record and deletes none', async () => {
  const name = 'vinyl-catalogue-upgrade-test';
  await deleteTestDb(name);

  // Version 1, as phases 1 to 4 created it, with two old records.
  const v1 = await openTestDb(name, 1, (db) => {
    const store = db.createObjectStore('records', { keyPath: 'id' });
    store.createIndex('dateAdded', 'dateAdded');
    store.add(oldRecord);
    store.add({ ...oldRecord, id: 'old-2', title: 'Post', coverImage: '' });
  });
  v1.close();

  // Version 2, using the app's own upgrade.
  const v2 = await openTestDb(name, 2, upgrade);
  const saved = await new Promise((resolve, reject) => {
    const request = v2.transaction('records').objectStore('records').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  v2.close();
  await deleteTestDb(name);

  assertEqual(saved.length, 2, 'both records are still there');
  for (const record of saved) {
    assertEqual(record.list, 'collection');
    assertDeepEqual(record.shelves, []);
    assertEqual(record.shopLink, '');
    assertEqual(record.vinylGrade, 'NM');
    assertEqual(record.pricePaid, 12.5);
  }
  assertEqual(saved.find((r) => r.id === 'old-1').coverImage, oldRecord.coverImage);
});
