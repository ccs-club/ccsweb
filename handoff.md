# Handoff — CCS Club site

## What this is

A from-scratch rewrite of the CCS (Computer / Communication / Security) student
club site at `sict-ccs.club`.

Stack: **Next.js 16.3.6 (App Router, Turbopack) + TypeScript + Tailwind v4**.

```bash
npm run dev     # http://localhost:3000  (use localhost, not 127.0.0.1)
npm run build
npm run lint
```

---

## The active goal

**Make the site more polished and professional, add real event content, and give
the club a way to update the site without touching code.**

Broken into parts, with status:

| # | Part | Status |
|---|---|---|
| 1 | Hero matrix animation (blurred real logo + live pixel field) | **Done** |
| 2 | EN/MN language toggle | **Done** |
| 3 | Design system matching the `haruulzangi.mn` reference | **Done** |
| 4 | `/events` route — polished, compact event listings | **Done** |
| 5 | Admin page — add/edit events without editing source | **Done** — file-backed, authenticated |
| 6 | Community / event photos from Google Drive | **Done** — curated local copies only |

The point of 4 and 5 is complete: event records now live in
`data/events.json`, and the club can publish an event from the admin form instead
of asking a developer to edit source and redeploy.

### Design direction for the events work

Take cues from `haruulzangi.mn`, which is the club's design reference:

- **Compact, not endless.** The reference is ~2900px tall total. Our current
  single page is ~3600px. The complaint was "no scroll that much" — events
  should be a dense, scannable page, not one section per event.
- **Stats as a hero element.** The public `/events` stats use the sourced CCS
  2025-2026 figures in `src/data/club-stats.json`: founded in 2019, 38 members
  in spring 2025/26, and 120+ MUST-CTF 2025 participants.
- **Year grid for past events.** Reference shows a "Past Events" grid of year
  cards. Ours should group past events by year.
- **Structured data per event.** Reference events have status (Ongoing / Ended),
  stage rows with format and location, category tags, team size, prize.

Suggested `Event` shape:

```ts
type EventType = "must-ctf" | "banksec" | "workshop" | "ctf-night" | "other";

type Event = {
  id: string;
  type: EventType;
  title: string;
  titleMn: string;        // Mongolian, since the site is bilingual
  summary: string;
  summaryMn: string;
  date: string;           // YYYY-MM-DD
  endDate?: string;
  location?: string;
  registrationUrl?: string;
  status: "upcoming" | "ongoing" | "ended";
  tags: string[];
  coverImage?: string;    // local path in /public, not a Drive URL
  featured: boolean;
  revision: number;       // optimistic concurrency guard
};
```

Events are stored in `data/events.json` and validated at runtime. A database is
the next step only if the club needs multiple concurrent editors or a
serverless deployment.

### Security note on the admin page

An admin page that writes content cannot be an open form. Minimum bar:
- gated behind an auth check (even a shared password is better than nothing)
- writes validated server-side, never trusting the client's shape
- no file upload without type and size limits

Do not ship an unauthenticated write endpoint.

---

## Drive photo review

The club Drive image metadata inventory covered 901 files. It surfaced an
official MUST-CTF 2025 poster, but no image clearly identified as a Mazala 1vs1
CTF Duel photo. Keep only curated, approved public images in `public/events/`;
never hotlink Drive files or publish personal, financial, or identity material.

---

## Security: leaked Google cookies

Live Google session cookies (`SID`, `SSID`, `HSID`, `SAPISID`, `__Secure-*PSID`,
and others) were pasted into this chat while setting up the Drive connector.

**Anyone with those values can act as that Google account.** They should be
revoked at <https://myaccount.google.com/permissions> and the password changed.
They were never used — the connector uses OAuth, not pasted cookies.

---

## Current file map

| File | Role |
|---|---|
| `src/app/page.tsx` | Home page. Client component (needs locale context) |
| `src/app/matrix-logo.tsx` | Hero animation. Canvas 2D, no dependencies |
| `src/app/i18n.ts` | **All site copy**, EN + MN. Edit copy here, never in `page.tsx` |
| `src/app/locale-provider.tsx` | Locale state + localStorage persistence |
| `src/app/locale-toggle.tsx` | EN/MN switch in the header |
| `src/app/globals.css` | Entire design system, plain CSS + Tailwind import |
| `src/lib/events.ts` | Server-side validated JSON event store |
| `src/lib/admin-auth.ts` | Signed HTTP-only admin session auth |
| `src/app/events/` | Public event archive and client-side year filters |
| `src/app/admin/` | Private event publishing UI |
| `src/app/api/admin/` | Authenticated session and event mutation routes |
| `data/events.json` | Local event records; writable on a persistent Node host |
| `public/events/` | Curated, locally stored event images |
| `public/ccs-logo.png` | 592×592 shield logo, sampled by the canvas |

