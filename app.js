// Starts the app: connects each address to the screen that draws it.

import { startRouter } from './utils/router.js';
import { renderCollectionView } from './views/collection-view.js';
import { renderRecordDetailView } from './views/record-detail-view.js';

const routes = [
  { path: '/', render: () => renderCollectionView() },
  { path: '/record/:id', render: ({ id }) => renderRecordDetailView(id) },
];

startRouter(document.getElementById('app'), routes);
