// Uses shortened copies of real Discogs replies, so no token or signal is needed.

import { test, assert, assertEqual, assertDeepEqual } from './test-runner.js';
import { parseSearchResults, parseRelease, formatFromDiscogs, cleanDiscogsName } from '../utils/discogs-parser.js';

const searchReply = {
  pagination: { page: 1, pages: 1, items: 3 },
  results: [
    {
      id: 900001, type: 'release', title: 'Rick Astley - Never Gonna Give You Up', year: '1987',
      country: 'Europe', label: ['RCA', 'BMG'], format: ['CD', 'Single'], catno: 'PD 41448',
      thumb: '', cover_image: '',
    },
    {
      id: 6778478, type: 'release', title: 'Rick Astley - Never Gonna Give You Up', year: '1987',
      country: 'UK', label: ['RCA', 'BMG Records (UK) Ltd.', 'RCA'], format: ['Vinyl', '7"', '45 RPM', 'Single'],
      catno: 'PB 41447P', thumb: 'https://i.discogs.com/thumb.jpg', cover_image: 'https://i.discogs.com/cover.jpg',
    },
    {
      id: 3396037, type: 'release', title: 'Nirvana (2) - Local Anaesthetic', year: '',
      country: 'UK', label: ['Not On Label (Nirvana (2)) Self-released', 'Vertigo'], format: ['Vinyl', 'LP', 'Album'],
      catno: 'none', thumb: '', cover_image: 'https://i.discogs.com/cover2.jpg',
    },
    { id: 55, type: 'master', title: 'Rick Astley - Never Gonna Give You Up' },
  ],
};

const releaseReply = {
  id: 249504,
  title: 'Never Gonna Give You Up ',
  year: 1987,
  artists: [{ name: 'Rick Astley', anv: '', join: '' }],
  labels: [{ name: 'RCA', catno: 'PB 41447' }],
  formats: [{ name: 'Vinyl', qty: '1', descriptions: ['7"', '45 RPM', 'Single', 'Stereo'] }],
  images: [
    { type: 'secondary', uri: 'https://i.discogs.com/back.jpg' },
    { type: 'primary', uri: 'https://i.discogs.com/front.jpg' },
  ],
};

test('discogs: search results list vinyl first and skip non-releases', () => {
  const matches = parseSearchResults(searchReply);
  assertDeepEqual(matches.map((m) => m.discogsId), ['6778478', '3396037', '900001']);
});

test('discogs: a search result is split into artist and title', () => {
  const [first] = parseSearchResults(searchReply);
  assertEqual(first.artist, 'Rick Astley');
  assertEqual(first.title, 'Never Gonna Give You Up');
  assertEqual(first.year, 1987);
  assertEqual(first.country, 'UK');
  assertEqual(first.label, 'RCA');
  assertEqual(first.catno, 'PB 41447P');
  assertEqual(first.formatText, 'Vinyl · 7" · 45 RPM · Single');
  assertEqual(first.thumb, 'https://i.discogs.com/thumb.jpg');
});

test('discogs: numbered names, "Not On Label", "none" and missing years are tidied', () => {
  const nirvana = parseSearchResults(searchReply)[1];
  assertEqual(nirvana.artist, 'Nirvana');
  assertEqual(nirvana.label, 'Vertigo');
  assertEqual(nirvana.catno, '');
  assertEqual(nirvana.year, null);
  assertEqual(nirvana.thumb, 'https://i.discogs.com/cover2.jpg');
});

test('discogs: an empty or odd search reply gives no matches', () => {
  assertDeepEqual(parseSearchResults({ results: [] }), []);
  assertDeepEqual(parseSearchResults(null), []);
  assertDeepEqual(parseSearchResults({ message: 'error' }), []);
});

test('discogs: a release becomes record fields', () => {
  assertDeepEqual(parseRelease(releaseReply), {
    artist: 'Rick Astley',
    title: 'Never Gonna Give You Up',
    year: 1987,
    label: 'RCA',
    format: '7"',
    discogsId: '249504',
    coverImage: 'https://i.discogs.com/front.jpg',
  });
});

test('discogs: several artists are joined as credited', () => {
  const release = parseRelease({
    ...releaseReply,
    artists: [
      { name: 'Simon (3)', anv: '', join: '&' },
      { name: 'Garfunkel', anv: '', join: ',' },
      { name: 'Prince', anv: 'The Artist*', join: '' },
    ],
  });
  assertEqual(release.artist, 'Simon & Garfunkel, The Artist');
});

test('discogs: a release with no year, label or pictures still works', () => {
  const release = parseRelease({ id: 1234567, title: 'Longa Nova', year: 0, artists: [{ name: 'Asia Minor' }], labels: [], formats: [] });
  assertEqual(release.year, null);
  assertEqual(release.label, '');
  assertEqual(release.format, 'LP');
  assertEqual(release.coverImage, '');
});

test('discogs: only secure picture addresses are kept', () => {
  const release = parseRelease({ ...releaseReply, images: [{ type: 'primary', uri: 'http://example.com/a.jpg' }] });
  assertEqual(release.coverImage, '');
});

test('discogs: a broken release reply gives a friendly error', () => {
  let message = '';
  try { parseRelease({ message: 'Release not found.' }); } catch (error) { message = error.message; }
  assert(message.includes('unexpected'), message);
});

test('discogs: formats are mapped to the app\'s formats', () => {
  assertEqual(formatFromDiscogs([{ name: 'Vinyl', descriptions: ['LP', 'Album'] }]), 'LP');
  assertEqual(formatFromDiscogs([{ name: 'Vinyl', descriptions: ['12"', '45 RPM', 'Maxi-Single'] }]), '12"');
  assertEqual(formatFromDiscogs([{ name: 'Vinyl', descriptions: ['7"', 'Single'] }]), '7"');
  assertEqual(formatFromDiscogs([{ name: 'Box Set' }, { name: 'Vinyl', qty: '5', descriptions: ['LP'] }]), 'Box set');
  assertEqual(formatFromDiscogs([{ name: 'Vinyl', descriptions: ['LP', '12"'] }]), 'LP');
  assertEqual(formatFromDiscogs([]), 'LP');
});

test('discogs: name tidying', () => {
  assertEqual(cleanDiscogsName('Nirvana (2)'), 'Nirvana');
  assertEqual(cleanDiscogsName('The Artist*'), 'The Artist');
  assertEqual(cleanDiscogsName('Sly & The Family Stone'), 'Sly & The Family Stone');
  assertEqual(cleanDiscogsName(undefined), '');
});

test('discogs: each pressing keeps its other numbers for narrowing down', () => {
  const [match] = parseSearchResults({ results: [{ id: 5, type: 'release', title: 'A - B', format: ['Vinyl'], barcode: ['5012394144777', 'PB 41447 A 1S', 7] }] });
  assertDeepEqual(match.identifiers, ['5012394144777', 'PB 41447 A 1S']);
  assertDeepEqual(parseSearchResults({ results: [{ id: 6, type: 'release', title: 'A - B' }] })[0].identifiers, []);
});
