// Starts the app: connects each address to the screen that draws it.

import { startRouter } from './utils/router.js';
import { renderCollectionView } from './views/collection-view.js';

const routes = [
  { path: '/', render: () => renderCollectionView() },
];

startRouter(document.getElementById('app'), routes);
