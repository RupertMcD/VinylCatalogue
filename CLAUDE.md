# Vinyl Catalogue

A personal web app for cataloguing a small vinyl record collection.
It runs in Safari on my iPhone 17 and is added to the home screen so it
opens like an app, with its own icon and no browser bars. Records are
added one at a time by scanning a barcode with the phone's camera,
details come from Discogs, and everything is stored on the phone.

It is a web app, not a native app, so it needs no Xcode and no Apple
developer account.

## About the developer

- This is my first app and my first web project.
- Explain what you are doing in plain English. Avoid jargon, or define it.
- When I need to do something myself (in Terminal, Safari, GitHub or on
  my iPhone), give me one step at a time with the exact menu and button
  names.
- After finishing a task, give me a short summary of what changed and why.

## Tech stack

- Plain HTML, CSS and JavaScript (ES modules). No framework and no build
  step, so the files that are edited are the files that run.
- Installable web app (a "progressive web app"): a web app manifest for
  the name and icon, and a service worker so it opens without signal.
- IndexedDB for storage, in the browser on the phone. No server, no user
  accounts.
- Target Safari on iOS 17 or later (my phone is an iPhone 17).
- Camera access in the browser for barcode scanning (phase 3).
- Discogs API for record details and cover art, called from the browser.
- Claude API for cover-photo recognition (phase 6 only), called from the
  browser.
- Hosted as a static site on a free host with HTTPS (the camera only
  works over HTTPS). The host is chosen in phase 2.
- No third-party libraries or packages without asking me first. Barcode
  scanning will probably need one: explain the options in phase 3 and
  let me choose.

## Project rules

- Work on one phase at a time. Do not build features from later phases.
- Always show me a plan before writing code for anything non-trivial.
- Keep files small and named after what they do
  (`record-detail.js`, `discogs-service.js`).
- Folders: `models/`, `views/`, `services/`, `utils/`, `styles/`,
  `icons/`, `tests/`, and `vendor/` for approved outside libraries
  (copied in unchanged, with their licence). `index.html`,
  `manifest.webmanifest` and the service worker sit at the top level.
- Every screen can be shown with sample data, using a "load sample
  records" option that only appears while developing.
- Write unit tests for logic: search, Discogs response parsing, CSV
  export and CSV import. Screens do not need tests.
- Network code lives only in `services/`. Screens never call an API
  directly.
- Handle errors with a clear, friendly message. Never break the app on a
  failed lookup or missing signal.
- Design for the iPhone screen first: large tap targets, safe areas
  around the notch and home bar, works in portrait.

## Secrets

- This is a public-facing static site, so no API token may ever be in
  the code or in git.
- I enter my Discogs token (and, in phase 6, my Claude API key) on a
  Settings screen in the app. They are stored only in the browser on my
  phone.
- If you see a token anywhere in the code, stop and tell me.

## Data safety

- Before any change to how records are stored (the IndexedDB version or
  record fields), explain what will happen to existing records and remind
  me to export a CSV first.
- Existing records must survive every update. Upgrades must convert old
  records, never delete them.
- Records live only on the phone. Deleting the home-screen app or
  clearing Safari's website data deletes the catalogue. CSV export and
  import are the backup and restore: remind me to export after each
  cataloguing session.
- CSV import must never silently overwrite or duplicate records. Show
  me what will be added before importing, and skip records that are
  already in the collection.

## Checking your work

- After every change, run the tests and check the app in the browser.
  Fix failures before telling me the work is done.
- Run locally from the project folder with:
  `python3 -m http.server 8000`
  then open `http://localhost:8000`.
- Tests run in the browser at `http://localhost:8000/tests/` (no install
  needed). Every test must pass.
- Check layouts at iPhone size (about 402 x 874 points) in light and dark
  mode.
- The camera and the home-screen install cannot be fully tested on the
  Mac. For those, tell me exactly what to test on my iPhone.

## Git

- Commit after each working step with a short, plain message.
- Never commit broken code.
- Do not push to GitHub unless I ask. Pushing may also publish the site.

## Design

- Calm, minimal, cover-art-led. Plenty of space, few colours.
- Should look and feel at home on an iPhone: system font, iOS-style
  lists, tab bar and sheets, simple line icons.
- Support dark mode, following the phone's setting.
- British English in all user-facing text. Currency is GBP.
- Condition grades use the Goldmine scale: M, NM, VG+, VG, G+, G, F, P.
  Vinyl and sleeve are graded separately.

## Out of scope

Do not build these unless I ask: Discogs collection sync,
social sharing, audio recognition, record shop maps, user accounts, a
backend server, a native iOS app.

## Phase status

Update this list as phases are completed.

- [x] Phase 1 - Catalogue with manual entry, in the browser on the Mac
- [x] Phase 2 - Online and on my iPhone home screen
- [x] Phase 3 - Barcode scan and Discogs auto-fill
- [ ] Phase 4 - Polish, camera-first home, CSV export and import
- [ ] Phase 5 - Wishlist and shelves
- [ ] Phase 6 - Cover-photo recognition
- [ ] Phase 7 - Stretch goals
