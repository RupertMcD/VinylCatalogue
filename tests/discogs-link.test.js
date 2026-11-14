import { test, assertEqual } from './test-runner.js';
import { discogsReleaseUrl, parseDiscogsReleaseLink } from '../utils/discogs-link.js';

test('discogs link: made from a Discogs ID', () => {
  assertEqual(discogsReleaseUrl('249504'), 'https://www.discogs.com/release/249504');
  assertEqual(discogsReleaseUrl(' 249504 '), 'https://www.discogs.com/release/249504');
  assertEqual(discogsReleaseUrl(''), '');
  assertEqual(discogsReleaseUrl('abc'), '');
});

test('discogs link: the release ID is found in pasted links', () => {
  assertEqual(parseDiscogsReleaseLink('https://www.discogs.com/release/249504-Rick-Astley-Never-Gonna-Give-You-Up'), '249504');
  assertEqual(parseDiscogsReleaseLink('https://www.discogs.com/release/249504'), '249504');
  assertEqual(parseDiscogsReleaseLink('discogs.com/release/249504'), '249504');
  assertEqual(parseDiscogsReleaseLink('  https://www.discogs.com/de/release/249504-Rick-Astley  '), '249504');
  assertEqual(parseDiscogsReleaseLink('https://www.discogs.com/sell/release/249504?ev=rb'), '249504');
  assertEqual(parseDiscogsReleaseLink('https://m.discogs.com/release/249504'), '249504');
});

test('discogs link: other text and other sites are not treated as links', () => {
  assertEqual(parseDiscogsReleaseLink('Rick Astley'), '');
  assertEqual(parseDiscogsReleaseLink('PB 41447'), '');
  assertEqual(parseDiscogsReleaseLink('https://www.discogs.com/master/45040-Rick-Astley'), '');
  assertEqual(parseDiscogsReleaseLink('https://notdiscogs.com/release/249504'), '');
  assertEqual(parseDiscogsReleaseLink('https://example.com/discogs.com/release/249504'), '');
});
