// The Add / Edit Record form. The same screen does both: with an id it
// edits that record, without one it makes a new record.

import { getRecord, saveRecord } from '../services/record-store.js';
import { keepCoversOffline } from '../services/cover-cache.js';
import { createRecord, validateRecord, FORMATS, GRADES } from '../models/record.js';
import { createElement, escapeHtml } from '../utils/html.js';
import { toDateInputValue, fromDateInputValue } from '../utils/format.js';
import { resizeImageFile } from '../utils/image-resize.js';
import { takeRecordDraft } from '../utils/record-draft.js';
import { icons } from '../utils/icons.js';
import { navigate, goBack } from '../utils/router.js';
import { coverArt } from './cover-art.js';
import { showConfirmSheet } from './confirm-sheet.js';

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}

function gradeOptions(selected) {
  return option('', 'Not graded', selected)
    + GRADES.map((g) => option(g.code, `${g.code} – ${g.name}`, selected)).join('');
}

// One labelled row. `control` is the input or picker markup.
function field(name, label, control) {
  return `
    <label class="row field" data-field="${name}">
      <span class="field-label">${label}</span>
      ${control}
      <span class="field-error" id="${name}-error" hidden></span>
    </label>`;
}

function textInput(name, value, extra = '') {
  return `<input name="${name}" value="${escapeHtml(value)}" aria-describedby="${name}-error" ${extra}>`;
}

function picker(name, optionsHtml) {
  return `<select name="${name}" aria-describedby="${name}-error">${optionsHtml}</select>${icons.updown}`;
}

function notFound() {
  const node = createElement(`
    <div>
      <header class="nav-bar nav-bar--bordered">
        <a class="nav-button nav-left" href="#/collection">${icons.back}Collection</a>
      </header>
      <div class="empty-state"><h2>Record not found</h2><p>It may have been deleted.</p></div>
    </div>`);
  return node;
}

