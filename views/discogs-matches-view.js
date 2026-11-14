// Looks a record up on Discogs, by barcode or by typed words, and shows
// what was found. For a barcode, one match opens the New Record form filled
// in; otherwise matches are listed to choose from. Nothing found offers
// adding by hand. Errors never lose what was scanned or typed.

import { searchByBarcode, searchDiscogs, getReleaseDetails } from '../services/discogs-service.js';
import { getAllRecords } from '../services/record-store.js';
import { checkBarcode, sameBarcode } from '../utils/barcode.js';
import { checkSearchText, markOwned } from '../utils/discogs-search.js';
import { setRecordDraft } from '../utils/record-draft.js';
import { createElement, escapeHtml } from '../utils/html.js';
import { icons } from '../utils/icons.js';
import { navigate, goBack } from '../utils/router.js';
import { coverArt } from './cover-art.js';

function matchRow(match, index) {
  const details = [match.year, match.country, match.label, match.catno].filter(Boolean).join(' · ');
  return `
    <button type="button" class="list-row match-row" data-index="${index}">
      ${coverArt({ artist: match.artist, title: match.title, coverImage: match.thumb })}
      <span class="list-text">
        <span class="list-title">${escapeHtml(match.title || 'Untitled')}</span>
        <span class="list-sub">${escapeHtml(match.artist)}</span>
        ${details ? `<span class="list-sub match-details">${escapeHtml(details)}</span>` : ''}
        ${match.formatText ? `<span class="list-sub match-details">${escapeHtml(match.formatText)}</span>` : ''}
        ${match.owned ? '<span class="owned-tag">In your collection</span>' : ''}
      </span>
      <span class="match-status">${icons.chevron}</span>
    </button>`;
}

function ownedNotice(owned) {
  if (owned.length === 0) return '';
  const first = owned[0];
  const name = `${first.artist} – ${first.title}`;
  const link = `<a href="#/record/${encodeURIComponent(first.id)}">${escapeHtml(name)}</a>`;
  const more = owned.length > 1 ? ` and ${owned.length - 1} more` : '';
  return `
    <div class="info-panel info-panel--left">
      <p><strong>Already in your collection:</strong> ${link}${more}. You can still add another copy.</p>
    </div>`;
}

async function loadRecords() {
  try {
    return await getAllRecords();
  } catch {
    return [];
  }
}

