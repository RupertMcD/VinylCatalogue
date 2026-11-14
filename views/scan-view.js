// The Add by Barcode screen: type the numbers under the barcode
// (the camera scanner is added on top of this).

import { getDiscogsToken } from '../services/settings-store.js';
import { checkBarcode } from '../utils/barcode.js';
import { createElement } from '../utils/html.js';
import { icons } from '../utils/icons.js';
import { navigate, goBack } from '../utils/router.js';

export function renderScanView() {
  const hasToken = getDiscogsToken() !== '';

  const node = createElement(`
    <div class="scan">
      <header class="nav-bar nav-bar--bordered">
        <button type="button" class="nav-button nav-left" data-action="back">${icons.back}Collection</button>
        <span class="nav-title">Add by Barcode</span>
        <span class="nav-right"></span>
      </header>

      ${hasToken ? '' : `
        <div class="info-panel">
          <p>To look records up, add your Discogs token in Settings first.</p>
          <a class="pill-button" href="#/settings">Open Settings</a>
        </div>`}

      <h2 class="group-header group-header--first">Type the barcode</h2>
      <form class="grouped" data-form="barcode" novalidate>
        <label class="row field" data-field="barcode">
          <span class="visually-hidden">Barcode numbers</span>
          <input name="barcode" inputmode="numeric" autocomplete="off" placeholder="e.g. 5 012394 144777"
            enterkeyhint="search" aria-describedby="barcode-error">
          <span class="field-error scan-error" id="barcode-error" hidden></span>
        </label>
        <button type="submit" class="row row-button">Look Up</button>
      </form>

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

  node.querySelector('[data-action="back"]').addEventListener('click', () => goBack('/'));
  return node;
}
