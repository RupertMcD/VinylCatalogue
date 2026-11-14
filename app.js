// Starts the app: connects each address to the screen that draws it.

import { startRouter } from './utils/router.js';
import { createElement } from './utils/html.js';

const routes = [
  {
    path: '/',
    render: () => createElement('<div><h1 class="large-title">Collection</h1></div>'),
  },
];

startRouter(document.getElementById('app'), routes);
