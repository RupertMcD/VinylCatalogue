// Switches on offline support by registering the service worker (sw.js).
//
// On this computer (localhost) it stays off, so edits show up straight away
// instead of old saved copies. To test offline mode locally, open
// http://localhost:8000/?sw=1

import { isDevMode } from './dev-mode.js';

export async function setUpServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const testingLocally = new URLSearchParams(location.search).has('sw');

  try {
    if (isDevMode && !testingLocally) {
      // Remove any worker left over from a local offline test.
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      return;
    }
    await navigator.serviceWorker.register('sw.js');
  } catch (error) {
    // The app still works online without it, so just note it.
    console.warn('Offline support could not be switched on.', error);
  }
}
