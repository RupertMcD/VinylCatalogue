// A sheet that slides up to choose a record's shelves: tick existing ones
// or type a new one. Resolves to the chosen names, or null if cancelled.

import { createElement, escapeHtml } from '../utils/html.js';
import { cleanShelfName, normaliseShelves } from '../models/shelves.js';

function optionHtml(name, checked) {
  return `
    <label class="shelf-option">
      <input type="checkbox" value="${escapeHtml(name)}"${checked ? ' checked' : ''}>
      <span class="shelf-option-name">${escapeHtml(name)}</span>
      <span class="shelf-check" aria-hidden="true"></span>
    </label>`;
}

export function showShelfPicker({ selected = [], available = [] }) {
  return new Promise((resolve) => {
    const root = document.getElementById('sheet-root');
    const previousFocus = document.activeElement;
    const chosen = new Set(selected.map((name) => name.toLocaleLowerCase('en-GB')));
    const names = normaliseShelves([...available, ...selected]);

    const sheet = createElement(`
      <div class="sheet-backdrop">
        <div class="action-sheet shelf-sheet" role="dialog" aria-modal="true" aria-labelledby="shelf-title">
          <div class="action-group">
            <div class="action-header">
              <p id="shelf-title" class="action-title">Shelves</p>
              <p class="action-message">Tick the shelves this record is on, or make a new one.</p>
            </div>
            <form class="shelf-new" novalidate>
              <input name="name" type="text" placeholder="New shelf, e.g. Jazz" autocomplete="off"
                autocapitalize="words" maxlength="40" enterkeyhint="done" aria-label="New shelf name">
              <button type="submit" class="shelf-add">Add</button>
            </form>
            <div class="shelf-options">
              ${names.map((name) => optionHtml(name, chosen.has(name.toLocaleLowerCase('en-GB')))).join('')}
            </div>
          </div>
          <div class="action-group">
            <button type="button" class="action-button action-button--bold" data-choice="done">Done</button>
          </div>
          <div class="action-group">
            <button type="button" class="action-button action-button--cancel" data-choice="cancel">Cancel</button>
          </div>
        </div>
      </div>`);

    const options = sheet.querySelector('.shelf-options');
    const form = sheet.querySelector('.shelf-new');

    function close(result) {
      document.removeEventListener('keydown', onKey);
      sheet.classList.add('is-closing');
      setTimeout(() => sheet.remove(), 200);
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
      resolve(result);
    }

    function onKey(event) {
      if (event.key === 'Escape') close(null);
    }

    // A new shelf is added ticked; typing an existing name just ticks it.
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = cleanShelfName(form.elements.name.value);
      form.elements.name.value = '';
      if (!name) return;
      const existing = [...options.querySelectorAll('input')]
        .find((box) => box.value.toLocaleLowerCase('en-GB') === name.toLocaleLowerCase('en-GB'));
      if (existing) {
        existing.checked = true;
      } else {
        options.insertAdjacentHTML('afterbegin', optionHtml(name, true));
      }
    });

    sheet.addEventListener('click', (event) => {
      if (event.target === sheet) { close(null); return; }
      const button = event.target.closest('[data-choice]');
      if (!button) return;
      if (button.dataset.choice === 'cancel') { close(null); return; }
      // Done also keeps a name typed but not yet added.
      const typed = cleanShelfName(form.elements.name.value);
      const ticked = [...options.querySelectorAll('input:checked')].map((box) => box.value);
      close(normaliseShelves(typed ? [...ticked, typed] : ticked));
    });
    document.addEventListener('keydown', onKey);

    root.append(sheet);
  });
}
