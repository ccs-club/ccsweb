# CCS Club website

The CCS (Computer / Communication / Security) Club site for `sict-ccs.club`.

## Stack

- Next.js 16 App Router with Turbopack
- React 19 and TypeScript
- Tailwind CSS 4 with a custom CSS design system

## Run locally

Use Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `localhost`, not
`127.0.0.1`, so the development origin and the canvas logo behave as expected.

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run build` checks that every gallery photo has a non-empty caption and alt
text in both locales before compiling the site. Run that check alone with
`npm run check:gallery`.

Browser regression tests run against the production build at desktop, tablet
and phone widths:

```bash
npx playwright install chromium --only-shell
npm run test:e2e
```

The browser test server uses dummy credentials and temporary event and Facebook
post files, never the files in `data/`. It covers navigation, language switching, the gallery
viewer, login, draft recovery after session expiry, event conflicts and CRUD.
Visual regressions also check server-error retry, contrast over a worst-case
hero background, inactive year counts, 44px admin targets, dark native controls,
gallery lead sizing, narrow programme rows, the desktop About-page budget,
charcoal page layers and the swipeable event archive. Archive previews work with
touch, arrow keys and previous/next buttons; each opens full details in a
keyboard-dismissable dialog.
Recovery tests corrupt and restore only the isolated test store; their expected
server-error logs do not indicate a failure when the tests pass.
Unit tests cover gallery validation, event writes and revisions, sessions,
origin checks and request limits.

The pixel-contrast tests use `sharp`. If an installed system libvips causes npm
to attempt a native source build, use `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci` to
install the prebuilt binaries instead.

## Routes

- `/`: bilingual landing page. One screen, no scroll: the matrix logo hero, the
  club's proposition, and its founding year, membership and competition turnout
- `/about`: the club's story, its statistics, photographs of members at real
  events, the programs it runs, and the join call
- `/gallery`: the full set of club photographs, newest first, each opening in a
  keyboard-navigable viewer
- `/events`: compact event archive with featured, upcoming and year-filtered
  past events
- `/posts`: Facebook Page posts explicitly selected by a site admin
- `/admin`: private event and Facebook-post publishing interface; it is never indexed

## Publishing events without editing source

The admin area stores validated event records in `data/events.json`. A club
administrator can create, edit and delete events through `/admin`; the public
`/events` page reads the current file at request time.

Configure these server-side environment variables before using `/admin`:

```dotenv
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Generate a real password and a random session secret locally, for example:

```bash
node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))'
```

`ADMIN_PASSWORD` must be at least 12 characters and `ADMIN_SESSION_SECRET` at
least 32 characters. Do not deploy the blank/example values. Serve the admin
over HTTPS in production. The session is an HTTP-only, SameSite=Strict signed
cookie and expires after eight hours; changing
either credential invalidates existing sessions. Mutating requests also require
a same-origin `Origin` header. The origin check uses the request's Host header
rather than Next.js's internal hostname. A reverse proxy must preserve the
public Host header and provide the correct forwarded protocol.
The API validates every field server-side and
accepts only local image paths under `/public/events`; there is no upload
endpoint.

If a session expires while editing, the login form replaces the editor without
reloading. Signing in again restores the draft, including its revision, so
concurrent edits still produce a conflict rather than silently overwriting
changes. The draft stays only in the current tab's memory; do not reload or
close the tab before saving. Navigation warnings remain active during login.
Signing out deliberately discards the draft after confirmation.

Set `EVENTS_FILE_PATH` when the persistent event file is mounted somewhere
other than `data/events.json`.

## Publishing selected Facebook posts

`/posts` contains only Page-post snapshots chosen in `/admin`; it never turns
Facebook's full feed into a public site feed. A signed-in administrator first
uses **Refresh published posts**, then selects the posts that belong on the
site. Removing a selection removes it from the public page. The public page
reads `data/facebook-posts.json` at request time. All selected posts appear in
the horizontal post browser. A selected post containing `#ccs-info` also
appears in the Information section below; the marker remains part of the
original Facebook text.

Configure the Page connection as deployment secrets, never browser variables:

```dotenv
FACEBOOK_PAGE_ID=110700467422954
FACEBOOK_PAGE_ACCESS_TOKEN=
```

The server calls Graph API `v26.0` and the Page's `published_posts` endpoint
with only `id`, `message`, `created_time`, `permalink_url`, and `full_picture`.
The Page access token is used only by server code and is never returned by an
API route or embedded in browser JavaScript. Recent Page results are cached in
the server instance for five minutes; an admin refresh deliberately bypasses
that cache. Stored text is rendered as text, and any selected post image is
fetched through the same-origin image route rather than loading Facebook's
scripts in the visitor's browser.

The app does not publish to Facebook or refresh Page tokens automatically.
Keep a currently authorized Page token in the deployment secret manager, test
it with the protected refresh control after deployment, and rotate it whenever
it expires, is revoked, or may have been exposed. Do not use a `NEXT_PUBLIC_`
name for either Facebook setting.

Set `FACEBOOK_POSTS_FILE_PATH` when the selected-post file is mounted somewhere
other than `data/facebook-posts.json`.

### Deployment requirement

