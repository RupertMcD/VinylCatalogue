// Finding and ordering records. Pure logic, so it can be tested.

// Lower-case and remove accents, so "Björk" and "bjork" match.
export function normaliseText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Keeps the records whose artist or title contain every word typed.
// "miles blue" finds Miles Davis - Kind of Blue.
export function searchRecords(records, query) {
  const words = normaliseText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return records.slice();
  return records.filter((record) => {
    const haystack = `${normaliseText(record.artist)} ${normaliseText(record.title)}`;
    return words.every((word) => haystack.includes(word));
  });
}

// "The Smiths" files under S, as in a record shop.
export function sortName(artist) {
  return normaliseText(artist).replace(/^the\s+/, '');
}

const compareText = (a, b) => a.localeCompare(b, 'en-GB', { sensitivity: 'base', numeric: true });

// The ways the Collection can be ordered.
export const SORT_OPTIONS = [
  { value: 'artist', label: 'Artist' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'year', label: 'Year' },
];

const yearOf = (record) => (Number.isInteger(record.year) ? record.year : Infinity);
const timeOf = (record) => {
  const time = Date.parse(record.dateAdded);
  return Number.isNaN(time) ? -Infinity : time;
};

// Artist A-Z, then oldest year first (records without a year last), then title.
function byArtist(a, b) {
  const artist = compareText(sortName(a.artist), sortName(b.artist));
  if (artist !== 0) return artist;
  if (yearOf(a) !== yearOf(b)) return yearOf(a) - yearOf(b);
  return compareText(normaliseText(a.title), normaliseText(b.title));
}

const ORDERS = {
  artist: byArtist,
  // Newest first; records added at the same moment fall back to artist order.
  recent: (a, b) => (timeOf(b) - timeOf(a)) || byArtist(a, b),
  // Oldest year first, records without a year last; then artist order.
  year: (a, b) => (yearOf(a) - yearOf(b)) || byArtist(a, b),
};

export function sortRecords(records, by = 'artist') {
  return records.slice().sort(ORDERS[by] || ORDERS.artist);
}
