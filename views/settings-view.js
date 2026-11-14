// The Settings screen: add, check or remove the Discogs token.

import { getDiscogsToken, saveDiscogsToken, removeDiscogsToken } from '../services/settings-store.js';
import { checkDiscogsToken } from '../services/discogs-service.js';
import { createElement, escapeHtml } from '../utils/html.js';

export function renderSettingsView() {
  const node = createElement(`
    <div class="settings">
      <header class="nav-bar nav-bar--bordered">
        <span class="nav-left"></span>
        <span class="nav-title">Settings</span>
        <span class="nav-right"></span>
      </header>

      <h2 class="group-header group-header--first">Discogs</h2>
      <form class="grouped" data-form="token" novalidate>
        <div class="row">
          <span class="row-label">Status</span>
          <span class="row-value" data-status></span>
        </div>
        <label class="row field">
          <span class="field-label">Token</span>
          <input name="token" type="password" autocomplete="off" autocapitalize="off"
            autocorrect="off" spellcheck="false" enterkeyhint="done">
        </label>
        <button type="submit" class="row row-button" data-action="save">Save Token</button>
        <button type="button" class="row row-button" data-action="check">Check Token</button>
        <button type="button" class="row row-button row-button--danger" data-action="remove">Remove Token</button>
      </form>
      <p class="settings-message" role="status" hidden></p>
      <div class="group-footer">
        <p>The app uses Discogs to fill in record details from a barcode. Your token is kept only on this phone.</p>
        <p>To get a token: sign in at discogs.com, open <strong>Settings</strong>, then <strong>Developers</strong>, and tap <strong>Generate new token</strong>. Copy it and paste it above.</p>
      </div>
    </div>`);

  const form = node.querySelector('[data-form="token"]');
  const input = form.elements.token;
  const status = node.querySelector('[data-status]');
  const message = node.querySelector('.settings-message');
  const buttons = node.querySelectorAll('[data-action="save"], [data-action="check"], [data-action="remove"]');

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.hidden = !text;
    message.classList.toggle('settings-message--error', isError);
  }

  function refresh() {
    const saved = getDiscogsToken() !== '';
    status.textContent = saved ? 'Token saved' : 'No token yet';
    input.placeholder = saved ? 'Paste a new token to replace it' : 'Paste your token';
    node.querySelector('[data-action="check"]').hidden = !saved;
    node.querySelector('[data-action="remove"]').hidden = !saved;
  }

  async function busy(task) {
    buttons.forEach((button) => { button.disabled = true; });
    try {
      await task();
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
      refresh();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const token = input.value.trim();
    if (!token) {
      showMessage('Paste your Discogs token first.', true);
      input.focus();
      return;
    }
    input.blur();
    busy(async () => {
      showMessage('Checking with Discogs…');
      try {
        const username = await checkDiscogsToken(token);
        saveDiscogsToken(token);
        input.value = '';
        showMessage(username ? `Saved. Connected to Discogs as ${username}.` : 'Saved. Connected to Discogs.');
      } catch (error) {
        if (error.kind === 'offline' || error.kind === 'busy' || error.kind === 'failed') {
          // Can't check right now, but the token may be fine, so keep it.
          saveDiscogsToken(token);
          input.value = '';
          showMessage(`Saved, but it couldn't be checked yet. ${error.message}`, true);
        } else if (error.kind === 'token') {
          showMessage("Discogs didn't accept that token, so it wasn't saved. Check you copied all of it.", true);
        } else {
          showMessage(error.message, true);
        }
      }
    });
  });

  node.querySelector('[data-action="check"]').addEventListener('click', () => busy(async () => {
    showMessage('Checking with Discogs…');
    try {
      const username = await checkDiscogsToken(getDiscogsToken());
      showMessage(username ? `Working. Connected to Discogs as ${username}.` : 'Working. Connected to Discogs.');
    } catch (error) {
      showMessage(error.message, true);
    }
  }));

  node.querySelector('[data-action="remove"]').addEventListener('click', () => {
    removeDiscogsToken();
    input.value = '';
    showMessage('Token removed from this phone.');
    refresh();
  });


  refresh();
  return node;
}

// Used by other screens to link here.
export const settingsLink = (label = 'Open Settings') =>
  `<a class="pill-button" href="#/settings">${escapeHtml(label)}</a>`;
