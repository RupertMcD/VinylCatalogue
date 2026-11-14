// Every call to Discogs lives here. Screens ask this file; they never
// talk to Discogs directly. Errors always come back as a DiscogsError with
// a friendly message, so a failed lookup never breaks the app.

import { getDiscogsToken } from './settings-store.js';
import { parseSearchResults, parseRelease } from '../utils/discogs-parser.js';
import { barcodeSearchForms } from '../utils/barcode.js';

const API = 'https://api.discogs.com';
const TIMEOUT_MS = 15000;

// `kind` lets screens react differently: 'no-token', 'token', 'offline',
// 'busy', 'not-found' or 'failed'.
export class DiscogsError extends Error {
  constructor(message, kind) {
    super(message);
    this.name = 'DiscogsError';
    this.kind = kind;
  }
}

const MESSAGES = {
  'no-token': 'Add your Discogs token in Settings to look records up.',
  token: "Discogs didn't accept your token. Check it in Settings.",
  offline: "Couldn't reach Discogs. Check you have signal, then try again.",
  busy: 'Discogs is busy right now. Wait a minute, then try again.',
  'not-found': "Discogs couldn't find that record.",
  failed: "Discogs isn't responding properly right now. Please try again later.",
};

const fail = (kind) => new DiscogsError(MESSAGES[kind], kind);

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// When Discogs rejects a token, its reply is missing a header browsers need,
// so it looks just like having no signal. Asking Discogs' public welcome
// address (no token) tells the two apart.
async function canReachDiscogs() {
  try {
    return (await fetchWithTimeout(`${API}/`)).ok;
  } catch {
    return false;
  }
}

async function request(path, token) {
  if (!token) throw fail('no-token');
  if (navigator.onLine === false) throw fail('offline');

  let response;
  try {
    response = await fetchWithTimeout(`${API}${path}`, {
      headers: {
        Accept: 'application/vnd.discogs.v2.discogs+json',
        Authorization: `Discogs token=${token}`,
      },
    });
  } catch {
    throw fail(await canReachDiscogs() ? 'token' : 'offline');
  }

  if (response.status === 401 || response.status === 403) throw fail('token');
  if (response.status === 404) throw fail('not-found');
  if (response.status === 429) throw fail('busy');
  if (!response.ok) throw fail('failed');

  try {
    return await response.json();
  } catch {
    throw fail('failed');
  }
}

// All the releases with this barcode (often several pressings).
// `digits` must already be checked with checkBarcode().
export async function searchByBarcode(digits) {
  const token = getDiscogsToken();
  for (const form of barcodeSearchForms(digits)) {
    const params = new URLSearchParams({ barcode: form, type: 'release', per_page: '50' });
    const matches = parseSearchResults(await request(`/database/search?${params}`, token));
    if (matches.length > 0) return matches;
  }
  return [];
}

// Vinyl releases matching some words (artist, title or catalogue number).
// Returns { matches, total }: up to 50 matches, and how many Discogs found.
// `text` must already be checked with checkSearchText().
export async function searchDiscogs(text) {
  const params = new URLSearchParams({ q: text, type: 'release', format: 'Vinyl', per_page: '50' });
  const json = await request(`/database/search?${params}`, getDiscogsToken());
  const matches = parseSearchResults(json);
  const total = Number(json && json.pagination && json.pagination.items) || matches.length;
  return { matches, total };
}

// One release's full details, as fields for a new record.
export async function getReleaseDetails(discogsId) {
  const json = await request(`/releases/${encodeURIComponent(discogsId)}`, getDiscogsToken());
  try {
    return parseRelease(json);
  } catch {
    throw fail('failed');
  }
}

// Checks a token works. Returns the Discogs username it belongs to.
export async function checkDiscogsToken(token) {
  const json = await request('/oauth/identity', String(token || '').trim());
  return json && json.username ? String(json.username) : '';
}
