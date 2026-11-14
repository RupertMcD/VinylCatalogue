// Narrows a list of Discogs matches down to the pressing in your hand,
// using what's printed on the spine or label (the catalogue number) or
// etched near the label (the matrix or runout number). Pure logic, tested.

import { normaliseText } from './search.js';

// Lower-case, no accents, and only letters and digits, so "PB-41447",
// "pb 41447" and "PB.41447" all become "pb41447".
export function squash(value) {
  return normaliseText(value).replace(/[^a-z0-9]/g, '');
}

function haystack(match) {
  return [match.catno, match.label, match.country, match.year, match.formatText, ...(match.identifiers || [])]
    .map(squash)
    .filter(Boolean)
    .join('|');
}

// Keeps the matches whose details contain what was typed. It matches if
// the whole text is found (ignoring spaces and punctuation), or if every
// separate word is found, so "UK 1987" works too.
export function narrowMatches(matches, text) {
  const whole = squash(text);
  if (!whole) return matches.slice();
  const words = normaliseText(text).split(/\s+/).map(squash).filter(Boolean);
  return matches.filter((match) => {
    const details = haystack(match);
    return details.includes(whole) || words.every((word) => details.includes(word));
  });
}
