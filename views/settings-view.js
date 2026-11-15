// The Settings screen: the Discogs token, the Claude API key, shelves,
// and backing up the collection to a CSV file (and restoring from one).

import {
  getDiscogsToken, saveDiscogsToken, removeDiscogsToken, getLastExport, setLastExport,
  getClaudeKey, saveClaudeKey, removeClaudeKey,
} from '../services/settings-store.js';
import { checkDiscogsToken } from '../services/discogs-service.js';
import { checkClaudeKey } from '../services/claude-service.js';
import { getAllRecords, saveRecords } from '../services/record-store.js';
import { listShelves, renameShelf, removeShelf, cleanShelfName } from '../models/shelves.js';
import { showConfirmSheet } from './confirm-sheet.js';
import { showToast } from './toast.js';
import { recordsToCsv, exportFileName, readRecordsCsv, planImport } from '../models/record-csv.js';
import { sortRecords } from '../utils/search.js';
import { formatDate } from '../utils/format.js';
import { shareOrDownloadFile } from '../utils/file-share.js';
import { createElement, escapeHtml } from '../utils/html.js';
import { navigate } from '../utils/router.js';
import { setPendingImport } from './import-preview-view.js';

const recordCount = (n) => (n === 1 ? '1 record' : `${n} records`);

