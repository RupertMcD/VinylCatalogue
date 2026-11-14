// Starts the app: connects each address to the screen that draws it.

import { startRouter } from './utils/router.js';
import { renderCollectionView } from './views/collection-view.js';
import { renderRecordDetailView } from './views/record-detail-view.js';
import { renderRecordFormView } from './views/record-form-view.js';
import { renderSettingsView } from './views/settings-view.js';
import { setUpServiceWorker } from './utils/service-worker-setup.js';
import { requestPersistentStorage } from './utils/persistent-storage.js';

const routes = [
  { path: '/', render: () => renderCollectionView() },
  { path: '/record/:id', render: ({ id }) => renderRecordDetailView(id) },
  { path: '/add', render: () => renderRecordFormView() },
  { path: '/edit/:id', render: ({ id }) => renderRecordFormView(id) },
  { path: '/settings', render: () => renderSettingsView() },
];

startRouter(document.getElementById('app'), routes);

// Offline support and permanent storage. Neither blocks the app from starting.
setUpServiceWorker();
requestPersistentStorage();
