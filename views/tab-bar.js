// The iPhone-style tab bar at the bottom: Add, Collection and Settings.
// Each screen's route says which tab it belongs to (or none, to hide it).

import { icons } from '../utils/icons.js';

const TABS = [
  { id: 'add', label: 'Add', href: '#/', icon: icons.barcode },
  { id: 'collection', label: 'Collection', href: '#/collection', icon: icons.disc },
  { id: 'settings', label: 'Settings', href: '#/settings', icon: icons.settings },
];

let bar = null;

export function createTabBar() {
  bar = document.createElement('nav');
  bar.className = 'tab-bar';
  bar.setAttribute('aria-label', 'Main');
  bar.innerHTML = TABS.map((tab) => `
    <a class="tab" href="${tab.href}" data-tab="${tab.id}">
      ${tab.icon}<span class="tab-label">${tab.label}</span>
    </a>`).join('');
  document.body.append(bar);
}

// Highlights the tab for the current screen, or hides the bar (tab = null).
export function showTab(tab) {
  if (!bar) return;
  const visible = Boolean(tab);
  bar.hidden = !visible;
  document.body.classList.toggle('has-tab-bar', visible);
  bar.querySelectorAll('.tab').forEach((link) => {
    const current = link.dataset.tab === tab;
    link.classList.toggle('tab--current', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
