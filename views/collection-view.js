// The Collection screen (and the Wishlist, which uses the same screen):
// search, a Grid/List switch, sorting and every record on that list.

import { getAllRecords, addRecordsIfMissing } from '../services/record-store.js';
import { searchRecords, sortRecords, SORT_OPTIONS } from '../utils/search.js';
import { createElement, escapeHtml } from '../utils/html.js';
import { icons } from '../utils/icons.js';
import { isDevMode } from '../utils/dev-mode.js';
import { createSampleRecords } from '../models/sample-records.js';
import { listShelves, filterByShelf, NO_SHELF } from '../models/shelves.js';
import { coverArt } from './cover-art.js';

// What differs between the two lists.
const LISTS = {
  collection: {
    title: 'Collection',
    addHref: '#/add',
    defaultSort: 'artist',
    emptyTitle: 'No records yet',
    emptyText: 'Add your first record to start your collection.',
  },
  wishlist: {
    title: 'Wishlist',
    addHref: '#/add/wishlist',
    defaultSort: 'recent',
    emptyTitle: 'Nothing on your wishlist',
    emptyText: 'Records you want go here. On the Add tab, choose Wishlist before you scan or search.',
  },
};

// Kept between visits so search and scroll position survive opening a record.
// `shelf` is the shelf filter: '' for all, NO_SHELF, or a shelf name.
const states = { collection: { query: '', scrollY: 0, shelf: '' }, wishlist: { query: '', scrollY: 0, shelf: '' } };

function load(key, fallback, allowed) {
  let saved = '';
  try { saved = localStorage.getItem(key) || ''; } catch { /* not essential */ }
  return allowed.includes(saved) ? saved : fallback;
}

function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* not essential */ }
}

const sortLabel = (value) => (SORT_OPTIONS.find((option) => option.value === value) || SORT_OPTIONS[0]).label;

const recordLink = (record) => `#/record/${encodeURIComponent(record.id)}`;

function gridHtml(records) {
  return `<div class="cover-grid">${records.map((record) => `
    <a class="grid-item" href="${recordLink(record)}">
      ${coverArt(record)}
      <span class="grid-title">${escapeHtml(record.title)}</span>
      <span class="grid-artist">${escapeHtml(record.artist)}</span>
    </a>`).join('')}
  </div>`;
}

function listHtml(records) {
  return `<div class="record-list">${records.map((record) => {
    const details = [record.artist, record.year, record.format === 'LP' ? '' : record.format].filter(Boolean);
    return `
    <a class="list-row" href="${recordLink(record)}">
      ${coverArt(record)}
      <span class="list-text">
        <span class="list-title">${escapeHtml(record.title)}</span>
        <span class="list-sub">${escapeHtml(details.join(' · '))}</span>
      </span>
      ${icons.chevron}
    </a>`;
  }).join('')}
  </div>`;
}

const devToolsHtml = `
  <section class="dev-tools">
    <p>Developer tools, only shown on this computer</p>
    <button type="button" class="pill-button" data-action="load-samples">Load sample records</button>
    <p class="dev-status" role="status"></p>
  </section>`;

