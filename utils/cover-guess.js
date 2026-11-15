// Remembers what Claude recognised from a cover photo, so the Discogs
// matches list can say "From your photo…". Kept in memory only, while
// the app is open, keyed by the words searched for.

const guesses = new Map();

export function setCoverGuess(searchText, answer) {
  guesses.set(searchText, { ...answer });
}

export function getCoverGuess(searchText) {
  return guesses.get(searchText) || null;
}
