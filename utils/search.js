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

// Artist A-Z, then oldest year first (records without a year last), then title.
export function sortRecords(records) {
  return records.slice().sort((a, b) => {
    const byArtist = compareText(sortName(a.artist), sortName(b.artist));
    if (byArtist !== 0) return byArtist;
    const yearA = a.year ?? Infinity;
    const yearB = b.year ?? Infinity;
    if (yearA !== yearB) return yearA - yearB;
    return compareText(normaliseText(a.title), normaliseText(b.title));
  });
}
