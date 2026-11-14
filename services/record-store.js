// Saves and loads records in IndexedDB, the small database built into
// the browser. Records stay on this device only.

import { upgradeRecord } from '../models/record.js';

const DB_NAME = 'vinyl-catalogue';
// Version history:
// 1: records store (phase 1)
// 2: every record gains list, shelves and shopLink (phase 5)
const DB_VERSION = 2;
const STORE = 'records';

const FRIENDLY_ERROR = "Your records couldn't be reached. Try closing and reopening the app.";

let dbPromise = null;

// Runs when the database is first created, or when DB_VERSION goes up.
// Each step only adds or converts. It must never delete records.
// Exported only so a test can run it on a separate test database.
export function upgrade(db, oldVersion, transaction) {
  if (oldVersion < 1) {
    const store = db.createObjectStore(STORE, { keyPath: 'id' });
    store.createIndex('dateAdded', 'dateAdded');
  }
  if (oldVersion >= 1 && oldVersion < 2) {
    // Convert each existing record: add list ("collection"), no shelves and
    // no shop link. Every other field is kept exactly as it was.
    const request = transaction.objectStore(STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      cursor.update(upgradeRecord(cursor.value));
      cursor.continue();
    };
  }
  // Future versions go here, e.g. `if (oldVersion < 3) { ...convert... }`
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser cannot store records.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion, request.transaction);
    request.onsuccess = () => {
      const db = request.result;
      // If a newer version of the app opens in another tab, step aside.
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other tabs running the app, then try again.'));
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

// Runs one piece of work in a transaction and waits for it to finish.
async function withStore(mode, work) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result;
      const request = work(tx.objectStore(STORE));
      if (request) request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Cancelled'));
    });
  } catch (error) {
    console.error(error);
    throw new Error(FRIENDLY_ERROR, { cause: error });
  }
}

// Records are brought up to date as they're read too, as a safety net.
export async function getAllRecords() {
  const records = await withStore('readonly', (store) => store.getAll());
  return records.map(upgradeRecord);
}

export async function getRecord(id) {
  const record = await withStore('readonly', (store) => store.get(id));
  return record ? upgradeRecord(record) : null;
}

// Saves several changed records in one go (all or nothing), for example
// when a shelf is renamed.
export function saveRecords(records) {
  return withStore('readwrite', (store) => {
    records.forEach((record) => store.put(record));
  });
}

// Adds a new record or replaces the one with the same id.
export function saveRecord(record) {
  return withStore('readwrite', (store) => store.put(record));
}

export function deleteRecord(id) {
  return withStore('readwrite', (store) => store.delete(id));
}

// Adds several records at once, skipping any whose id is already stored.
// Returns how many were added.
export async function addRecordsIfMissing(records) {
  const existing = new Set(await withStore('readonly', (store) => store.getAllKeys()));
  const fresh = records.filter((record) => !existing.has(record.id));
  await withStore('readwrite', (store) => {
    fresh.forEach((record) => store.add(record));
  });
  return fresh.length;
}
