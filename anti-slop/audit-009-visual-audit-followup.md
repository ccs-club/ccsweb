# Visual audit 009: approved fixes follow-up

The user approved all six findings in
[`audit-009-visual-audit.md`](./audit-009-visual-audit.md). Findings 1 to 5
are fixed. Finding 6 is unchanged, with the reason recorded below.

Antislop stayed in Mode 2: the audit list was numbered, the user approved the
numbers, and only those were touched.

## Results

| # | Result | Fix and verification |
|---|---|---|
| 1 | PASS | The hero size is now capped by the width available, not only by the 34px floor: `min(clamp(34px, 7.2vw, 76px), calc((100vw - 40px) / 8.45))`, scoped inside the existing `max-width: 640px` block where the 20px hero padding applies. `Communication` renders at 28.4px at 280px wide and fits with 11.6px to spare. Desktop is untouched: 76px at 1920, 1440, and 1366; 73.7px at 1024; 34px from 344px up. |
| 2 | PASS | The same cap covers all four public hero headings (`.page-hero`, `.events-hero`, `.gallery-heading-page`, `.posts-hero`): `min(clamp(34px, 6vw, 68px), calc((100vw - 40px) / 7.9))`. `cybersecurity` renders at 30.38px at 280px and fits with 13.9px to spare, 27.85px at 260px, 25.32px at 240px. Desktop is untouched: 68px at 1920 through 1366, 34px from 414px up. |
| 3 | PASS | Below 250px the brand wordmark is dropped and the shield carries the brand on its own, which is what the brand is. `.brand` is `flex-shrink: 0` and cannot absorb the squeeze, so the only honest option was to stop painting text that has nowhere to go. At 250px and up the wordmark returns, and the painted gap between `CCS` and `EN` goes from 3.84px overlap to 6.16px clearance at 250px and 36.16px at 280px. The menu control keeps its 44px height at every width. |
| 4 | PASS | The events hero renders the exact archive count. It now reads `8` against the filter's `8 events` and the rail's `of 8`, instead of `8+`. The label already says "Events archived", so no copy changed. |
| 5 | PASS | Every admin text size is now 12px or larger. The 9px type label became 12px, the 10px row metadata, list heading and form kicker became 12px, and the remaining 10px and 11px admin labels were raised to 12px so the internal screens hold the same floor as the public ones. The smallest admin font size measured on the logged-in dashboard is 12px, up from 9px. |
| 6 | NOT FIXED | Investigated, deliberately unchanged. React error #441 is `getSnapshot should be cached`, raised by `useSyncExternalStore` when the snapshot changes between render and commit. The app's own snapshot (`readStoredLocale` in `locale-provider.tsx`) returns a locale string, which React compares by value and cannot churn. The error only appears on the events error-boundary retry path, where "Try again" calls `router.refresh()` while the router store is mid-update, so it originates in the framework's router subscription. Recovery is complete and there is no visual, functional or accessibility effect. Churning the shared error-boundary shell to silence one console line on a deliberate error-recovery path is a worse trade than the line itself, and the finding was already recorded in audit 005 with the same recommendation. Re-test it on the next React or Next upgrade. |

Implementation: `src/app/globals.css` and
`src/app/events/events-view.tsx`. Regression coverage in
`tests/browser/visual.spec.ts`.

## Evidence

[`evidence-009-2026-10-05/fixed/`](./evidence-009-2026-10-05/fixed/)

- `fixed-measurements.json`: heading overflow at 240, 260, 280 and 320px is
  0 on both routes; header overlap is `null` (wordmark hidden) at 240px and
  negative at 250px and up; smallest admin font size is 12px.
- `typography-across-widths.json`: hero and page-hero font sizes plus painted
  word geometry at 23 widths from 1920 down to 240. Every width reports the
  widest word inside its box.
- `fixed-home-en-280x844.png` and `fixed-about-en-240x844.png`: the two
  previously clipped headings, complete.
- `fixed-header-en-240x200.png`: the header at 240px, no overlapping labels.
- `fixed-admin-list-1366x900.png` and `fixed-admin-list-390x844.png`: the
  admin event list at the new 12px floor.
- `fixed-events-hero-1366x900.png`: the exact archive count.

## Verification

- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed (24 assertions).
- `npm run lint`: completed with only the two pre-existing unused-variable
  warnings in `anti-slop/audit-005-visual-sweep.mjs`.
- `npm run test:e2e`: 108 browser tests passed across desktop, tablet and
  mobile Chromium projects, up from 96. Four new tests, each run in all three
  projects:
  - `public hero headings keep their longest word inside the reading column`
    covers 5 routes x 2 locales x 8 widths from 240px to 1366px.
  - `the header wordmark never overlaps the language control` covers 2 locales
    x 5 widths, and checks the menu control stays on screen at 44px tall.
  - `admin metadata never renders below 12px` walks every text node in the
    logged-in dashboard in both locales.
  - `the events hero states the exact archive count` asserts the hero figure
    equals both the rendered card count and the year filter count, and carries
    no `+`.
- Re-ran the audit-009 sweep against the fixed build: 96 layout probes with 0
  horizontal overflow, 50 narrow probes with 0 offenders (was 11), 0 sub-44px
  targets, 0 clipped text, 0 contrast pairs below AA. Lowest composited pair
  is still 5.37:1 on gallery tile captions; the raised admin text measures
  5.48:1.
- Home one-screen behaviour is unchanged: the shallow-desktop compact layout
  still applies through 600px, and the 320x568 case still scrolls 23px with no
  clipped text, exactly as recorded in the audit.
- `git diff --check`: passed.

## Gate status

Clean for findings 1 to 5. R-03 now passes at every width measured from 240px
to 1920px in both locales. Finding 6 stays open as a documented framework
console record with no user-visible effect.