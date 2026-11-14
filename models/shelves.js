// Shelves work like tags: a record can be on several, like "Jazz",
// "Favourites" or "For sale". These helpers keep shelf names tidy and
// handle listing, renaming and deleting shelves. Pure logic, so tested.

const MAX_SHELF_NAME = 40;

const keyOf = (name) => name.toLocaleLowerCase('en-GB');

// "  jazz   records " -> "jazz records"; limited to 40 characters.
export function cleanShelfName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_SHELF_NAME).trim();
}

// Accepts a list of names or text like "Jazz; Favourites". Returns tidy,
// unique names (ignoring capitals) in A–Z order.
export function normaliseShelves(value) {
  const names = Array.isArray(value) ? value : String(value ?? '').split(/[;\n]/);
  const seen = new Map();
  for (const raw of names) {
    const name = cleanShelfName(raw);
    if (name && !seen.has(keyOf(name))) seen.set(keyOf(name), name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'en-GB', { sensitivity: 'base', numeric: true }));
}

// Every shelf in use, A–Z, with how many records are on it.
export function listShelves(records) {
  const counts = new Map();
  for (const record of records) {
    for (const name of record.shelves || []) {
      const entry = counts.get(keyOf(name)) || { name, count: 0 };
      entry.count += 1;
      counts.set(keyOf(name), entry);
    }
  }
  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base', numeric: true }));
}

export const NO_SHELF = '__none__';

// Keeps records on the chosen shelf. '' means all; NO_SHELF means records on no shelf.
export function filterByShelf(records, shelf) {
  if (!shelf) return records.slice();
  if (shelf === NO_SHELF) return records.filter((record) => !(record.shelves || []).length);
  return records.filter((record) => (record.shelves || []).some((name) => keyOf(name) === keyOf(shelf)));
}

// The records that change when a shelf is renamed, already updated.
// Renaming onto an existing shelf merges the two, and every record ends up
// with the new spelling (so "Jazz" and "jazz" never both exist).
export function renameShelf(records, oldName, newName) {
  const cleaned = cleanShelfName(newName);
  if (!cleaned) return [];
  const affected = (name) => keyOf(name) === keyOf(oldName) || keyOf(name) === keyOf(cleaned);
  return records
    .filter((record) => (record.shelves || []).some((name) => affected(name) && name !== cleaned))
    .map((record) => ({
      ...record,
      shelves: normaliseShelves([cleaned, ...record.shelves.filter((name) => !affected(name))]),
    }));
}

// The records that change when a shelf is deleted: the shelf is taken off
// them. The records themselves are kept.
export function removeShelf(records, shelfName) {
  return records
    .filter((record) => (record.shelves || []).some((name) => keyOf(name) === keyOf(shelfName)))
    .map((record) => ({ ...record, shelves: record.shelves.filter((name) => keyOf(name) !== keyOf(shelfName)) }));
}
