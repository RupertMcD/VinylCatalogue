// Turns Discogs' replies into what the app uses. No network here: the
// replies come from services/discogs-service.js. Kept separate so it can
// be tested with saved example replies.

// Discogs tells apart artists or labels with the same name by adding a
// number, e.g. "Nirvana (2)". An asterisk marks a name variation.
export function cleanDiscogsName(name) {
  return String(name ?? '').replace(/\s*\(\d+\)$/, '').replace(/\*$/, '').trim();
}

// Labels that are Discogs' way of saying "no label".
function isRealLabel(name) {
  return name !== '' && !/^not on label\b/i.test(name);
}

function firstRealLabel(names) {
  return (names || []).map(cleanDiscogsName).find(isRealLabel) || '';
}

function yearFrom(value) {
  const year = Number(value);
  return Number.isInteger(year) && year > 0 ? year : null;
}

// Picks one of the app's formats (LP, 12", 7", Box set) from Discogs' format
// list, e.g. [{ name: 'Vinyl', descriptions: ['LP', 'Album'] }].
export function formatFromDiscogs(formats) {
  const words = [];
  for (const format of formats || []) {
    words.push(format.name, ...(format.descriptions || []));
  }
  const has = (word) => words.some((w) => String(w).toLowerCase() === word.toLowerCase());
  if (has('Box Set')) return 'Box set';
  if (has('LP')) return 'LP';
  if (has('7"')) return '7"';
  if (has('12"')) return '12"';
  return 'LP';
}

function isVinyl(formatWords) {
  return (formatWords || []).some((word) => String(word).toLowerCase() === 'vinyl');
}

// Search results are titled "Artist - Title".
function splitArtistAndTitle(text) {
  const value = String(text ?? '');
  const at = value.indexOf(' - ');
  if (at === -1) return { artist: '', title: value.trim() };
  return { artist: cleanDiscogsName(value.slice(0, at)), title: value.slice(at + 3).trim() };
}

// The list of possible releases for a barcode, vinyl first.
export function parseSearchResults(json) {
  const results = Array.isArray(json?.results) ? json.results : [];
  const matches = results
    .filter((result) => result && result.id && (result.type ?? 'release') === 'release')
    .map((result) => {
      const { artist, title } = splitArtistAndTitle(result.title);
      const formatWords = result.format || [];
      return {
        discogsId: String(result.id),
        artist,
        title,
        year: yearFrom(result.year),
        country: result.country || '',
        label: firstRealLabel(result.label),
        catno: result.catno && result.catno.toLowerCase() !== 'none' ? result.catno : '',
        formatText: [...new Set(formatWords)].join(' · '),
        isVinyl: isVinyl(formatWords),
        thumb: result.thumb || result.cover_image || '',
      };
    });
  // Keep Discogs' order otherwise, but put vinyl ahead of CDs and tapes.
  return [...matches.filter((m) => m.isVinyl), ...matches.filter((m) => !m.isVinyl)];
}

// Several artists are joined the way Discogs credits them, e.g. "A & B".
function artistNames(artists) {
  return (artists || []).map((artist, i, list) => {
    const name = cleanDiscogsName(artist.anv || artist.name);
    if (i === list.length - 1) return name;
    const join = String(artist.join || '').trim();
    if (join === '' || join === ',') return `${name}, `;
    return `${name} ${join} `;
  }).join('').trim();
}

function coverFrom(images) {
  const list = Array.isArray(images) ? images : [];
  const image = list.find((i) => i.type === 'primary') || list[0];
  const uri = image ? image.uri || image.resource_url || '' : '';
  return /^https:\/\//.test(uri) ? uri : '';
}

// One full release, as the fields of a new record.
export function parseRelease(json) {
  if (!json || !json.id) throw new Error('Discogs sent back something unexpected.');
  return {
    artist: artistNames(json.artists),
    title: String(json.title ?? '').trim(),
    year: yearFrom(json.year),
    label: firstRealLabel((json.labels || []).map((label) => label.name)),
    format: formatFromDiscogs(json.formats),
    discogsId: String(json.id),
    coverImage: coverFrom(json.images),
  };
}
