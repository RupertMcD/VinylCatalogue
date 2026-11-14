// Turning stored values into text for the screen (British style, GBP).

const priceFormat = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// 12.5 -> "£12.50". Empty for no price.
export function formatPrice(value) {
  return Number.isFinite(value) ? priceFormat.format(value) : '';
}

// ISO date -> "14 November 2026".
export function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

const pad = (n) => String(n).padStart(2, '0');

// ISO date -> "2026-11-14", the value a date picker expects (local time).
export function toDateInputValue(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Date picker value -> ISO date. Keeps the original time if the day is unchanged.
export function fromDateInputValue(value, previousIso) {
  if (!value) return '';
  if (previousIso && toDateInputValue(previousIso) === value) return previousIso;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toISOString();
}
