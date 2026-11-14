// Shows a record's cover, or a calm placeholder disc when there isn't one.

import { escapeHtml } from '../utils/html.js';

// Only web addresses and pictures picked on the device are shown.
function isSafeImage(src) {
  return /^(https?:\/\/|data:image\/)/i.test(src || '');
}

// The same record always gets the same soft colour.
function hueFor(record) {
  const key = `${record.artist}|${record.title}`;
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return hash % 360;
}

const disc = `
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="50" cy="50" r="40" stroke-width="2"/>
    <circle cx="50" cy="50" r="31" stroke-width="1"/>
    <circle cx="50" cy="50" r="24" stroke-width="1"/>
    <circle cx="50" cy="50" r="12" fill="currentColor" stroke="none"/>
  </svg>`;

export function coverArt(record, className = '') {
  if (isSafeImage(record.coverImage)) {
    return `<span class="cover ${className}"><img src="${escapeHtml(record.coverImage)}" alt="" loading="lazy" decoding="async"></span>`;
  }
  return `<span class="cover cover--placeholder ${className}" style="--hue: ${hueFor(record)}">${disc}</span>`;
}