export async function renderSettingsView() {
  let records = [];
  let loadError = '';
  try {
    records = sortRecords(await getAllRecords());
  } catch (error) {
    loadError = error.message;
  }

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
      <p class="settings-message" data-token-message role="status" hidden></p>
      <div class="group-footer">
        <p>The app uses Discogs to fill in record details from a barcode. Your token is kept only on this phone.</p>
        <p>To get a token: sign in at discogs.com, open <strong>Settings</strong>, then <strong>Developers</strong>, and tap <strong>Generate new token</strong>. Copy it and paste it above.</p>
      </div>

      <h2 class="group-header">Cover Photos</h2>
      <form class="grouped" data-form="claude" novalidate>
        <div class="row">
          <span class="row-label">Status</span>
          <span class="row-value" data-claude-status></span>
        </div>
        <label class="row field">
          <span class="field-label">API key</span>
          <input name="key" type="password" autocomplete="off" autocapitalize="off"
            autocorrect="off" spellcheck="false" enterkeyhint="done">
        </label>
        <button type="submit" class="row row-button" data-claude-action="save">Save Key</button>
        <button type="button" class="row row-button" data-claude-action="check">Check Key</button>
        <button type="button" class="row row-button row-button--danger" data-claude-action="remove">Remove Key</button>
      </form>
      <p class="settings-message" data-claude-message role="status" hidden></p>
      <div class="group-footer">
        <p>With a key, you can photograph a record's front cover on the Add tab, and Claude (Anthropic's AI) works out which record it is. The photo is sent to Anthropic to be read, and isn't kept by the app. Your key is kept only on this phone.</p>
        <p>Claude's API is paid by use, separately from any Claude subscription: about 1p per photo. To get a key: sign in at platform.claude.com, open <strong>Settings</strong>, then <strong>API Keys</strong>, and tap <strong>Create Key</strong>. Name it "Vinyl", copy it and paste it above. In <strong>Settings</strong>, then <strong>Limits</strong>, you can set a low monthly spend limit.</p>
      </div>

      <h2 class="group-header">Shelves</h2>
      <div class="grouped" data-shelves></div>
      <p class="settings-message" data-shelves-message role="status" hidden></p>
      <div class="group-footer">
        <p>Add shelves to a record when you edit it. Renaming a shelf changes it on every record. Deleting a shelf takes it off records but never deletes the records.</p>
      </div>

      <h2 class="group-header">Backup</h2>
      <div class="grouped">
        <div class="row">
          <span class="row-label">Records</span>
          <span class="row-value" data-count></span>
        </div>
        <div class="row">
          <span class="row-label">Last export</span>
          <span class="row-value" data-last-export></span>
        </div>
        <button type="button" class="row row-button" data-action="export">Export to CSV</button>
        <label class="row row-button" data-action="import">
          Import from CSV
          <input type="file" accept=".csv,text/csv,text/comma-separated-values" class="visually-hidden" data-action="choose-csv">
        </label>
      </div>
      <p class="settings-message" data-backup-message role="status" hidden></p>
      <div class="group-footer">
        <p>Your records are kept only on this phone. Deleting the app from your Home Screen or clearing Safari's website data deletes them.</p>
        <p>Export after each cataloguing session and choose <strong>Save to Files</strong>, ideally in iCloud Drive. The file opens in Numbers or Excel, but keep the original as your backup.</p>
        <p>Import shows you what it will add first. It skips records already in the app and never changes them.</p>
      </div>
    </div>`);

  const form = node.querySelector('[data-form="token"]');
  const input = form.elements.token;
  const status = node.querySelector('[data-status]');
  const message = node.querySelector('[data-token-message]');
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

  // The Claude API key, for cover photos. Works like the Discogs token.
  const claudeForm = node.querySelector('[data-form="claude"]');
  const claudeInput = claudeForm.elements.key;
  const claudeStatus = node.querySelector('[data-claude-status]');
  const claudeMessage = node.querySelector('[data-claude-message]');
  const claudeButtons = claudeForm.querySelectorAll('button');
  const claudeButton = (action) => claudeForm.querySelector(`[data-claude-action="${action}"]`);

  function showClaudeMessage(text, isError = false) {
    claudeMessage.textContent = text;
    claudeMessage.hidden = !text;
    claudeMessage.classList.toggle('settings-message--error', isError);
  }

  function refreshClaude() {
    const saved = getClaudeKey() !== '';
    claudeStatus.textContent = saved ? 'Key saved' : 'No key yet';
    claudeInput.placeholder = saved ? 'Paste a new key to replace it' : 'Paste your key';
    claudeButton('check').hidden = !saved;
    claudeButton('remove').hidden = !saved;
  }

  async function claudeBusy(task) {
    claudeButtons.forEach((button) => { button.disabled = true; });
    try {
      await task();
    } finally {
      claudeButtons.forEach((button) => { button.disabled = false; });
      refreshClaude();
    }
  }

  claudeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const key = claudeInput.value.trim();
    if (!key) {
      showClaudeMessage('Paste your Claude API key first.', true);
      claudeInput.focus();
      return;
    }
    claudeInput.blur();
    claudeBusy(async () => {
      showClaudeMessage('Checking with Claude…');
      try {
        await checkClaudeKey(key);
        saveClaudeKey(key);
        claudeInput.value = '';
        showClaudeMessage('Saved. Connected to Claude.');
      } catch (error) {
        if (error.kind === 'key') {
          showClaudeMessage("Claude didn't accept that key, so it wasn't saved. Check you copied all of it.", true);
        } else if (error.kind === 'offline' || error.kind === 'slow' || error.kind === 'busy' || error.kind === 'failed') {
          // Can't check right now, but the key may be fine, so keep it.
          saveClaudeKey(key);
          claudeInput.value = '';
          showClaudeMessage(`Saved, but it couldn't be checked yet. ${error.message}`, true);
        } else {
          showClaudeMessage(error.message, true);
        }
      }
    });
  });

  claudeButton('check').addEventListener('click', () => claudeBusy(async () => {
    showClaudeMessage('Checking with Claude…');
    try {
      await checkClaudeKey(getClaudeKey());
      showClaudeMessage('Working. Connected to Claude.');
    } catch (error) {
      showClaudeMessage(error.message, true);
    }
  }));

  claudeButton('remove').addEventListener('click', () => {
    removeClaudeKey();
    claudeInput.value = '';
    showClaudeMessage('Key removed from this phone.');
    refreshClaude();
  });

  // Backup. The file is prepared now, so a tap can open the share sheet
  // straight away (iOS only allows that directly after a tap).
  const backupMessage = node.querySelector('[data-backup-message]');
  const exportButton = node.querySelector('[data-action="export"]');
  const makeFile = () => new File([recordsToCsv(records)], exportFileName(), { type: 'text/csv' });
  let file = makeFile();

  function showBackupMessage(text, isError = false) {
    backupMessage.textContent = text;
    backupMessage.hidden = !text;
    backupMessage.classList.toggle('settings-message--error', isError);
  }

  function refreshBackup() {
    const wished = records.filter((record) => record.list === 'wishlist').length;
    node.querySelector('[data-count]').textContent = loadError ? 'Not available'
      : `${recordCount(records.length - wished)}${wished ? ` + ${wished} on wishlist` : ''}`;
    const last = getLastExport();
    node.querySelector('[data-last-export]').textContent = last ? formatDate(last) : 'Never';
    exportButton.disabled = Boolean(loadError) || records.length === 0;
  }

  exportButton.addEventListener('click', async () => {
    showBackupMessage('');
    let result;
    try {
      result = await shareOrDownloadFile(file);
    } catch {
      showBackupMessage("The file couldn't be saved. Please try again.", true);
      return;
    }
    if (result === 'cancelled') return;
    setLastExport(new Date().toISOString());
    refreshBackup();
    showBackupMessage(result === 'shared'
      ? `Exported ${recordCount(records.length)}. Keep the file somewhere safe.`
      : `Exported ${recordCount(records.length)} to your Downloads.`);
  });

  // Import: read the chosen file and show the preview. Nothing is added yet.
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  node.querySelector('[data-action="choose-csv"]').addEventListener('change', async (event) => {
    const chosen = event.target.files[0];
    event.target.value = '';
    if (!chosen) return;
    showBackupMessage('');
    if (chosen.size > MAX_FILE_SIZE) {
      showBackupMessage("That file is too big to be a Vinyl Catalogue backup.", true);
      return;
    }
    let text;
    try {
      text = await chosen.text();
    } catch {
      showBackupMessage("That file couldn't be opened. Please try again.", true);
      return;
    }
    const result = readRecordsCsv(text);
    if (result.fileError) {
      showBackupMessage(result.fileError, true);
      return;
    }
    let current;
    try {
      current = await getAllRecords();
    } catch (error) {
      showBackupMessage(error.message, true);
      return;
    }
    setPendingImport(planImport(result.rows, current), chosen.name);
    navigate('/import');
  });

  // Shelves: rename or delete. Changes are saved straight away.
  const shelvesGroup = node.querySelector('[data-shelves]');
  const shelvesMessage = node.querySelector('[data-shelves-message]');

  function showShelvesMessage(text, isError = false) {
    shelvesMessage.textContent = text;
    shelvesMessage.hidden = !text;
    shelvesMessage.classList.toggle('settings-message--error', isError);
  }

  function renderShelvesSection(editing = '') {
    const shelves = listShelves(records);
    if (shelves.length === 0) {
      shelvesGroup.innerHTML = '<div class="row"><span class="not-set">No shelves yet</span></div>';
      return;
    }
    shelvesGroup.innerHTML = shelves.map((shelf) => (shelf.name === editing ? `
      <form class="row shelf-rename" data-old="${escapeHtml(shelf.name)}" novalidate>
        <input name="name" value="${escapeHtml(shelf.name)}" maxlength="40" autocomplete="off"
          autocapitalize="words" enterkeyhint="done" aria-label="New name for ${escapeHtml(shelf.name)}">
        <button type="button" class="shelf-action" data-shelf-action="cancel">Cancel</button>
        <button type="submit" class="shelf-action shelf-action--bold">Save</button>
      </form>` : `
      <div class="row shelf-manage">
        <span class="shelf-manage-name">${escapeHtml(shelf.name)}</span>
        <span class="shelf-manage-count">${recordCount(shelf.count)}</span>
        <button type="button" class="shelf-action" data-shelf-action="rename" data-name="${escapeHtml(shelf.name)}">Rename</button>
        <button type="button" class="shelf-action shelf-action--danger" data-shelf-action="delete" data-name="${escapeHtml(shelf.name)}">Delete</button>
      </div>`)).join('');
    const input = shelvesGroup.querySelector('.shelf-rename input');
    if (input) { input.focus(); input.select(); }
  }

  async function applyShelfChange(changed, message) {
    try {
      await saveRecords(changed);
      records = sortRecords(await getAllRecords());
    } catch (error) {
      showShelvesMessage(`${error.message} Nothing was changed.`, true);
      return;
    }
    file = makeFile(); // Keep the export up to date.
    showShelvesMessage('');
    showToast(message);
    renderShelvesSection();
  }

  shelvesGroup.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-shelf-action]');
    if (!button) return;
    const action = button.dataset.shelfAction;
    if (action === 'rename') renderShelvesSection(button.dataset.name);
    if (action === 'cancel') renderShelvesSection();
    if (action === 'delete') {
      const name = button.dataset.name;
      const count = listShelves(records).find((shelf) => shelf.name === name)?.count || 0;
      const confirmed = await showConfirmSheet({
        title: `Delete the shelf “${name}”?`,
        message: `It will be taken off ${recordCount(count)}. The records themselves are kept.`,
        confirmLabel: 'Delete Shelf',
      });
      if (confirmed) applyShelfChange(removeShelf(records, name), `Deleted the shelf “${name}”`);
    }
  });

  shelvesGroup.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const oldName = form.dataset.old;
    const newName = cleanShelfName(form.elements.name.value);
    if (!newName) {
      showShelvesMessage('Type a name for the shelf.', true);
      return;
    }
    if (newName === oldName) { renderShelvesSection(); return; }
    const merging = listShelves(records).some((shelf) => shelf.name !== oldName
      && shelf.name.toLocaleLowerCase('en-GB') === newName.toLocaleLowerCase('en-GB'));
    applyShelfChange(renameShelf(records, oldName, newName),
      merging ? `Merged “${oldName}” into “${newName}”` : `Renamed to “${newName}”`);
  });

  if (loadError) showBackupMessage(loadError, true);
  renderShelvesSection();
  refreshBackup();

  refresh();
  refreshClaude();
  return node;
}

// Used by other screens to link here.
export const settingsLink = (label = 'Open Settings') =>
  `<a class="pill-button" href="#/settings">${escapeHtml(label)}</a>`;
