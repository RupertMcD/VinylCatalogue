// The Import preview: shows what a CSV file will add, what's skipped
// because it's already in the collection, and rows with problems.
// Nothing is added until "Add N Records" is tapped, and existing records
// are never changed.

import { addRecordsIfMissing } from '../services/record-store.js';
import { keepCoversOffline } from '../services/cover-cache.js';
import { createElement, escapeHtml } from '../utils/html.js';
import { navigate, goBack } from '../utils/router.js';
import { showToast } from './toast.js';

let pending = null;

// Called by Settings after reading the chosen file.
export function setPendingImport(plan, fileName) {
  pending = { plan, fileName };
}

const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

function recordLine(record) {
  const details = [record.year, record.format].filter(Boolean).join(' · ');
  return `
    <div class="row import-row">
      <span class="import-text">
        <span class="import-title">${escapeHtml(record.title || 'Untitled')}</span>
        <span class="import-sub">${escapeHtml([record.artist, details].filter(Boolean).join(' · '))}</span>
      </span>
    </div>`;
}

function problemLine({ line, record, errors }) {
  const name = [record.artist, record.title].filter(Boolean).join(' – ') || 'No artist or title';
  return `
    <div class="row import-row">
      <span class="import-text">
        <span class="import-title">Row ${line}: ${escapeHtml(name)}</span>
        <span class="import-sub import-problem">${errors.map(escapeHtml).join(' ')}</span>
      </span>
    </div>`;
}

// Long lists start folded away, so the button stays easy to reach.
function section(title, count, rowsHtml, { open = true } = {}) {
  if (count === 0) return '';
  return `
    <details class="import-section"${open ? ' open' : ''}>
      <summary class="group-header import-summary">${escapeHtml(title)} (${count})</summary>
      <div class="grouped">${rowsHtml}</div>
    </details>`;
}

export function renderImportPreviewView() {
  if (!pending) {
    const empty = createElement(`
      <div>
        <header class="nav-bar nav-bar--bordered">
          <a class="nav-button nav-left" href="#/settings">Settings</a>
          <span class="nav-title">Import</span>
          <span class="nav-right"></span>
        </header>
        <div class="empty-state">
          <h2>No file chosen</h2>
          <p>Choose a CSV file with Import from CSV in Settings.</p>
          <a class="pill-button" href="#/settings">Open Settings</a>
        </div>
      </div>`);
    return empty;
  }

  const { plan, fileName } = pending;
  const adding = plan.toAdd.length;
  const buttonLabel = `Add ${plural(adding, 'Record', 'Records')}`;

  const node = createElement(`
    <div class="import">
      <header class="nav-bar nav-bar--bordered">
        <button type="button" class="nav-button nav-left" data-action="cancel">Cancel</button>
        <span class="nav-title">Import</span>
        <span class="nav-right"></span>
      </header>

      <div class="info-panel info-panel--left">
        <p><strong>${escapeHtml(fileName)}</strong></p>
        <p>${adding > 0 ? `${plural(adding, 'record', 'records')} will be added.` : 'There is nothing new to add.'}
          ${plan.alreadyHave.length > 0 ? `${plural(plan.alreadyHave.length, 'is', 'are')} already in the app and will be skipped.` : ''}
          ${plan.problems.length > 0 ? `${plural(plan.problems.length, 'row has', 'rows have')} problems and will be skipped.` : ''}
          Your existing records won't be changed.</p>
      </div>
      <p class="notice" role="alert" hidden></p>

      ${adding > 0 ? `
        <div class="import-actions">
          <button type="button" class="pill-button import-button" data-action="import">${buttonLabel}</button>
        </div>` : `
        <div class="import-actions">
          <button type="button" class="pill-button" data-action="done">Done</button>
        </div>`}

      ${section('To add', adding, plan.toAdd.map(recordLine).join(''), { open: adding <= 50 })}
      ${section('Problems – skipped', plan.problems.length, plan.problems.map(problemLine).join(''))}
      ${section('Already in the app – skipped', plan.alreadyHave.length,
        plan.alreadyHave.map((item) => recordLine(item.record)).join(''), { open: false })}
    </div>`);

  const notice = node.querySelector('.notice');

  function leave() {
    pending = null;
    goBack('/settings');
  }

  node.querySelector('[data-action="cancel"]').addEventListener('click', leave);
  const doneButton = node.querySelector('[data-action="done"]');
  if (doneButton) doneButton.addEventListener('click', leave);

  const importButton = node.querySelector('[data-action="import"]');
  if (importButton) {
    importButton.addEventListener('click', async () => {
      importButton.disabled = true;
      importButton.textContent = 'Adding…';
      notice.hidden = true;
      let added;
      try {
        // Adds only records whose ID isn't already there; never overwrites.
        added = await addRecordsIfMissing(plan.toAdd);
      } catch (error) {
        notice.textContent = `${error.message} Nothing was imported.`;
        notice.hidden = false;
        importButton.disabled = false;
        importButton.textContent = buttonLabel;
        return;
      }
      pending = null;
      keepCoversOffline();
      showToast(`Added ${plural(added, 'record', 'records')}`);
      navigate('/collection', { replace: true, fresh: true });
    });
  }

  return node;
}