export async function renderCollectionView({ list = 'collection' } = {}) {
  const settings = LISTS[list];
  const state = states[list];
  const layoutKey = `${list}-layout`;
  const sortKey = `${list}-sort`;
  const onThisList = (all) => all.filter((record) => record.list === list);

  let records = [];
  let loadError = '';
  try {
    records = sortRecords(onThisList(await getAllRecords()));
  } catch (error) {
    loadError = error.message;
  }
  let layout = load(layoutKey, list === 'wishlist' ? 'list' : 'grid', ['grid', 'list']);
  let sort = load(sortKey, settings.defaultSort, SORT_OPTIONS.map((option) => option.value));

  const node = createElement(`
    <div class="collection collection--${list}">
      <header class="nav-bar">
        <span class="nav-left"></span>
        <span class="nav-title"></span>
        <span class="nav-right nav-actions">
          <a class="nav-button" href="${settings.addHref}" aria-label="Add record by hand">${icons.plus}</a>
        </span>
      </header>
      <h1 class="large-title">${settings.title}</h1>
      <div class="collection-controls">
        <div class="search-field">
          ${icons.search}
          <label class="visually-hidden" for="collection-search">Search by artist or title</label>
          <input id="collection-search" type="search" placeholder="Artist or title"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
          <button type="button" class="search-clear" aria-label="Clear search" hidden>${icons.clear}</button>
        </div>
        <div class="segmented" role="group" aria-label="Layout">
          <button type="button" data-layout="grid">${icons.grid}<span class="visually-hidden">Grid</span></button>
          <button type="button" data-layout="list">${icons.list}<span class="visually-hidden">List</span></button>
        </div>
      </div>
      <div class="collection-meta">
        <span class="record-count"></span>
        <label class="sort-button">
          <span>Sort: <strong class="sort-label"></strong></span>${icons.updown}
          <select class="sort-select" aria-label="Sort by">
            ${SORT_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="shelf-filter" role="group" aria-label="Show shelf" hidden></div>
      <p class="notice" role="alert" hidden></p>
      <div class="results"></div>
      ${isDevMode && list === 'collection' ? devToolsHtml : ''}
    </div>`);

  const controls = node.querySelector('.collection-controls');
  const meta = node.querySelector('.collection-meta');
  const sortSelect = node.querySelector('.sort-select');
  const input = node.querySelector('#collection-search');
  const clearButton = node.querySelector('.search-clear');
  const results = node.querySelector('.results');
  const notice = node.querySelector('.notice');

  function showNotice(message) {
    notice.textContent = message;
    notice.hidden = !message;
  }

  // Shelf filter chips: All, each shelf, and Not on a Shelf.
  const shelfFilter = node.querySelector('.shelf-filter');
  function renderShelfFilter() {
    const shelves = list === 'collection' ? listShelves(records) : [];
    if (state.shelf && state.shelf !== NO_SHELF
      && !shelves.some((shelf) => shelf.name.toLocaleLowerCase('en-GB') === state.shelf.toLocaleLowerCase('en-GB'))) {
      state.shelf = ''; // That shelf no longer exists.
    }
    shelfFilter.hidden = shelves.length === 0;
    const chip = (value, label) => `<button type="button" class="filter-chip" data-shelf="${escapeHtml(value)}" aria-pressed="${state.shelf === value}">${escapeHtml(label)}</button>`;
    shelfFilter.innerHTML = [
      chip('', 'All'),
      ...shelves.map((shelf) => chip(shelf.name, shelf.name)),
      chip(NO_SHELF, 'Not on a Shelf'),
    ].join('');
  }

  shelfFilter.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shelf]');
    if (!button) return;
    state.shelf = button.dataset.shelf;
    renderShelfFilter();
    renderResults();
  });

  function renderResults() {
    controls.hidden = records.length === 0;
    meta.hidden = records.length === 0;
    node.querySelector('.record-count').textContent = records.length === 1 ? '1 record' : `${records.length} records`;
    node.querySelector('.sort-label').textContent = sortLabel(sort);
    sortSelect.value = sort;
    clearButton.hidden = state.query === '';
    node.querySelectorAll('[data-layout]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.layout === layout));
    });

    if (records.length === 0) {
      results.innerHTML = loadError ? '' : `
        <div class="empty-state">
          <h2>${settings.emptyTitle}</h2>
          <p>${settings.emptyText}</p>
          <a class="pill-button" href="${list === 'wishlist' ? '#/' : settings.addHref}">${list === 'wishlist' ? 'Go to Add' : 'Add Record'}</a>
        </div>`;
      return;
    }

    const matches = sortRecords(searchRecords(filterByShelf(records, state.shelf), state.query), sort);
    if (matches.length === 0) {
      results.innerHTML = state.query.trim() ? `
        <div class="empty-state">
          <h2>No matches for “${escapeHtml(state.query.trim())}”</h2>
          <p>Try a different artist or title${state.shelf ? ', or show All shelves' : ''}.</p>
        </div>` : `
        <div class="empty-state">
          <h2>No records here</h2>
          <p>Nothing is on this shelf.</p>
        </div>`;
      return;
    }

    const count = matches.length === 1 ? '1 record' : `${matches.length} records`;
    results.innerHTML = `${layout === 'list' ? listHtml(matches) : gridHtml(matches)}
      <p class="results-count">${count}</p>`;
  }

  sortSelect.addEventListener('change', () => {
    sort = sortSelect.value;
    save(sortKey, sort);
    renderResults();
  });

  input.value = state.query;
  input.addEventListener('input', () => {
    state.query = input.value;
    renderResults();
  });

  clearButton.addEventListener('click', () => {
    state.query = '';
    input.value = '';
    renderResults();
    input.focus();
  });

  node.querySelectorAll('[data-layout]').forEach((button) => {
    button.addEventListener('click', () => {
      layout = button.dataset.layout;
      save(layoutKey, layout);
      renderResults();
    });
  });

  // Remember where the list was scrolled to before opening a record.
  node.addEventListener('click', (event) => {
    if (event.target.closest('a')) state.scrollY = window.scrollY;
  }, true);

  const loadSamplesButton = node.querySelector('[data-action="load-samples"]');
  if (loadSamplesButton) {
    loadSamplesButton.addEventListener('click', async () => {
      const status = node.querySelector('.dev-status');
      loadSamplesButton.disabled = true;
      try {
        const added = await addRecordsIfMissing(createSampleRecords());
        records = sortRecords(onThisList(await getAllRecords()));
        status.textContent = added ? `Added ${added} sample records.` : 'The sample records are already here.';
        showNotice('');
      } catch (error) {
        showNotice(error.message);
      }
      loadSamplesButton.disabled = false;
      renderResults();
    });
  }

  showNotice(loadError);
  renderShelfFilter();
  renderResults();
  node.initialScrollY = state.scrollY;
  return node;
}
