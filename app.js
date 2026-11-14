// Starts the app: connects each address to the screen that draws it.

import { startRouter } from './utils/router.js';
import { renderCollectionView } from './views/collection-view.js';
import { renderRecordDetailView } from './views/record-detail-view.js';
import { renderRecordFormView } from './views/record-form-view.js';
import { renderSettingsView } from './views/settings-view.js';
import { renderScanView } from './views/scan-view.js';
import { renderDiscogsMatchesView } from './views/discogs-matches-view.js';
import { setUpServiceWorker } from './utils/service-worker-setup.js';
import { requestPersistentStorage } from './utils/persistent-storage.js';
import { keepCoversOffline } from './services/cover-cache.js';
import { createTabBar, showTab } from './views/tab-bar.js';

// `tab` is the tab bar tab each screen belongs to; no tab hides the bar.
// The app opens on "/", the Add tab, with the camera ready.
const routes = [
  { path: '/', tab: 'add', render: () => renderScanView() },
  { path: '/scan', tab: 'add', render: () => renderScanView() },
  { path: '/scan/search', tab: 'add', render: () => renderScanView({ startWithSearch: true }) },
  { path: '/lookup/:barcode', tab: 'add', render: ({ barcode }) => renderDiscogsMatchesView({ barcode }) },
  { path: '/search/:query', tab: 'add', render: ({ query }) => renderDiscogsMatchesView({ query }) },
  { path: '/collection', tab: 'collection', render: () => renderCollectionView() },
  { path: '/record/:id', tab: 'collection', render: ({ id }) => renderRecordDetailView(id) },
  { path: '/settings', tab: 'settings', render: () => renderSettingsView() },
  { path: '/add', tab: null, render: () => renderRecordFormView() },
  { path: '/edit/:id', tab: null, render: ({ id }) => renderRecordFormView(id) },
];

createTabBar();
startRouter(document.getElementById('app'), routes, {
  onChange: (route) => showTab(route.tab),
});

// Offline support and permanent storage. Neither blocks the app from starting.
setUpServiceWorker();
requestPersistentStorage();
keepCoversOffline();

// If a cover picture can't be shown (for example no signal and no saved
// copy), show the plain tile instead of a broken picture.
document.addEventListener('error', (event) => {
  const image = event.target;
  if (image instanceof HTMLImageElement && image.parentElement?.classList.contains('cover')) {
    image.parentElement.classList.add('cover--missing');
    image.remove();
  }
}, true);
