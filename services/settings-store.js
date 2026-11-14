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

// When the collection was last exported to CSV (an ISO date), or ''.
const LAST_EXPORT_KEY = 'last-export';

export function getLastExport() {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY) || '';
  } catch {
    return '';
  }
}

export function setLastExport(isoDate) {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, isoDate);
  } catch {
    // Not essential: only used to show "Last export" in Settings.
  }
}
