// Service worker: a small script the browser runs in the background.
// On the first visit it saves a copy of every app file. After that the app
// loads from those copies, so it opens with no signal.
//
// When you change any app file, bump CACHE_VERSION. The phone fetches the
// new files the next time the app opens with signal, then uses them.
// When you add a new app file, add it to APP_FILES (a test checks this).

const CACHE_VERSION = 'v5';
const CACHE_NAME = `vinyl-catalogue-${CACHE_VERSION}`;

// Copies of Discogs cover pictures, kept by services/cover-cache.js.
// Not removed on updates, because the name doesn't start "vinyl-catalogue-".
const COVER_CACHE = 'vinyl-covers';

// APP_FILES START
const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'app.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'models/record-csv.js',
  'models/record.js',
  'models/sample-records.js',
  'services/cover-cache.js',
  'services/discogs-service.js',
  'services/record-store.js',
  'services/settings-store.js',
  'styles/base.css',
  'styles/collection.css',
  'styles/detail.css',
  'styles/form.css',
  'styles/scan.css',
  'styles/settings.css',
  'styles/tab-bar.css',
  'styles/sheet.css',
  'utils/barcode-reader.js',
  'utils/barcode.js',
  'utils/camera-scanner.js',
  'utils/csv.js',
  'utils/dev-mode.js',
  'utils/discogs-parser.js',
  'utils/discogs-search.js',
  'utils/file-share.js',
  'utils/flash.js',
  'utils/format.js',
  'utils/html.js',
  'utils/icons.js',
  'utils/image-resize.js',
  'utils/persistent-storage.js',
  'utils/record-draft.js',
  'utils/router.js',
  'utils/search.js',
  'utils/service-worker-setup.js',
  'vendor/zxing-wasm/es/reader/index.js',
  'vendor/zxing-wasm/es/share.js',
  'vendor/zxing-wasm/reader/zxing_reader.wasm',
  'views/collection-view.js',
  'views/confirm-sheet.js',
  'views/discogs-matches-view.js',
  'views/cover-art.js',
  'views/record-detail-view.js',
  'views/record-form-view.js',
  'views/scan-view.js',
  'views/settings-view.js',
  'views/tab-bar.js',
  'views/toast.js',
];
// APP_FILES END

// Save every app file. If any one fails, nothing is switched over, so the
// phone keeps the last version that worked.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES.map((file) => new Request(file, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

// Remove copies saved by older versions. Records are not stored here
// (they live in IndexedDB), so this never touches them.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('vinyl-catalogue-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cover pictures from Discogs: use the saved copy if there is one.
  if (url.hostname === 'i.discogs.com') {
    event.respondWith((async () => {
      const saved = await (await caches.open(COVER_CACHE)).match(request.url);
      return saved || fetch(request);
    })());
    return;
  }

  // Leave other websites alone (for example the Discogs lookups).
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Opening the app: every screen lives in index.html (after the #),
    // so always answer with the saved page.
    if (request.mode === 'navigate') {
      const page = await cache.match('index.html');
      if (page) return page;
    }

    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;

    try {
      return await fetch(request);
    } catch (error) {
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