The file-backed admin requires a Node.js server with a **persistent writable
filesystem** and one writer process. This applies to both `events.json` and
`facebook-posts.json`. It works on a VPS, one container with a
mounted volume, or a similar host. Do not scale the file-backed admin to
multiple replicas without replacing the store with transactional shared
storage. The login limiter is process-local; if the app sits behind a proxy,
configure the proxy to replace forwarded client-IP headers, and use shared
rate-limit storage when running more than one instance. A serverless/Vercel
deployment may not preserve runtime writes, so
deploy the admin with a durable storage adapter before relying on it for club
updates.
The public site can still be built and served normally, but changes made in a
non-persistent server environment will disappear on restart/redeploy.

## Design decisions

Design read: a bilingual student security archive for MUST students, using the
club's dark editorial visual language. Dials: ENERGY 2 / RHYTHM 2 / MOTION 1.

The dark palette follows the club's cybersecurity identity and the supplied
`haruulzangi.mn` reference. Green is reserved for actions and real event status,
so it remains a signal rather than decoration. The event archive uses compact
cards and year filters because the content is an archive, not a marketing
funnel. Motion is limited to the logo matrix and short interaction transitions,
with a reduced-motion fallback. The layout uses real event content, local event
imagery, and photographs of actual members rather than decorative illustration.

The home page is deliberately a single non-scrolling screen: it states what the
club is and carries its founding year, membership and competition turnout, then
sends the visitor to `/about` or to the join link. Everything that needs
scrolling lives on `/about` and `/events`.

## Statistics ownership

The public totals live in `src/data/club-stats.json`. They are based on the
CCS 2025-2026 annual report, slides 2, 18, 22, and 36. The CCS club secretary
or appointed activity lead should review the file whenever a new semester
report is approved.

## Content and translations

Site copy lives in `src/app/i18n.ts`; add every string to both `en` and `mn`.
Event records are in `data/events.json` and include English/Mongolian titles,
summaries, locations and formats.

Keep original event artwork in `events/`; optimized WebP covers ship from
`public/events/` and are referenced by their local path in `data/events.json`.
Do not hotlink Google Drive files: Drive URLs can break and may expose private
permissions. Only publish images that the club has permission to share.

## Photographs

`gallery/` holds the club's full-resolution source photography. It sits outside
`public/`, so Next.js never serves it and it costs nothing at runtime.

Eighteen of those photographs are published, on `/about` and on `/gallery`. The
cropped, compressed WebP versions live in `public/gallery/` and are generated,
not hand-edited:

```bash
node scripts/build-gallery.mjs
```

Edit the `plates` list in `src/data/gallery.json` to add, replace or resize a
photo, then re-run the script. Each entry names a source file, a target width and
the aspect ratio the layout uses. Optional per plate: `lead` for the full-width
one, `feature` to put it in the `/about` highlight band, and `position` to
override the crop anchor. The script reports the size saved for each image; source
JPEGs run 1-3 MB and the shipped WebP total is about 270 KB.

The set is ordered newest first. The grid is flex with a `flex-basis` floor, so a
short final row shares the width rather than leaving a hole, and adding a photo
cannot recreate that problem.

### Which page shows what

`/gallery` is the archive and shows all eighteen. `/about` shows only the MNSEC
lead photograph and links to the archive. On desktop, that preview sits beside
its introduction; narrower layouts stack it below. Two pages showing the same set was a
finding in `anti-slop/audit-002-2026-09-29.md`, and the split also puts the three
club-designed posters (2020 and 2022, which carry their own printed date frames)
in the archive where they belong instead of beside current photographs in the
band. Change the selection by toggling `feature` in the spec.

`banksec-6-2025` in the gallery and the BANKSEC #6 cover on `/events` are two
different frames of the same group shot. The `/events` cover is the wider one with
the conference table in frame. Left as two frames rather than one, so a visitor
moving between the pages is not looking at the identical picture twice.

### Gallery copy and publication status

Captions and alt text live in `src/app/i18n.ts` under `gallery.items`, keyed by
plate id. Both the site build and the photo generation script validate the
actual dictionaries, not their source formatting, and reject missing or blank
captions and alt text in either locale.

The Mongolian and English captions and alt text were checked against all eighteen
source photographs. Where a name, date, result, or role was not visible or
otherwise corroborated, the copy was changed to describe the scene without
claiming it. The evidence notes are in
`anti-slop/gallery-copy-review.md`.

On 2026-09-29, the requester confirmed that all eighteen photographs currently
selected for the gallery are approved for publication.

Two additional sources remain held back under `omitted` in the spec. The
confirmation for the eighteen selected photographs does not cover those two;
their publication permission needs separate confirmation before either is added.

The founding date and organization description follow the [club's About page](https://www.sict-ccs.club/about-us).
Public contact details and social links follow the [club's official site](https://www.sict-ccs.club/).
The SICT CTF 2022 cover comes from the [club's archived event report](https://www.sict-ccs.club/news/67b2343dbdce815b2ea67deb).
The MUST-CTF 2023 cover comes from [MUST's event report](https://must.edu.mn/en/news/11132).
The MUST-CTF 2024 dates and participation figures follow [MUST's event report](https://must.edu.mn/en/news/11688).

## Security notes

- Never commit `.env.local`, passwords, session secrets, Facebook Page access
  tokens, Google cookies, or identity/banking documents.
- If Google session cookies were ever pasted into a chat or ticket, revoke them
  at [Google account permissions](https://myaccount.google.com/permissions)
  and change the account password.
- The admin API is not a public content endpoint: unauthenticated reads and
  writes are rejected.
