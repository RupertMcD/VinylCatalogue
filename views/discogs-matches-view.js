// Looks a barcode up on Discogs and shows what was found:
// one match opens the New Record form filled in; several are listed to
// choose from; none offers adding by hand. Errors never lose the barcode.

import { searchByBarcode, getReleaseDetails } from '../services/discogs-service.js';
import { getAllRecords } from '../services/record-store.js';
import { checkBarcode, sameBarcode } from '../utils/barcode.js';
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

async function findOwned(barcode) {
  try {
    return (await getAllRecords()).filter((record) => sameBarcode(record.barcode, barcode));
  } catch {
    return [];
  }
}

export async function renderDiscogsMatchesView(barcodeText) {
  const { valid, digits } = checkBarcode(barcodeText);

  const node = createElement(`
    <div class="matches">
      <header class="nav-bar nav-bar--bordered">
        <button type="button" class="nav-button nav-left" data-action="back">${icons.back}Back</button>
        <span class="nav-title">Barcode ${escapeHtml(digits)}</span>
        <span class="nav-right"></span>
      </header>
      <div class="matches-body">
        <div class="empty-state"><p role="status">Looking up on Discogs…</p></div>
      </div>
    </div>`);

  const body = node.querySelector('.matches-body');
  node.querySelector('[data-action="back"]').addEventListener('click', () => goBack('/scan'));

  function addByHand() {
    setRecordDraft({ barcode: digits });
    navigate('/add');
  }

  function showProblem(title, message, { retry = false, settings = false } = {}) {
    body.innerHTML = `
      <div class="empty-state">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="button-stack">
          ${retry ? '<button type="button" class="pill-button" data-action="retry">Try Again</button>' : ''}
          ${settings ? '<a class="pill-button" href="#/settings">Open Settings</a>' : ''}
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

  function showMatches(matches, owned) {
    const heading = matches.length === 1 ? '1 match on Discogs' : `${matches.length} matches on Discogs`;
    body.innerHTML = `
      ${ownedNotice(owned)}
      <p class="notice" role="alert" hidden></p>
      <h2 class="group-header group-header--first">${heading}</h2>
      <p class="matches-hint">Pick the one that matches your copy. The catalogue number and label on the sleeve help.</p>
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

  async function lookUp() {
    body.innerHTML = '<div class="empty-state"><p role="status">Looking up on Discogs…</p></div>';
    let matches;
    try {
      matches = await searchByBarcode(digits);
    } catch (error) {
      const settings = error.kind === 'no-token' || error.kind === 'token';
      const retry = !settings;
      showProblem(settings ? 'Discogs token needed' : 'Couldn’t look it up', error.message, { retry, settings });
      return;
    }

    if (matches.length === 0) {
      showProblem('Not found on Discogs', 'No release has this barcode. You can add it by hand – the barcode is filled in for you.');
      return;
    }

    const owned = await findOwned(digits);
    if (matches.length === 1 && owned.length === 0) {
      body.innerHTML = '<div class="empty-state"><p role="status">Found it. Getting the details…</p></div>';
      const result = await choose(matches[0], { replace: true });
      if (result === true) return;
      showMatches(matches, owned);
      const notice = body.querySelector('.notice');
      notice.textContent = result.message;
      notice.hidden = false;
      return;
    }
    showMatches(matches, owned);
  }

  if (!valid) {
    showProblem('That barcode doesn’t look right', 'Go back and check the numbers.');
  } else {
    lookUp();
  }
  return node;
}