// Pass { barcode } for a barcode lookup, or { query } for a word search.
export async function renderDiscogsMatchesView({ barcode = null, query = null } = {}) {
  const byBarcode = barcode !== null;
  const barcodeCheck = byBarcode ? checkBarcode(barcode) : null;
  const searchCheck = byBarcode ? null : checkSearchText(query);
  const digits = byBarcode ? barcodeCheck.digits : '';
  const text = byBarcode ? '' : searchCheck.text;
  const title = byBarcode ? `Barcode ${digits}` : `“${text}”`;

  const node = createElement(`
    <div class="matches">
      <header class="nav-bar nav-bar--bordered">
        <button type="button" class="nav-button nav-left" data-action="back">${icons.back}Back</button>
        <span class="nav-title">${escapeHtml(title)}</span>
        <span class="nav-right"></span>
      </header>
      <div class="matches-body"></div>
    </div>`);

  const body = node.querySelector('.matches-body');
  node.querySelector('[data-action="back"]').addEventListener('click', () => goBack('/'));

  function addByHand() {
    setRecordDraft(byBarcode ? { barcode: digits } : {});
    navigate('/add');
  }

  function showLoading(message = 'Looking up on Discogs…') {
    body.innerHTML = `<div class="empty-state"><p role="status">${escapeHtml(message)}</p></div>`;
  }

  function showProblem(heading, message, { retry = false, settings = false, search = false } = {}) {
    body.innerHTML = `
      <div class="empty-state">
        <h2>${escapeHtml(heading)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="button-stack">
          ${retry ? '<button type="button" class="pill-button" data-action="retry">Try Again</button>' : ''}
          ${settings ? '<a class="pill-button" href="#/settings">Open Settings</a>' : ''}
          ${search ? '<a class="pill-button" href="#/scan/search">Search Discogs</a>' : ''}
          <button type="button" class="pill-button" data-action="by-hand">Add by Hand</button>
        </div>
      </div>`;
    body.querySelector('[data-action="by-hand"]').addEventListener('click', addByHand);
    const retryButton = body.querySelector('[data-action="retry"]');
    if (retryButton) retryButton.addEventListener('click', () => lookUp());
  }

  // Fetches the full release and opens the form with it filled in.
  async function choose(match, { replace = false } = {}) {
    try {
      const fields = await getReleaseDetails(match.discogsId);
      if (!node.isConnected) return true; // They left this screen while it loaded.
      setRecordDraft({ ...fields, barcode: digits, fromDiscogs: true });
      navigate('/add', { replace });
      return true;
    } catch (error) {
      return error;
    }
  }

  function showMatches(matches, { owned = [], total = matches.length } = {}) {
    // Mark this lookup as shown (only while it's the screen on show).
    if (node.isConnected) history.replaceState({ ...(history.state || {}), listed: true }, '');
    const heading = matches.length === 1 ? '1 match on Discogs' : `${matches.length} matches on Discogs`;
    const hint = total > matches.length
      ? `Showing the first ${matches.length} of ${total}. Add a word or two – the label, year or catalogue number – to narrow it down.`
      : 'Pick the one that matches your copy. The catalogue number and label on the sleeve help.';
    body.innerHTML = `
      ${ownedNotice(owned)}
      <p class="notice" role="alert" hidden></p>
      <h2 class="group-header group-header--first">${heading}</h2>
      <p class="matches-hint">${escapeHtml(hint)}</p>
      <div class="record-list">${matches.map(matchRow).join('')}</div>
      <div class="scan-footer">
        <button type="button" class="pill-button" data-action="by-hand">None of These – Add by Hand</button>
      </div>`;

    const notice = body.querySelector('.notice');
    body.querySelector('[data-action="by-hand"]').addEventListener('click', addByHand);
    body.querySelectorAll('.match-row').forEach((row) => {
      row.addEventListener('click', async () => {
        if (body.querySelector('.match-row[aria-busy="true"]')) return;
        row.setAttribute('aria-busy', 'true');
        row.querySelector('.match-status').innerHTML = '<span class="spinner" aria-label="Loading"></span>';
        notice.hidden = true;
        const result = await choose(matches[Number(row.dataset.index)]);
        if (result !== true) {
          row.removeAttribute('aria-busy');
          row.querySelector('.match-status').innerHTML = icons.chevron;
          notice.textContent = result.message || "That record couldn't be loaded. Please try again.";
          notice.hidden = false;
        }
      });
    });
  }

  function showError(error) {
    const settings = error.kind === 'no-token' || error.kind === 'token';
    showProblem(settings ? 'Discogs token needed' : 'Couldn’t look it up', error.message, { retry: !settings, settings });
  }

  async function lookUpBarcode() {
    let matches;
    try {
      matches = await searchByBarcode(digits);
    } catch (error) {
      showError(error);
      return;
    }

    if (matches.length === 0) {
      showProblem(
        'Not found on Discogs',
        'No release has this barcode. Try searching by artist, title or catalogue number, or add it by hand – the barcode is filled in for you.',
        { search: true },
      );
      return;
    }

    const records = await loadRecords();
    const owned = records.filter((record) => sameBarcode(record.barcode, digits));
    matches = markOwned(matches, records);
    // Only jump straight to the form the first time, never when coming Back.
    const seenBefore = Boolean(history.state && history.state.listed);
    if (matches.length === 1 && owned.length === 0 && !matches[0].owned && !seenBefore) {
      showLoading('Found it. Getting the details…');
      const result = await choose(matches[0], { replace: true });
      if (result === true) return;
      showMatches(matches, { owned });
      const notice = body.querySelector('.notice');
      notice.textContent = result.message;
      notice.hidden = false;
      return;
    }
    showMatches(matches, { owned });
  }

  async function lookUpWords() {
    let found;
    try {
      found = await searchDiscogs(text);
    } catch (error) {
      showError(error);
      return;
    }
    if (found.matches.length === 0) {
      showProblem(
        'Nothing found on Discogs',
        'No vinyl release matches that. Check the spelling, or try fewer words – just the catalogue number often works best.',
        { search: true },
      );
      return;
    }
    showMatches(markOwned(found.matches, await loadRecords()), { total: found.total });
  }

  function lookUp() {
    showLoading();
    return byBarcode ? lookUpBarcode() : lookUpWords();
  }

  if (byBarcode && !barcodeCheck.valid) {
    showProblem('That barcode doesn’t look right', 'Go back and check the numbers.', { search: true });
  } else if (!byBarcode && !searchCheck.valid) {
    showProblem('Nothing to search for', searchCheck.error, { search: true });
  } else {
    lookUp();
  }
  return node;
}
