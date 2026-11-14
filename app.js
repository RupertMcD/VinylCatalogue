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

const routes = [
  { path: '/', render: () => renderCollectionView() },
  { path: '/record/:id', render: ({ id }) => renderRecordDetailView(id) },
  { path: '/add', render: () => renderRecordFormView() },
  { path: '/edit/:id', render: ({ id }) => renderRecordFormView(id) },
  { path: '/settings', render: () => renderSettingsView() },
  { path: '/scan', render: () => renderScanView() },
  { path: '/lookup/:barcode', render: ({ barcode }) => renderDiscogsMatchesView(barcode) },
];

startRouter(document.getElementById('app'), routes);

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
