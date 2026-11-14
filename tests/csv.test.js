import { test, assert, assertEqual, assertDeepEqual } from './test-runner.js';
import { toCsv, parseCsv } from '../utils/csv.js';

test('csv: plain values are written as they are', () => {
  assertEqual(toCsv([['a', 'b'], ['1', '']]), 'a,b\r\n1,\r\n');
});

test('csv: commas, quotes and line breaks are quoted', () => {
  assertEqual(toCsv([['Crosby, Stills & Nash', 'The "White" Album', 'line one\nline two']]),
    '"Crosby, Stills & Nash","The ""White"" Album","line one\nline two"\r\n');
});

test('csv: reading quoted commas, quotes and line breaks', () => {
  const rows = parseCsv('"Crosby, Stills & Nash","The ""White"" Album","line one\nline two"\r\n');
  assertDeepEqual(rows, [['Crosby, Stills & Nash', 'The "White" Album', 'line one\nline two']]);
});

test('csv: Excel\'s BOM, Windows and old Mac line endings are handled', () => {
  assertDeepEqual(parseCsv('﻿a,b\r\n1,2\r3,4\n'), [['a', 'b'], ['1', '2'], ['3', '4']]);
});

test('csv: blank lines are skipped and empty values kept', () => {
  assertDeepEqual(parseCsv('a,,c\n\n\n1,2,\n'), [['a', '', 'c'], ['1', '2', '']]);
});

test('csv: a file without a final line break still reads the last row', () => {
  assertDeepEqual(parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('csv: writing then reading gives back the same values', () => {
  const rows = [['id', 'notes'], ['x1', 'Bought at "Rough Trade", £12\nGatefold'], ['x2', '  spaces  '], ['x3', 'Björk – Début']];
  assertDeepEqual(parseCsv(toCsv(rows)), rows);
});

test('csv: an unclosed quote gives a friendly error', () => {
  let message = '';
  try { parseCsv('a,"b\n1,2'); } catch (error) { message = error.message; }
  assert(message.includes('quote'), message);
});