export async function renderRecordFormView(id = null) {
  let existing = null;
  if (id) {
    try {
      existing = await getRecord(id);
    } catch {
      existing = null;
    }
    if (!existing) return notFound();
  }

  // Details handed over by a barcode lookup, if any.
  const draft = existing ? null : takeRecordDraft();
  const start = existing ?? createRecord(draft ?? {});
  let coverImage = start.coverImage;
  const backTo = existing ? `/record/${encodeURIComponent(existing.id)}` : '/';

  const node = createElement(`
    <form class="record-form" novalidate>
      <header class="nav-bar nav-bar--bordered">
        <button type="button" class="nav-button nav-left" data-action="cancel">Cancel</button>
        <span class="nav-title">${existing ? 'Edit Record' : 'New Record'}</span>
        <button type="submit" class="nav-button nav-button--bold nav-right">Save</button>
      </header>

      <p class="notice form-notice" role="alert" hidden></p>
      ${draft && draft.fromDiscogs ? `<p class="info-panel info-panel--left form-info">Filled in from Discogs. Check the details, add the grades and price, then tap Save.</p>` : ''}

      <div class="form-cover">
        <span class="form-cover-preview"></span>
        <div class="form-cover-actions">
          <label class="pill-button">
            ${icons.photo}<span class="choose-label"></span>
            <input type="file" accept="image/*" class="visually-hidden" data-action="choose-photo">
          </label>
          <button type="button" class="pill-button pill-button--danger" data-action="remove-photo">Remove</button>
        </div>
      </div>

      <div class="grouped">
        ${field('artist', 'Artist', textInput('artist', start.artist, 'autocapitalize="words" autocomplete="off" required'))}
        ${field('title', 'Title', textInput('title', start.title, 'autocapitalize="words" autocomplete="off" required'))}
      </div>

      <h2 class="group-header">Release</h2>
      <div class="grouped">
        ${field('year', 'Year', textInput('year', start.year ?? '', 'inputmode="numeric" maxlength="4" placeholder="e.g. 1975" autocomplete="off"'))}
        ${field('label', 'Label', textInput('label', start.label, 'autocapitalize="words" autocomplete="off"'))}
        ${field('format', 'Format', picker('format', FORMATS.map((f) => option(f, f, start.format)).join('')))}
      </div>

      <h2 class="group-header">Condition</h2>
      <div class="grouped">
        ${field('vinylGrade', 'Vinyl', picker('vinylGrade', gradeOptions(start.vinylGrade)))}
        ${field('sleeveGrade', 'Sleeve', picker('sleeveGrade', gradeOptions(start.sleeveGrade)))}
      </div>

      <h2 class="group-header">Purchase</h2>
      <div class="grouped">
        ${field('pricePaid', 'Price paid', `<span class="price-input"><span aria-hidden="true">£</span>${textInput('pricePaid', Number.isFinite(start.pricePaid) ? start.pricePaid.toFixed(2) : '', 'inputmode="decimal" placeholder="0.00" autocomplete="off"')}</span>`)}
        ${field('dateAdded', 'Date added', textInput('dateAdded', toDateInputValue(start.dateAdded), 'type="date"'))}
      </div>

      <h2 class="group-header">Notes</h2>
      <div class="grouped">
        <label class="row field notes-field" data-field="notes">
          <span class="visually-hidden">Notes</span>
          <textarea name="notes" rows="4" placeholder="Pressing details, where you bought it…">${escapeHtml(start.notes)}</textarea>
        </label>
      </div>

      <h2 class="group-header">Identifiers</h2>
      <div class="grouped">
        ${field('barcode', 'Barcode', textInput('barcode', start.barcode, 'inputmode="numeric" autocomplete="off"'))}
        ${field('discogsId', 'Discogs ID', textInput('discogsId', start.discogsId, 'inputmode="numeric" autocomplete="off"'))}
      </div>
    </form>`);

  const form = node;
  const notice = node.querySelector('.form-notice');
  const saveButton = node.querySelector('[type="submit"]');

  function showNotice(message) {
    notice.textContent = message;
    notice.hidden = !message;
    if (message) notice.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function currentValues() {
    return { ...Object.fromEntries(new FormData(form)), coverImage };
  }

  function renderCover() {
    const values = currentValues();
    node.querySelector('.form-cover-preview').innerHTML = coverArt({ ...values, coverImage });
    node.querySelector('.choose-label').textContent = coverImage ? 'Change Photo' : 'Add Photo';
    node.querySelector('[data-action="remove-photo"]').hidden = !coverImage;
  }

  const initialValues = JSON.stringify(currentValues());
  // A looked-up record counts as unsaved work, so Cancel asks first.
  const hasChanges = () => Boolean(draft) || JSON.stringify(currentValues()) !== initialValues;

  function showErrors(errors) {
    node.querySelectorAll('.field[data-field]').forEach((row) => {
      const name = row.dataset.field;
      const message = errors[name] || '';
      const error = row.querySelector('.field-error');
      const control = row.querySelector('input, select, textarea');
      row.classList.toggle('field--invalid', Boolean(message));
      if (error) { error.textContent = message; error.hidden = !message; }
      if (control) control.toggleAttribute('aria-invalid', Boolean(message));
    });
    const first = node.querySelector('.field--invalid input, .field--invalid select');
    if (first) first.focus();
  }

  node.querySelector('[data-action="choose-photo"]').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      coverImage = await resizeImageFile(file);
      showNotice('');
      renderCover();
    } catch (error) {
      showNotice(error.message);
    }
  });

  node.querySelector('[data-action="remove-photo"]').addEventListener('click', () => {
    coverImage = '';
    renderCover();
  });

  node.querySelector('[data-action="cancel"]').addEventListener('click', async () => {
    if (hasChanges()) {
      const discard = await showConfirmSheet({
        title: existing ? 'Discard your changes?' : 'Discard this new record?',
        message: "What you've typed won't be saved.",
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
      });
      if (!discard) return;
    }
    goBack(backTo);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = currentValues();
    const record = createRecord({
      ...values,
      id: existing ? existing.id : '',
      dateAdded: fromDateInputValue(values.dateAdded, existing && existing.dateAdded),
    });

    const { valid, errors } = validateRecord(record);
    showErrors(errors);
    if (!valid) return;

    saveButton.disabled = true;
    try {
      await saveRecord(record);
      keepCoversOffline(); // Runs in the background.
    } catch {
      showNotice("The record couldn't be saved. Please try again.");
      saveButton.disabled = false;
      return;
    }

    if (existing) {
      goBack(`/record/${encodeURIComponent(record.id)}`);
    } else {
      // A new record goes to the Collection, so Back can't lead into the
      // scanner again and add a second copy by mistake.
      navigate('/collection', { replace: true });
    }
  });

  renderCover();
  return node;
}
