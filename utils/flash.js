// Passes a one-off note from one screen to the next, for example
// "a record was just added, so don't start the camera straight away".
// Kept in memory only, and used once.

let note = null;

export function setFlash(value) {
  note = { ...value };
}

export function takeFlash() {
  const taken = note;
  note = null;
  return taken;
}
