// Asks the browser to keep this app's data (your records) permanently,
// instead of clearing it when the phone is short of space.
// The browser decides; apps added to the home screen are usually allowed.
// This is not a backup: deleting the app still deletes the records.

export async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return null;
  try {
    if (await navigator.storage.persisted()) {
      console.info('Storage: already kept permanently.');
      return true;
    }
    const granted = await navigator.storage.persist();
    console.info(granted
      ? 'Storage: the browser agreed to keep records permanently.'
      : 'Storage: the browser did not agree yet. It may agree once the app is on the home screen.');
    return granted;
  } catch (error) {
    console.warn('Storage: could not ask to keep records permanently.', error);
    return null;
  }
}
