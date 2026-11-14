// Hands filled-in fields (from Discogs, or just a barcode) to the
// New Record form. It's kept in memory only, and used once.

let draft = null;

export function setRecordDraft(fields) {
  draft = { ...fields };
}

export function takeRecordDraft() {
  const taken = draft;
  draft = null;
  return taken;
}
