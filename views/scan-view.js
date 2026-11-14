// The Add by Barcode screen: scan with the camera, type the numbers under
// the barcode, or search Discogs by artist, title or catalogue number.
// Each goes on to the Discogs lookup.

import { getDiscogsToken } from '../services/settings-store.js';
import { checkBarcode } from '../utils/barcode.js';
import { checkSearchText } from '../utils/discogs-search.js';
import { createElement } from '../utils/html.js';
import { icons } from '../utils/icons.js';
import { navigate, goBack } from '../utils/router.js';

export function renderScanView({ startWithSearch = false } = {}) {
  const hasToken = getDiscogsToken() !== '';

  const node = createElement(`
    <div class="scan">
      <header class="nav-bar nav-bar--bordered">
        <button type="button" class="nav-button nav-left" data-action="back">${icons.back}Collection</button>
        <span class="nav-title">Find a Record</span>
        <span class="nav-right"></span>
      </header>

      ${hasToken ? '' : `
        <div class="info-panel">
          <p>To look records up, add your Discogs token in Settings first.</p>
          <a class="pill-button" href="#/settings">Open Settings</a>
        </div>`}

      <section class="camera" aria-label="Camera">
        <video class="camera-video" playsinline muted autoplay></video>
        <div class="camera-guide" aria-hidden="true"></div>
        <div class="camera-message" role="status">Starting the camera…</div>
      </section>
      <p class="camera-hint">Line the barcode up inside the frame.</p>
      <div class="camera-retry" hidden>
        <button type="button" class="pill-button" data-action="retry-camera">Try the Camera Again</button>
      </div>

      <h2 class="group-header">Or type the barcode</h2>
      <form class="grouped" data-form="barcode" novalidate>
        <label class="row field" data-field="barcode">
          <span class="visually-hidden">Barcode numbers</span>
          <input name="barcode" inputmode="numeric" autocomplete="off" placeholder="e.g. 5 012394 144777"
            enterkeyhint="search" aria-describedby="barcode-error">
          <span class="field-error scan-error" id="barcode-error" hidden></span>
        </label>
        <button type="submit" class="row row-button">Look Up</button>
      </form>

      <h2 class="group-header" id="search-heading">No barcode? Search Discogs</h2>
      <form class="grouped" data-form="search" novalidate>
        <label class="row field" data-field="search">
          <span class="visually-hidden">Artist, title or catalogue number</span>
          <input name="search" type="search" autocomplete="off" autocorrect="off" spellcheck="false"
            placeholder="Artist and title, or catalogue no." enterkeyhint="search" aria-describedby="search-error">
          <span class="field-error scan-error" id="search-error" hidden></span>
        </label>
        <button type="submit" class="row row-button">Search</button>
      </form>
      <p class="matches-hint scan-search-hint">The catalogue number is usually on the spine or the label, for example PB 41447.</p>

      <div class="scan-footer">
        <a class="pill-button" href="#/add">Add Without a Barcode</a>
      </div>
    </div>`);

  const form = node.querySelector('[data-form="barcode"]');
  const input = form.elements.barcode;
  const row = form.querySelector('[data-field="barcode"]');
  const error = form.querySelector('.field-error');

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
    row.classList.toggle('field--invalid', Boolean(message));
    input.toggleAttribute('aria-invalid', Boolean(message));
  }

  input.addEventListener('input', () => showError(''));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = checkBarcode(input.value);
    if (!result.valid) {
      showError(result.error);
      input.focus();
      return;
    }
    showError('');
    input.blur();
    navigate(`/lookup/${result.digits}`);
  });

  // Search Discogs by words.
  const searchForm = node.querySelector('[data-form="search"]');
  const searchInput = searchForm.elements.search;
  const searchRow = searchForm.querySelector('[data-field="search"]');
  const searchError = searchForm.querySelector('.field-error');

  function showSearchError(message) {
    searchError.textContent = message;
    searchError.hidden = !message;
    searchRow.classList.toggle('field--invalid', Boolean(message));
    searchInput.toggleAttribute('aria-invalid', Boolean(message));
  }

  searchInput.addEventListener('input', () => showSearchError(''));

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = checkSearchText(searchInput.value);
    if (!result.valid) {
      showSearchError(result.error);
      searchInput.focus();
      return;
    }
    showSearchError('');
    searchInput.blur();
    navigate(`/search/${encodeURIComponent(result.text)}`);
  });

  node.querySelector('[data-action="back"]').addEventListener('click', () => goBack('/'));

  // The camera. It stops when this screen closes or the app goes into the background.
  const camera = node.querySelector('.camera');
  const video = node.querySelector('.camera-video');
  const cameraMessage = node.querySelector('.camera-message');
  const hint = node.querySelector('.camera-hint');
  const retry = node.querySelector('.camera-retry');
  const retryButton = node.querySelector('[data-action="retry-camera"]');
  let scanner = null;
  let closed = false;

  function setCameraState(state, message = '') {
    camera.dataset.state = state;
    cameraMessage.textContent = message;
    cameraMessage.hidden = !message;
    hint.hidden = state !== 'scanning';
    retry.hidden = state !== 'error' && state !== 'paused';
    const afterScan = Boolean(history.state && history.state.scanned);
    retryButton.textContent = state !== 'paused'
      ? 'Try the Camera Again'
      : (afterScan ? 'Scan Another Record' : 'Use the Camera');
  }

  async function startCamera() {
    if (closed || scanner) return;
    setCameraState('starting', 'Starting the camera…');
    let startCameraScanner;
    try {
      ({ startCameraScanner } = await import('../utils/camera-scanner.js'));
    } catch {
      setCameraState('error', "The barcode scanner couldn't load. You can type the barcode below.");
      return;
    }
    if (closed) return;
    scanner = startCameraScanner(video, {
      onStarted: () => setCameraState('scanning'),
      onNeedsTap: () => setCameraState('tap', 'Tap here to show the camera'),
      onFound: (digits) => {
        scanner = null;
        setCameraState('found', `Found ${digits}`);
        // Remember this scan, so coming Back here doesn't scan the same record again.
        history.replaceState({ ...(history.state || {}), scanned: true }, '');
        navigate(`/lookup/${digits}`);
      },
      onError: (message) => {
        scanner = null;
        setCameraState('error', message);
      },
    });
  }

  function stopCamera() {
    if (scanner) scanner.stop();
    scanner = null;
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stopCamera();
    } else if (['starting', 'scanning', 'tap'].includes(camera.dataset.state)) {
      startCamera();
    }
  }

  // If iOS needs a tap before it shows the camera picture.
  camera.addEventListener('click', () => {
    if (camera.dataset.state !== 'tap') return;
    video.play().then(() => setCameraState('scanning')).catch(() => {});
  });

  retryButton.addEventListener('click', () => {
    history.replaceState({ ...(history.state || {}), scanned: false }, '');
    startCamera();
  });
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Called by the router when another screen replaces this one.
  node.cleanup = () => {
    closed = true;
    stopCamera();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  // Coming Back after a scan: wait to be asked, rather than scanning again.
  if (history.state && history.state.scanned) {
    setCameraState('paused', 'Ready for the next record.');
  } else if (startWithSearch) {
    // Arrived to search by words: keep the camera off and show the search box.
    setCameraState('paused', 'Camera paused while you search.');
    requestAnimationFrame(() => node.querySelector('#search-heading').scrollIntoView({ block: 'start' }));
  } else {
    startCamera();
  }
  return node;
}
