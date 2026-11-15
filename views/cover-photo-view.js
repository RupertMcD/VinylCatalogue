// The "Looking at the cover…" screen. Takes the photo chosen on the Add
// tab, asks Claude which record it is, then searches Discogs for it.
// If Claude can't tell, or there's no signal, it says so kindly and
// offers other ways to add the record.

import { getClaudeKey } from '../services/settings-store.js';
import { recogniseCover } from '../services/claude-service.js';
import { coverSearchText, coverGuessName } from '../utils/cover-recognition.js';
import { setCoverGuess } from '../utils/cover-guess.js';
import { resizeImageFile } from '../utils/image-resize.js';
import { getAddTarget } from '../utils/record-draft.js';
import { createElement, escapeHtml } from '../utils/html.js';
import { icons } from '../utils/icons.js';
import { navigate, goBack } from '../utils/router.js';

// Large enough for Claude to read small print, small enough to send quickly.
const PHOTO_SIZE = 1024;

let pendingFile = null;

// Called by the Add tab after a photo is taken.
export function setPendingCoverPhoto(file) {
  pendingFile = file;
}

// A button that opens the iPhone camera, for the Add tab and for retakes.
export function coverPhotoButton(label = 'Photograph the Cover') {
  return `
    <label class="pill-button cover-photo-button">
      ${escapeHtml(label)}
      <input type="file" accept="image/*" capture="environment" class="visually-hidden" data-action="cover-photo">
    </label>`;
}

export function renderCoverPhotoView() {
  const node = createElement(`
    <div class="cover-photo">
      <header class="nav-bar nav-bar--bordered">
        <button type="button" class="nav-button nav-left" data-action="back">${icons.back}Back</button>
        <span class="nav-title">Cover Photo</span>
        <span class="nav-right"></span>
      </header>
      <div class="cover-photo-body"></div>
    </div>`);

  const body = node.querySelector('.cover-photo-body');
  node.querySelector('[data-action="back"]').addEventListener('click', () => goBack('/'));
  const byHandLink = () => (getAddTarget() === 'wishlist' ? '#/add/wishlist' : '#/add');
  let photo = '';

  function photoHtml() {
    return photo ? `<img class="cover-photo-image" src="${photo}" alt="Your photo of the cover">` : '';
  }

  function showProblem(heading, message, { retry = false, settings = false, retake = true } = {}) {
    body.innerHTML = `
      ${photoHtml()}
      <div class="empty-state">
        <h2>${escapeHtml(heading)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="button-stack">
          ${settings ? '<a class="pill-button pill-button--primary" href="#/settings">Open Settings</a>' : ''}
          ${retry ? '<button type="button" class="pill-button" data-action="retry">Try Again</button>' : ''}
          ${retake ? coverPhotoButton('Take Another Photo') : ''}
          <a class="pill-button" href="#/scan/search" data-replace>Search Discogs</a>
          <a class="pill-button" href="${byHandLink()}" data-replace>Add by Hand</a>
        </div>
      </div>`;
    const retryButton = body.querySelector('[data-action="retry"]');
    if (retryButton) retryButton.addEventListener('click', () => lookAtPhoto());
    const retakeInput = body.querySelector('[data-action="cover-photo"]');
    if (retakeInput) {
      retakeInput.addEventListener('change', () => {
        const file = retakeInput.files[0];
        if (file) start(file);
      });
    }
  }

  async function lookAtPhoto() {
    body.innerHTML = `
      ${photoHtml()}
      <div class="empty-state">
        <p role="status"><span class="spinner" aria-hidden="true"></span> Looking at the cover…</p>
        <p class="cover-photo-note">This usually takes a few seconds.</p>
      </div>`;
    let answer;
    try {
      answer = await recogniseCover(photo);
    } catch (error) {
      if (!node.isConnected) return;
      const settings = ['no-key', 'key', 'credit'].includes(error.kind);
      showProblem(settings ? 'Check your Claude settings' : 'Couldn’t look at the cover', error.message, {
        settings,
        retry: !settings && error.kind !== 'refused' && error.kind !== 'photo',
      });
      return;
    }
    if (!node.isConnected) return; // They left this screen while Claude looked.
    const searchText = coverSearchText(answer);
    if (answer.status !== 'recognised' || searchText.length < 2) {
      showProblem(
        'Couldn’t recognise this cover',
        'Try a clearer photo of the whole front cover, in good light and without glare. Or search Discogs by name.',
      );
      return;
    }
    setCoverGuess(searchText, answer);
    pendingFile = null;
    body.innerHTML = `${photoHtml()}<div class="empty-state"><p role="status">Found ${escapeHtml(coverGuessName(answer))}. Searching Discogs…</p></div>`;
    navigate(`/search/${encodeURIComponent(searchText)}`, { replace: true });
  }

  async function start(file) {
    pendingFile = file;
    try {
      photo = await resizeImageFile(file, PHOTO_SIZE, 0.8);
    } catch (error) {
      photo = '';
      showProblem('Couldn’t open the photo', error.message);
      return;
    }
    lookAtPhoto();
  }

  if (!getClaudeKey()) {
    showProblem(
      'Claude API key needed',
      'To recognise covers, add your Claude API key in Settings first. You can still search Discogs by name.',
      { settings: true, retake: false },
    );
  } else if (!pendingFile) {
    showProblem('No photo yet', 'Take a photo of the front cover to find the record.');
  } else {
    start(pendingFile);
  }
  return node;
}
