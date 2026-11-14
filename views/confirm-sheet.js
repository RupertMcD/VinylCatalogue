// An iOS-style action sheet that slides up from the bottom to confirm
// something, like deleting a record. Resolves to true if confirmed.

import { createElement, escapeHtml } from '../utils/html.js';

export function showConfirmSheet({ title, message = '', confirmLabel, cancelLabel = 'Cancel' }) {
  return new Promise((resolve) => {
    const root = document.getElementById('sheet-root');
    const previousFocus = document.activeElement;

    const sheet = createElement(`
      <div class="sheet-backdrop">
        <div class="action-sheet" role="alertdialog" aria-modal="true"
          aria-labelledby="sheet-title" aria-describedby="sheet-message">
          <div class="action-group">
            <div class="action-header">
              <p id="sheet-title" class="action-title">${escapeHtml(title)}</p>
              <p id="sheet-message" class="action-message">${escapeHtml(message)}</p>
            </div>
            <button type="button" class="action-button action-button--danger" data-choice="confirm">${escapeHtml(confirmLabel)}</button>
          </div>
          <div class="action-group">
            <button type="button" class="action-button action-button--cancel" data-choice="cancel">${escapeHtml(cancelLabel)}</button>
          </div>
        </div>
      </div>`);

    function close(confirmed) {
      document.removeEventListener('keydown', onKey);
      sheet.classList.add('is-closing');
      setTimeout(() => sheet.remove(), 200);
      if (!confirmed && previousFocus && previousFocus.isConnected) previousFocus.focus();
      resolve(confirmed);
    }

    function onKey(event) {
      if (event.key === 'Escape') close(false);
    }

    sheet.addEventListener('click', (event) => {
      if (event.target === sheet) { close(false); return; }
      const button = event.target.closest('[data-choice]');
      if (button) close(button.dataset.choice === 'confirm');
    });
    document.addEventListener('keydown', onKey);

    root.append(sheet);
    sheet.querySelector('[data-choice="cancel"]').focus();
  });
}
