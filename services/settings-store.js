// Keeps the app's settings on this device only (in the browser's own
// storage). The Discogs token is never written into the code or sent
// anywhere except to Discogs itself.

const DISCOGS_TOKEN_KEY = 'discogs-token';

export function getDiscogsToken() {
  try {
    return localStorage.getItem(DISCOGS_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveDiscogsToken(token) {
  try {
    localStorage.setItem(DISCOGS_TOKEN_KEY, String(token).trim());
  } catch {
    throw new Error("The token couldn't be saved on this device. Please try again.");
  }
}

export function removeDiscogsToken() {
  try {
    localStorage.removeItem(DISCOGS_TOKEN_KEY);
  } catch {
    // Nothing saved, so nothing to remove.
  }
}
