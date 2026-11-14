// The Record screen: the cover and every detail of one record.

import { getRecord, deleteRecord } from '../services/record-store.js';
import { gradeName } from '../models/record.js';
import { createElement, escapeHtml } from '../utils/html.js';
import { formatDate, formatPrice } from '../utils/format.js';
import { icons } from '../utils/icons.js';
import { goBack } from '../utils/router.js';
import { coverArt } from './cover-art.js';
import { showConfirmSheet } from './confirm-sheet.js';

const NOT_SET = '<span class="not-set">Not set</span>';

function row(label, value) {
  const shown = value === '' || value == null ? NOT_SET : escapeHtml(value);
  return `<div class="row"><span class="row-label">${label}</span><span class="row-value">${shown}</span></div>`;
}

function gradeText(code) {
  return code ? `${code} · ${gradeName(code)}` : '';
}

function navBar(rightHtml = '') {
  return `
    <header class="nav-bar nav-bar--bordered">
      <button type="button" class="nav-button nav-left" data-action="back">${icons.back}Collection</button>
      <span class="nav-title"></span>
      <span class="nav-right">${rightHtml}</span>
    </header>`;
}

function wireBack(node) {
  node.querySelector('[data-action="back"]').addEventListener('click', () => goBack('/'));
}

function notFound(message) {
  const node = createElement(`
    <div>
      ${navBar()}
      <div class="empty-state">
        <h2>Record not found</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>`);
  wireBack(node);
  return node;
}

export async function renderRecordDetailView(id) {
  let record;
  try {
    record = await getRecord(id);
  } catch (error) {
    return notFound(error.message);
  }
  if (!record) return notFound('It may have been deleted.');

  const node = createElement(`
    <div class="record-detail">
      ${navBar(`<a class="nav-button" href="#/edit/${encodeURIComponent(record.id)}">Edit</a>`)}
      <div class="detail-hero">
        ${coverArt(record, 'detail-cover')}
        <h1 class="detail-title">${escapeHtml(record.title)}</h1>
        <p class="detail-artist">${escapeHtml(record.artist)}</p>
      </div>

      <h2 class="group-header">Release</h2>
      <div class="grouped">
        ${row('Year', record.year)}
        ${row('Label', record.label)}
        ${row('Format', record.format)}
      </div>

      <h2 class="group-header">Condition</h2>
      <div class="grouped">
        ${row('Vinyl', gradeText(record.vinylGrade))}
        ${row('Sleeve', gradeText(record.sleeveGrade))}
      </div>

      <h2 class="group-header">Purchase</h2>
      <div class="grouped">
        ${row('Price paid', formatPrice(record.pricePaid))}
        ${row('Date added', formatDate(record.dateAdded))}
      </div>

      <h2 class="group-header">Notes</h2>
      <div class="grouped">
        <div class="row detail-notes">${record.notes ? escapeHtml(record.notes) : NOT_SET}</div>
      </div>

      <h2 class="group-header">Identifiers</h2>
      <div class="grouped">
        ${row('Barcode', record.barcode)}
        ${row('Discogs ID', record.discogsId)}
        ${row('Record ID', record.id)}
      </div>

      <p class="notice" role="alert" hidden></p>
      <div class="grouped">
        <button type="button" class="row row-button row-button--danger" data-action="delete">Delete Record</button>
      </div>
    </div>`);

  wireBack(node);

  node.querySelector('[data-action="delete"]').addEventListener('click', async () => {
    const confirmed = await showConfirmSheet({
      title: `Delete “${record.title}”?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete Record',
    });
    if (!confirmed) return;
    try {
      await deleteRecord(record.id);
      goBack('/');
    } catch {
      const notice = node.querySelector('.notice');
      notice.textContent = "The record couldn't be deleted. Please try again.";
      notice.hidden = false;
    }
  });

  return node;
}
