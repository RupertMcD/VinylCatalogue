// Starts the app: connects each address to the screen that draws it.

import { startRouter } from './utils/router.js';
import { renderCollectionView } from './views/collection-view.js';
import { renderRecordDetailView } from './views/record-detail-view.js';
import { renderRecordFormView } from './views/record-form-view.js';

const routes = [
  { path: '/', render: () => renderCollectionView() },
  { path: '/record/:id', render: ({ id }) => renderRecordDetailView(id) },
  { path: '/add', render: () => renderRecordFormView() },
  { path: '/edit/:id', render: ({ id }) => renderRecordFormView(id) },
];

startRouter(document.getElementById('app'), routes);
