// True only when the app runs on this computer (localhost), so
// developer tools such as "Load sample records" never appear online.

export const isDevMode = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
