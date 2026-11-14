// Small helpers for searching Discogs by words (artist, title or catalogue
// number). No network here, so they can be tested.

export const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_LENGTH = 100;

// Tidies what was typed: trims, squashes repeated spaces, limits length.
export function cleanSearchText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_SEARCH_LENGTH).trim();
}

// Returns { valid, text, error } with a friendly message.
export function checkSearchText(text) {
  const cleaned = cleanSearchText(text);
  if (cleaned.length < MIN_SEARCH_LENGTH) {
    return { valid: false, text: cleaned, error: 'Type an artist, title or catalogue number.' };
  }
  return { valid: true, text: cleaned, error: '' };
}

// Marks matches whose Discogs release you already have: owned (in the
// collection) or wished (on the wishlist).
export function markOwned(matches, records) {
  const idsOn = (list) => new Set((records || [])
    .filter((record) => (record.list || 'collection') === list)
    .map((record) => String(record.discogsId || '').trim())
    .filter(Boolean));
  const owned = idsOn('collection');
  const wished = idsOn('wishlist');
  return matches.map((match) => ({
    ...match,
    owned: owned.has(String(match.discogsId)),
    wished: wished.has(String(match.discogsId)),
  }));
}
