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
npx tsc --noEmit
npm run lint
npm run build
```

## Routes

- `/`: bilingual club landing page with the matrix logo hero
- `/events`: compact event archive with featured, upcoming and year-filtered
  past events
- `/admin`: private event publishing interface; it is never indexed

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
a same-origin `Origin` header. The API validates every field server-side and
accepts only local image paths under `/public/events`; there is no upload
endpoint.

Set `EVENTS_FILE_PATH` when the persistent event file is mounted somewhere
other than `data/events.json`.

### Deployment requirement

The file-backed admin requires a Node.js server with a **persistent writable
filesystem** and one writer process. It works on a VPS, one container with a
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
with a reduced-motion fallback. The layout uses real event content and local
event imagery rather than decorative illustration.

## Statistics ownership

The public totals live in `src/data/club-stats.json`. They are based on the
CCS 2025-2026 annual report, slides 2, 18, 22, and 36. The CCS club secretary
or appointed activity lead should review the file whenever a new semester
report is approved.

## Content and translations

Site copy lives in `src/app/i18n.ts`; add every string to both `en` and `mn`.
Event records are in `data/events.json` and include English/Mongolian titles,
summaries, locations and formats.

Curated event images are stored locally in `public/events/`. Do not hotlink
Google Drive files: Drive URLs can break and may expose private permissions.
Only publish images that the club has permission to share.
The founding date and organization description follow the [club's About page](https://www.sict-ccs.club/about-us).
Public contact details and social links follow the [club's official site](https://www.sict-ccs.club/).
The SICT CTF 2022 cover comes from the [club's archived event report](https://www.sict-ccs.club/news/67b2343dbdce815b2ea67deb).
The MUST-CTF 2023 cover comes from [MUST's event report](https://must.edu.mn/en/news/11132).
The MUST-CTF 2024 dates and participation figures follow [MUST's event report](https://must.edu.mn/en/news/11688).

## Security notes

- Never commit `.env.local`, passwords, session secrets, Google cookies, or
  identity/banking documents.
- If Google session cookies were ever pasted into a chat or ticket, revoke them
  at [Google account permissions](https://myaccount.google.com/permissions)
  and change the account password.
- The admin API is not a public content endpoint: unauthenticated reads and
  writes are rejected.
