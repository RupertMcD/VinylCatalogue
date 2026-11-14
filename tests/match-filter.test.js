import { test, assertEqual, assertDeepEqual } from './test-runner.js';
import { narrowMatches, squash } from '../utils/match-filter.js';

const matches = [
  { discogsId: '1', catno: 'PB 41447P', label: 'RCA', country: 'UK', year: 1987, formatText: 'Vinyl · 7" · Single', identifiers: ['5012394144777', 'PB 41447 A-1'] },
  { discogsId: '2', catno: 'PB 41447', label: 'RCA', country: 'Italy', year: 1987, formatText: 'Vinyl · 7"', identifiers: ['5012394144777', 'PB 41447 A 1S - 1A - 13 SPIRY'] },
  { discogsId: '3', catno: 'PT 41448', label: 'RCA', country: 'UK', year: 1987, formatText: 'Vinyl · 12" · Maxi-Single', identifiers: [] },
  { discogsId: '4', catno: '6784-1-RD', label: 'RCA Victor', country: 'US', year: 1988, formatText: 'Vinyl · 12"' },
];
const ids = (list) => list.map((m) => m.discogsId);

test('narrow: tidies text to letters and digits', () => {
  assertEqual(squash(' PB-41447.p '), 'pb41447p');
  assertEqual(squash(null), '');
});

test('narrow: an empty box shows everything', () => {
  assertDeepEqual(ids(narrowMatches(matches, '   ')), ['1', '2', '3', '4']);
});

test('narrow: the catalogue number matches however it is written', () => {
  assertDeepEqual(ids(narrowMatches(matches, 'PB 41447')), ['1', '2']);
  assertDeepEqual(ids(narrowMatches(matches, 'pb-41447p')), ['1']);
  assertDeepEqual(ids(narrowMatches(matches, '6784 1 RD')), ['4']);
});

test('narrow: a runout (matrix) number picks out one pressing', () => {
  assertDeepEqual(ids(narrowMatches(matches, 'SPIRY')), ['2']);
  assertDeepEqual(ids(narrowMatches(matches, 'A 1S 1A')), ['2']);
});

test('narrow: country, year and format words work together', () => {
  assertDeepEqual(ids(narrowMatches(matches, 'UK 1987')), ['1', '3']);
  assertDeepEqual(ids(narrowMatches(matches, 'uk maxi')), ['3']);
});

test('narrow: nothing matching gives an empty list', () => {
  assertDeepEqual(narrowMatches(matches, 'XYZ 999'), []);
});
