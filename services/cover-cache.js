// Keeps a copy of each record's Discogs cover picture on the phone, so
// covers still show with no signal. Only covers of records in the
// collection are kept; others are removed. The service worker (sw.js)
// shows these copies when a cover is needed.

import { getAllRecords } from './record-store.js';

const COVER_CACHE = 'vinyl-covers'; // Must match COVER_CACHE in sw.js.

const isDiscogsCover = (url) => /^https:\/\/i\.discogs\.com\//.test(url || '');

let running = null;

async function sync() {
  const records = await getAllRecords();
  const wanted = new Set(records.map((record) => record.coverImage).filter(isDiscogsCover));
  const cache = await caches.open(COVER_CACHE);
  const saved = new Set((await cache.keys()).map((request) => request.url));

  for (const url of saved) {
    if (!wanted.has(url)) await cache.delete(url);
  }
  if (navigator.onLine === false) return;

  for (const url of wanted) {
    if (saved.has(url)) continue;
    try {
      // Discogs doesn't allow reading its pictures, only showing them,
      // so this is a "no-cors" copy that can be shown but not inspected.
      const response = await fetch(url, { mode: 'no-cors', credentials: 'omit' });
      await cache.put(url, response);
    } catch {
      // No signal or a full phone: try again next time.
    }
  }
}

// Safe to call any time; it never throws and never runs twice at once.
export function keepCoversOffline() {
  if (!('caches' in window)) return Promise.resolve();
  if (!running) {
    running = sync()
      .catch((error) => console.warn('Covers could not be saved for offline use.', error))
      .finally(() => { running = null; });
  }
  return running;
}
