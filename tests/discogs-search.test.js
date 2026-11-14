import { test, assert, assertEqual, assertDeepEqual } from './test-runner.js';
import { cleanSearchText, checkSearchText, markOwned } from '../utils/discogs-search.js';

test('search text: spaces are tidied', () => {
  assertEqual(cleanSearchText('  PB   41447 \n'), 'PB 41447');
  assertEqual(cleanSearchText(undefined), '');
});

test('search text: very long text is shortened', () => {
  assertEqual(cleanSearchText('a'.repeat(250)).length, 100);
});

test('search text: too short gets a friendly message', () => {
  const result = checkSearchText(' x ');
  assert(!result.valid);
  assert(result.error.includes('catalogue number'), result.error);
  assert(checkSearchText('Bowie').valid);
});

test('search results: records already owned are marked', () => {
  const matches = [{ discogsId: '1' }, { discogsId: '2' }, { discogsId: '3' }];
  const records = [{ discogsId: '2' }, { discogsId: '' }, { discogsId: ' 3 ' }, {}];
  assertDeepEqual(markOwned(matches, records).map((m) => m.owned), [false, true, true]);
  assertDeepEqual(markOwned(matches, []).map((m) => m.owned), [false, false, false]);
});
