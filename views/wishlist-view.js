// The Wishlist tab: records you want but don't own yet. It's the same
// screen as the Collection, showing the wishlist instead.

import { renderCollectionView } from './collection-view.js';

export function renderWishlistView() {
  return renderCollectionView({ list: 'wishlist' });
}
