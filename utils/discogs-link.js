// Discogs release links: making one from a Discogs ID, and finding the ID
// in a link pasted from discogs.com. Pure logic, so it can be tested.

// The release's page on discogs.com, where you can also see who's selling it.
export function discogsReleaseUrl(discogsId) {
  const id = String(discogsId ?? '').trim();
  return /^\d+$/.test(id) ? `https://www.discogs.com/release/${id}` : '';
}

// Finds the release ID in a pasted link, for example
// https://www.discogs.com/release/249504-Rick-Astley-Never-Gonna-Give-You-Up
// or discogs.com/sell/release/249504. Returns '' if it isn't one.
// "Master" links (all versions of an album) aren't a single release, so
// they're not accepted.
export function parseDiscogsReleaseLink(text) {
  const value = String(text ?? '').trim();
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return '';
  }
  if (!/(^|\.)discogs\.com$/i.test(url.hostname)) return '';
  const match = url.pathname.match(/\/release\/(\d+)(?:[-/]|$)/i);
  return match ? match[1] : '';
}
