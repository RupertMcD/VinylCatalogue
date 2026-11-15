// Recognising a record from a photo of its cover. Builds the question
// sent to Claude and reads Claude's answer. No network here: the call is
// made by services/claude-service.js. Pure logic, so it can be tested.

import { cleanSearchText } from './discogs-search.js';

export const CLAUDE_MODEL = 'claude-opus-5-5';

const INSTRUCTIONS = `You identify vinyl records from a photo of the sleeve, so a collector can find the release on Discogs.
Read the photo and give the artist and the album or single title, exactly as they would be listed on Discogs.
Use any text you can read on the sleeve, and your knowledge of well-known cover art.
If you can see a catalogue number or record label, include them; otherwise leave them as empty strings.
If the photo isn't a record sleeve, or you can't tell what it is, set recognised to false and leave the other text empty.
Set confidence to "high" only when you are sure; use "low" when you are guessing.`;

// The fixed shape Claude must answer in.
const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    recognised: { type: 'boolean' },
    artist: { type: 'string' },
    title: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    catalogueNumber: { type: 'string' },
    label: { type: 'string' },
  },
  required: ['recognised', 'artist', 'title', 'confidence', 'catalogueNumber', 'label'],
  additionalProperties: false,
};

// The request body for Claude's Messages API. `imageData` is the photo as
// base64 text (without the "data:" prefix).
export function buildCoverRequest(imageData, mediaType = 'image/jpeg') {
  return {
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    // If Claude declines, the request is tried again on another model.
    fallbacks: 'default',
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: ANSWER_SCHEMA },
    },
    system: INSTRUCTIONS,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
        { type: 'text', text: 'Which record is this?' },
      ],
    }],
  };
}

// Strips the "data:image/jpeg;base64," start from a photo's data URL.
export function splitDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(String(dataUrl ?? ''));
  return match ? { mediaType: match[1], data: match[2] } : null;
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

// Reads Claude's reply. Returns { status, artist, title, confidence,
// catalogueNumber, label }, where status is:
//   'recognised'     – an artist or title was found
//   'not-recognised' – Claude couldn't tell what it is
//   'refused'        – Claude declined to look at the photo
//   'failed'         – the reply wasn't readable
export function parseCoverAnswer(reply) {
  const empty = { artist: '', title: '', confidence: 'low', catalogueNumber: '', label: '' };
  if (!reply || typeof reply !== 'object') return { status: 'failed', ...empty };
  if (reply.stop_reason === 'refusal') return { status: 'refused', ...empty };

  const texts = (Array.isArray(reply.content) ? reply.content : [])
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string');
  if (texts.length === 0) return { status: 'failed', ...empty };

  let answer;
  try {
    answer = JSON.parse(texts[texts.length - 1].text);
  } catch {
    return { status: 'failed', ...empty };
  }
  if (!answer || typeof answer !== 'object') return { status: 'failed', ...empty };

  const result = {
    artist: cleanText(answer.artist),
    title: cleanText(answer.title),
    confidence: ['high', 'medium', 'low'].includes(answer.confidence) ? answer.confidence : 'low',
    catalogueNumber: cleanText(answer.catalogueNumber),
    label: cleanText(answer.label),
  };
  if (answer.recognised !== true || (!result.artist && !result.title)) {
    return { status: 'not-recognised', ...empty };
  }
  return { status: 'recognised', ...result };
}

// The words to search Discogs with: artist and title.
export function coverSearchText(answer) {
  return cleanSearchText([answer?.artist, answer?.title].filter(Boolean).join(' '));
}

// "Rick Astley – Never Gonna Give You Up", for showing to you.
export function coverGuessName(answer) {
  return [answer?.artist, answer?.title].filter(Boolean).join(' – ');
}