`/events` and `/admin` are implemented. The admin uses `ADMIN_PASSWORD` and
`ADMIN_SESSION_SECRET` from server environment variables. It validates and
atomically writes `data/events.json`; a persistent writable Node filesystem is
required. No upload endpoint exists, and cover images must be local paths under
`/events/`.

The Drive review found usable event collections, but the public site uses only a
small curated set copied into `public/events/`. No Drive URLs, identity
documents, banking screenshots, or other sensitive files are included.

---

## The hero animation

`matrix-logo.tsx` is the one non-obvious piece. Two layers stacked in
`.matrix-logo`:

1. **`.matrix-blur`** — the untouched logo PNG as an `<img>`, desaturated to
   white, dimmed to 7% and blurred 34px. Pure CSS. This is what gives the
   effect the sense of a real object behind the pixels.
2. **`.matrix-canvas`** — a live matrix of the logo's own pixels.

The canvas works like this:

1. The logo is drawn to a tiny offscreen canvas (one pixel per grid cell).
2. `getImageData` reads the alpha channel; any cell with `alpha > 40` becomes a
   dot. Dot brightness scales with alpha, so the silhouette's soft edges fade
   naturally instead of ending on a hard outline.
3. Each frame every dot is driven by two detuned sine waves plus a rare hard
   blink, so the whole field shimmers irregularly rather than pulsing.

A `::after` vignette pulls the matrix back under the headline so the copy stays
legible over the densest part.

Tuning knobs in `build()` and `draw()`: `width / 150` is dot spacing (clamped
6–11px), `0.0016` / `0.0007` are the two wave speeds, `0.011` is the blink rate,
`0.42` is dot size relative to the cell.

It is **monochrome on purpose** — the reference is white-on-black, and an
earlier coloured comet version read as a different idea entirely.

### Two gotchas that cost time

- **The logo must be same-origin.** `getImageData` throws
  `SecurityError: canvas has been tainted` if the image is cross-origin. It
  works from `/public` in dev and prod. Do not point `src` at a remote URL
  without `crossOrigin` + a matching CORS header.
- **Use `localhost`, not `127.0.0.1`.** Next 16 blocks cross-origin dev
  resources by default, so visiting via `127.0.0.1` silently breaks HMR and the
  client bundle never hydrates — the canvas stays blank at its default 300×150
  with no error in the console. Either use `localhost`, or add
  `allowedDevOrigins: ['127.0.0.1']` to `next.config.ts`.

---

## Design

Derived from `haruulzangi.mn`, which the club's own design was referencing.

| Token | Value |
|---|---|
| Background | `#0a0a0a` |
| Surfaces | `#141414` / `#1c1c1c` / `#262626` |
| Text | `#ffffff` → `#d1d5dc` → `#a1a1a1` → `#8c8c8c` |
| Admin control border | `#626262` |
| Accent | green `#00c950` (small marks only — the hero is monochrome) |
| Radius | 14px cards, 999px pills |
| Type | Geist Mono throughout, weight 400, letter-spaced |
| Content width | 1180px |

Everything is custom CSS in `globals.css`. Tailwind is imported but the markup
uses semantic class names rather than utility soup, because the reference
design is component-shaped and reads better that way.

## i18n

EN is the default; MN is a full translation, not a stub. Toggle lives in the
header and persists to `localStorage` under `ccs-locale`. The `<html lang>`
attribute updates on switch.

To add a string: add it to **both** `en` and `mn` in `i18n.ts`. The types
enforce this — a missing key in one locale is a type error.

## Accessibility

- `prefers-reduced-motion` freezes the matrix into a static pattern
- Decorative canvas and logo layers are `aria-hidden`
- Toggle uses `aria-pressed`; sections use landmarks and headings
- Semantic heading order: one `h1`, then `h2` per section

---

## Verified

As of the last change: `tsc --noEmit` clean, `eslint --max-warnings=0` clean,
`next build` passes, both locales render, the toggle persists across reload, and
the matrix changes ~91% of its cells between frames (genuinely animated).

## Verification for this pass

- `npm run build` passes on the current source and includes TypeScript checking.
- Mobile Lighthouse audits for `/` and `/events` report 100 for accessibility,
  best practices, SEO, and agentic browsing.
- Manual browser review at phone widths found no horizontal overflow. Both
  locales render, footer links are localized and accessible by name, and event
  covers load at widths matched to their rendered card sizes.
- Production smoke checks returned 200 for `/`, `/events`, `/robots.txt`, and
  `/sitemap.xml`.
- `npm run lint` passes.
- The configured admin editor was opened with temporary local-only credentials.
  Dismissing the unsaved-change prompt preserved the draft. Create, edit, and
  delete then passed against `data/.events-admin-probe.json`; the temporary
  store was removed and the real `data/events.json` was not targeted.
- Automated tests were not run.

---

## Other things not built

- News section (the original has MUST-CTF 2023 / 2024 posts)
