// Uses made-up copies of Claude's replies, so no key or signal is needed.

import { test, assert, assertEqual, assertDeepEqual } from './test-runner.js';
import {
  buildCoverRequest, parseCoverAnswer, splitDataUrl, coverSearchText, coverGuessName, CLAUDE_MODEL,
} from '../utils/cover-recognition.js';

const reply = (answer, extra = {}) => ({
  type: 'message',
  stop_reason: 'end_turn',
  content: [
    { type: 'thinking', thinking: '' },
    { type: 'text', text: typeof answer === 'string' ? answer : JSON.stringify(answer) },
  ],
  ...extra,
});

const astley = {
  recognised: true, artist: 'Rick Astley', title: 'Never Gonna Give You Up',
  confidence: 'high', catalogueNumber: 'PB 41447', label: 'RCA',
};

test('cover: a confident answer is read', () => {
  assertDeepEqual(parseCoverAnswer(reply(astley)), {
    status: 'recognised', artist: 'Rick Astley', title: 'Never Gonna Give You Up',
    confidence: 'high', catalogueNumber: 'PB 41447', label: 'RCA',
  });
});

test('cover: an unsure answer keeps its low confidence', () => {
  const answer = parseCoverAnswer(reply({ ...astley, confidence: 'low', catalogueNumber: '', label: '' }));
  assertEqual(answer.status, 'recognised');
  assertEqual(answer.confidence, 'low');
  assertEqual(answer.catalogueNumber, '');
});

test('cover: "not recognised" or no names means not recognised', () => {
  assertEqual(parseCoverAnswer(reply({ ...astley, recognised: false })).status, 'not-recognised');
  assertEqual(parseCoverAnswer(reply({ ...astley, artist: ' ', title: '' })).status, 'not-recognised');
  assertEqual(parseCoverAnswer(reply({ ...astley, recognised: false })).artist, '');
});

test('cover: a refusal is spotted before reading the answer', () => {
  assertEqual(parseCoverAnswer({ stop_reason: 'refusal', content: [] }).status, 'refused');
});

test('cover: missing, broken or odd replies fail gently', () => {
  assertEqual(parseCoverAnswer(null).status, 'failed');
  assertEqual(parseCoverAnswer({ content: [] }).status, 'failed');
  assertEqual(parseCoverAnswer(reply('not json {')).status, 'failed');
  assertEqual(parseCoverAnswer(reply('"just a string"')).status, 'failed');
  assertEqual(parseCoverAnswer({ stop_reason: 'max_tokens', content: [{ type: 'thinking', thinking: '' }] }).status, 'failed');
});

test('cover: text is tidied and an unknown confidence counts as low', () => {
  const answer = parseCoverAnswer(reply({ ...astley, artist: '  Rick \n Astley ', confidence: 'certain' }));
  assertEqual(answer.artist, 'Rick Astley');
  assertEqual(answer.confidence, 'low');
});

test('cover: a fallback reply uses its last text block', () => {
  const answer = parseCoverAnswer({
    stop_reason: 'end_turn',
    content: [
      { type: 'text', text: '{"recognised": false' },
      { type: 'fallback', model: 'claude-opus-5' },
      { type: 'text', text: JSON.stringify(astley) },
    ],
  });
  assertEqual(answer.title, 'Never Gonna Give You Up');
});

test('cover: the answer becomes a Discogs search and a name to show', () => {
  assertEqual(coverSearchText(astley), 'Rick Astley Never Gonna Give You Up');
  assertEqual(coverSearchText({ artist: '', title: 'Blue Lines' }), 'Blue Lines');
  assertEqual(coverGuessName(astley), 'Rick Astley – Never Gonna Give You Up');
  assertEqual(coverGuessName({ artist: 'Massive Attack', title: '' }), 'Massive Attack');
});

test('cover: a photo data URL is split into type and data', () => {
  assertDeepEqual(splitDataUrl('data:image/jpeg;base64,AbC123=='), { mediaType: 'image/jpeg', data: 'AbC123==' });
  assertEqual(splitDataUrl('not a photo'), null);
  assertEqual(splitDataUrl(undefined), null);
});

test('cover: the request sends the photo first, with a fixed answer shape', () => {
  const body = buildCoverRequest('AbC123==', 'image/jpeg');
  assertEqual(body.model, CLAUDE_MODEL);
  assertEqual(body.fallbacks, 'default');
  assertEqual(body.output_config.format.type, 'json_schema');
  assertEqual(body.output_config.format.schema.additionalProperties, false);
  const [image, text] = body.messages[0].content;
  assertEqual(image.type, 'image');
  assertEqual(image.source.data, 'AbC123==');
  assertEqual(text.type, 'text');
  assert(!('temperature' in body) && !('thinking' in body), 'No settings the model rejects');
});
