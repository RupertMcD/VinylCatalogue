// Every call to Claude (Anthropic's AI) lives here. Screens ask this file;
// they never talk to Claude directly. Errors always come back as a
// ClaudeError with a friendly message, so a failed lookup never breaks
// the app. The API key is read from this phone's settings only.

import { getClaudeKey } from './settings-store.js';
import { buildCoverRequest, parseCoverAnswer, splitDataUrl } from '../utils/cover-recognition.js';

const API = 'https://api.anthropic.com';
const API_VERSION = '2026-10-21';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const TIMEOUT_MS = 90000;

// `kind` lets screens react differently.
export class ClaudeError extends Error {
  constructor(message, kind) {
    super(message);
    this.name = 'ClaudeError';
    this.kind = kind;
  }
}

const MESSAGES = {
  'no-key': 'Add your Claude API key in Settings to recognise covers.',
  key: "Claude didn't accept your API key. Check it in Settings.",
  credit: 'Your Claude account has run out of credit. Add some at platform.claude.com, then try again.',
  offline: "Couldn't reach Claude. Check you have signal, then try again.",
  slow: 'Claude took too long to answer. Please try again.',
  busy: 'Claude is busy right now. Wait a minute, then try again.',
  'too-big': 'That photo is too big to send. Please try again.',
  refused: "Claude couldn't help with this photo. Try a photo of just the front cover.",
  failed: "Claude isn't responding properly right now. Please try again later.",
};

const fail = (kind) => new ClaudeError(MESSAGES[kind], kind);

async function request(path, key, { method = 'GET', body = null, beta = '' } = {}) {
  if (!key) throw fail('no-key');
  if (navigator.onLine === false) throw fail('offline');

  const headers = {
    'x-api-key': key,
    'anthropic-version': API_VERSION,
    // Claude's API needs this to accept calls straight from a web page.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (body) headers['content-type'] = 'application/json';
  if (beta) headers['anthropic-beta'] = beta;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw fail(error.name === 'AbortError' ? 'slow' : 'offline');
  } finally {
    clearTimeout(timer);
  }

  let json = null;
  try {
    json = await response.json();
  } catch {
    // Some error replies have no readable body.
  }

  if (!response.ok) {
    const message = String(json?.error?.message || '');
    if (response.status === 401 || response.status === 403) throw fail('key');
    if (/credit balance/i.test(message)) throw fail('credit');
    if (response.status === 413) throw fail('too-big');
    if (response.status === 429 || response.status === 529 || response.status >= 500) throw fail('busy');
    throw fail('failed');
  }
  if (!json) throw fail('failed');
  return json;
}

// Checks a key without using any credit (it just lists Claude's models).
export async function checkClaudeKey(key) {
  await request('/v1/models?limit=1', key);
  return true;
}

// Sends a cover photo (a data URL) to Claude. Returns what
// parseCoverAnswer gives: a status, plus artist and title if recognised.
export async function recogniseCover(photoDataUrl) {
  const photo = splitDataUrl(photoDataUrl);
  if (!photo) throw new ClaudeError("That photo couldn't be read. Try taking it again.", 'photo');
  const reply = await request('/v1/messages', getClaudeKey(), {
    method: 'POST',
    body: buildCoverRequest(photo.data, photo.mediaType),
    beta: FALLBACK_BETA,
  });
  const answer = parseCoverAnswer(reply);
  if (answer.status === 'refused') throw fail('refused');
  if (answer.status === 'failed') throw fail('failed');
  return answer;
}
