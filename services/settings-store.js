// Keeps the app's settings on this device only (in the browser's own
// storage). The Discogs token and the Claude API key are never written
// into the code, and each is sent only to its own service.

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

// The Claude API key, used to recognise cover photos.
const CLAUDE_KEY_KEY = 'claude-api-key';

export function getClaudeKey() {
  try {
    return localStorage.getItem(CLAUDE_KEY_KEY) || '';
  } catch {
    return '';
  }
}

export function saveClaudeKey(key) {
  try {
    localStorage.setItem(CLAUDE_KEY_KEY, String(key).trim());
  } catch {
    throw new Error("The key couldn't be saved on this device. Please try again.");
  }
}

export function removeClaudeKey() {
  try {
    localStorage.removeItem(CLAUDE_KEY_KEY);
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
