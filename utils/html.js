// Helpers for building screen markup safely.

const replacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Makes text safe to put inside HTML, so a title like "<b>" shows as typed.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => replacements[ch]);
}

// Builds an element from a string of HTML and returns it.
export function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}
