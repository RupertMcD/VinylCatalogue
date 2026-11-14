// Hands filled-in fields (from Discogs, or just a barcode) to the
// New Record form. It's kept in memory only, and used once.

let draft = null;

export function setRecordDraft(fields) {
  draft = { ...fields };
}

// Which list the Add tab is adding to: 'collection' or 'wishlist'.
// Remembered while the app is open.
let addTarget = 'collection';

export function getAddTarget() {
  return addTarget;
}

export function setAddTarget(list) {
  addTarget = list === 'wishlist' ? 'wishlist' : 'collection';
}

export function takeRecordDraft() {
  const taken = draft;
  draft = null;
  return taken;
}
