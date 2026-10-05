# Visual audit 009 - 2026-10-05

Antislop applied after the fact (Mode 2), as requested. This is an audit, not a
fix pass. No application source, design direction, content, or production data
was changed. New files are this report, the read-only measurement scripts
(`audit-009-visual-sweep.mjs` and its companion probes), and
`evidence-009-2026-10-05/`.

`DESIGN.md` was set aside by the user for this pass, so no finding below is
raised against a recorded design intention. Findings are raised against the
antislop rules and against what the browser actually renders.

Design Read: bilingual student cybersecurity club site for MUST undergraduates,
dark monospace language, dial ENERGY 2 / RHYTHM 2 / MOTION 1 (from `DESIGN.md`,
used only as the declared baseline).

## Scope and method

- Production build, then the production server at `127.0.0.1:3100` with the
  real eight-record `data/events.json` archive and the real six-post
  `data/facebook-posts.json` selection in the store, following the audit-003
  and audit-005 precedent. No Facebook Page token: the admin refresh control is
  correctly disabled and the admin posts panel shows its unconfigured state.
- 96 layout probes: 6 routes x 8 viewports (280, 312, 360, 390, 641, 768, 940,
  1366) x 2 locales, each measuring document overflow, out-of-bounds boxes,
  per-text-node Range geometry, sub-44px targets, and clipped text.
- Range-level text measurement rather than `scrollWidth`: it caught the two
  heading failures in this report that `scrollWidth` cannot see, because those
  boxes do not clip, they overflow visibly.
- Home one-screen sweep at 9 desktop heights and 15 short/mobile viewport pairs.
- 68 composited contrast pairs in the main sweep, plus 86 more inside opened
  dialogs, the gallery viewer, the posts empty state, and the logged-in admin,
  after the first pass used selectors that did not exist.
- State exercises: both dialogs (open, arrow-key, Escape, focus return, body
  scroll restore), both carousels (click and keyboard, desktop and mobile),
  year filtering, locale switching, posts empty and malformed stores, events
  empty and malformed stores with retry, admin login failure and success, the
  unsaved-changes guard, mobile menu.
- Full click-through of every control on all five public routes in both locales
  at 1366x900 and 390x844 (40 scripted click-through steps plus 135 enumerated
  controls, 0 unresolved), plus a fresh keyboard walk of 10 stops per route per
  locale (120 stops, 0 without a visible outline).
- Screenshots: 30 full-page route captures, plus targeted captures for each
  finding.
- `npm run build`, `npm run typecheck`, `npm test` (24 assertions),
  `npm run lint`, and `npm run test:e2e` (96 browser tests). All passed. Lint
  reports only the two pre-existing unused-variable warnings in
  `anti-slop/audit-005-visual-sweep.mjs`.

Evidence: [`evidence-009-2026-10-05/`](./evidence-009-2026-10-05/).

## Findings

### 1. HIGH - R-03: the home hero headline is cut off at 280px

At 280px wide, on both locales, the hero line `Communication` paints to
x=288.84 inside an `h1` content box that ends at x=260. The last 8.84px of the
word is outside the viewport. At 260px it is 28.84px outside, at 240px 48.84px.
`.hero` has `overflow: hidden`, so the remainder is genuinely lost, and
`document.scrollWidth` reports no overflow because the clip hides the evidence.

Reason: the site's first line of text, the one thing every visitor reads, loses
readable characters at a narrow mobile viewport. R-03 requires text to stay
inside its container.

Evidence: [`narrow-heading-evidence.json`](./evidence-009-2026-10-05/narrow-heading-evidence.json),
[`narrow-home-en-280x844.png`](./evidence-009-2026-10-05/narrow-home-en-280x844.png),
[`shot-home-en-280x844.png`](./evidence-009-2026-10-05/shot-home-en-280x844.png).
The Mongolian locale is affected identically, because the hero lines are
English in both.

### 2. HIGH - R-03: the About headline word `cybersecurity` overflows at 280px and below

At 280px the `h1` box is 240px wide and the word `cybersecurity` measures
251.17px, so it paints 11.17px past its own box. At 260px it is 11.17px past
the viewport; at 240px, 31.17px past. `body` has `overflow-x: hidden`, so the
word is cut rather than scrollable. The word has no break opportunity and the
`h1` sets no `overflow-wrap`, so it cannot reflow.

Reason: a single word in the page's second-most-important heading is unreadable
past 260px. Same rule, same failure mode as finding 1, different element: the
hero is clipped by its own container, this one is clipped by the body.

Evidence: [`clip-source-and-header240.json`](./evidence-009-2026-10-05/clip-source-and-header240.json),
[`narrow-about-en-240x844.png`](./evidence-009-2026-10-05/narrow-about-en-240x844.png),
[`shot-_about-en-280x844.png`](./evidence-009-2026-10-05/shot-_about-en-280x844.png).
The chain measurement shows no ancestor clips it: every element from `h1` up to
`body` has `overflow-x: visible` except `body` itself.

### 3. HIGH - R-03: at 240px the header brand text paints over the locale toggle

Below 250px the brand copy has no room and its `CCS` glyph run keeps painting.
At 240px the `CCS` text run ends at x=89.84 while the `EN` button begins at
x=86: a 3.84px overlap, with both painted. `brand-copy` collapses to
`min-width: 0` and the box measures 0px wide, so the text escapes a zero-width
box. At 230px the overlap is 13.84px, at 220px 23.84px. The result reads as
`CCSEN`.

Reason: two labels occupy the same pixels. The design system's own control
shape says the EN/MN selector is plain text, which makes the collision more
visible than it would be with bordered buttons, and it hits every route because
the header is shared.

Evidence: [`header-240-collision.json`](./evidence-009-2026-10-05/header-240-collision.json),
[`about-header-240x844.png`](./evidence-009-2026-10-05/about-header-240x844.png).
The collision is identical on all five public routes. It starts at 250px and
clears from 250px upward.

### 4. MEDIUM - R-17: the events hero says `8+` while the archive holds exactly 8

`events-view.tsx` renders `${pastEvents.length}+`, producing `8+` for an
archive of exactly 8 records. The same screen states the exact figure twice
more: the year filter reads `8 events` and the rail reads `1-3 of 8`. So one
screen carries both the precise count and a less precise version of it.

Reason: the number is real and sourced, so it passes R-17 as written. But a
visitor comparing `8+` against `8 events` cannot tell whether the hero is
counting something else or rounding. This was recorded in audit 005 as
observation 3 and in audit 006, and it is still in the code.

Evidence: [`final-checks.json`](./evidence-009-2026-10-05/final-checks.json)
(`countConsistency`), [`shot-_events-en-1366x900.png`](./evidence-009-2026-10-05/shot-_events-en-1366x900.png).

### 5. MEDIUM - R-06: the admin list renders 9px and 10px type

The logged-in admin event list sets `.admin-event-type` at 9px and
`.admin-event-select small`, `.admin-list-heading`, and the form kicker at
10px. These are the smallest text anywhere on the site. Measured across all five
public routes, both locales, at 1366px and 390px, the smallest public text is
12px. The site is monospace, which has narrower forms than a proportional face
at the same size.

Reason: 9px monospace is below the size at which letterforms stay distinct.
It is an internal screen, which lowers the stakes, but R-06 asks typography to
improve readability rather than merely fill space.

Evidence: [`gallery-posts-admin.json`](./evidence-009-2026-10-05/gallery-posts-admin.json)
(`adminTypeSizes`), [`type-sizes.json`](./evidence-009-2026-10-05/type-sizes.json).
Contrast is fine at these sizes (8.31:1 for the type label, 5.48:1 for the row
metadata), so this is a legibility finding, not a contrast one.

### 6. LOW - R-35: a minified React #441 still appears on the events error-retry path

Reproduced on the production build: break the events store, load `/events`,
restore the store, press "Try again". Recovery is complete (8 archive cards
render, the error boundary unmounts), but the console records
`Minified React error #441` twice. It does not appear on plain navigation, on
`/posts`, or on any other tested path. Audit 005 recorded this as finding 1 and
said to re-test it on the next React upgrade rather than churn now; it is
unchanged and still only reachable through deliberate error recovery.

Reason: recorded so the e2e console assertion and this audit's console
evidence stay accurate. No user-visible harm.

Evidence: [`states-recheck-2.json`](./evidence-009-2026-10-05/states-recheck-2.json)
(`react441Trace`, bucketed per navigation).

## Observations, not numbered fixes

- The footer link `Hack The Box` measures 3.03px wider than its own box at
  exactly 641px, on all four public routes and both locales. It is 0px at 600,
  620, 660, 700, and 768. This is one pixel of letter-spacing rounding at one
  snap point, it is not clipped, and no ancestor clips it. Recorded so the next
  sweep does not re-investigate it.
- `.admin-facebook-message` overflows its own box by 2px to 7px at every
  viewport tested, including 1366px. The box has `overflow: visible` and
  `overflow-wrap: anywhere`, so the excess is the trailing glyph of a
  pre-wrapped Facebook message, not a layout failure. Facebook copy is
  user-supplied and its line breaks are its own.
- The posts Information section does not render with the current selection,
  because none of the six real posts carries `#ccs-info`. Adding a marked post
  to a temporary store makes the section appear with one card and a 2676px page
  height. The absence is correct behaviour: the heading does not promise a
  section that has no content. The store was restored afterward.
- The events archive reports zero geometry for the track at 1366x900 when read
  within 150ms of navigation, then reports full geometry on every later read.
  This is a load-timing artifact of the probe, not a defect: with
  `waitForFunction` on a non-zero `clientWidth`, the same width reports
  1116px client, 2983px scroll, working Arrow/Home/End keys and a working year
  filter. Both readings are in
  [`events-geometry-repeats.json`](./evidence-009-2026-10-05/events-geometry-repeats.json).
- The empty-tile appearance in the first full-page gallery captures at 390px is
  a lazy-loading artifact of full-page capture, not missing images. Scrolling
  the page and then measuring reports 18 of 18 images complete with non-zero
  `naturalWidth`, 0 failed tiles, at both 390px and 1366px.
- `/gallery` renders 3729px tall at 1366px, and `/about` 2923px. No finding:
  the recorded height target was set aside for this pass, so there is nothing
  to measure against.

## What passed in the inspected scope

- **No horizontal overflow anywhere.** 0 of 96 layout probes exceeded 1px, and
  0 of 50 narrow probes (240px to 320px, 5 routes, both locales) reported a
  document wider than the viewport. The three heading failures in findings 1-3
  are clipped rather than scrollable, which is why the document width stayed
  correct.
- **Tap targets.** 0 sub-44px targets across 96 probes on the public pages. The
  one hit anywhere is the admin featured-event checkbox input at 16x44, whose
  clickable row is the 44px-tall `.checkbox-field` label wrapping it, so the
  real target clears the minimum.
- **Contrast.** 118 composited pairs measured (158 samples taken, the rest
  superseded once the real class names were found), every one at or above AA.
  Lowest is 5.37:1
  (gallery tile captions on `#161616`), then 5.48:1 (admin row metadata), 5.89:1
  (footer headings), 5.97:1 (event dates, post dates, gallery viewer counter).
  The green accent measures 8.16:1 on the posts card and 8.93:1 for section
  labels.
- **Copy honesty.** 0 em dashes and 0 buzzword hits across all five public routes
  in both locales. Every figure on the public pages traces to
  `src/data/club-stats.json` or to the eight real archive records. No
  testimonials, no FAQ, no pricing, no logo bar anywhere in the tree.
- **States.** Every data view has all three. Events: empty archive renders its
  empty copy and drops the "up next" section entirely rather than showing a
  heading over nothing; malformed store renders "Events are unavailable" with an
  alert role and a retry that recovers to all 8 cards. Posts: empty selection
  renders "No Facebook posts have been selected yet."; malformed store renders
  "Posts are unavailable" and recovers to all 6 cards. Admin: wrong password
  shows "Invalid password."; the Page-token-absent case shows a config note and
  a disabled refresh control with an explanation. Loading boundaries exist on
  events, posts, gallery, and admin.
- **Controls.** 135 public controls exercised, 0 unresolved: every internal link
  returns 200, every in-page anchor finds its target, every `tel:` and `mailto:`
  is well formed, and all 5 external destinations are real. The navbar resolves
  all five routes and marks the current one with `aria-current="page"`. The home
  primary CTA lands on `/about` in both locales. The About in-page link jumps to
  `#programs` and the gallery link lands on `/gallery`. The one non-link
  programme row (`MUST-CTF`) correctly has no arrow and no href, so it does not
  look clickable.
- **Dialogs.** Both open, both move with arrow keys, both close with Escape and
  with their close button, the gallery viewer returns focus to the tile that
  opened it, and body scroll is restored in both cases.
- **Carousels.** Both rails work by pointer and by keyboard (Arrow, Home, End)
  at 1366, 1024, 768, and 390, with a 2px green focus outline, 44px controls,
  correct disabled states at both ends, and an `aria-live` position that updates
  ("1-3 of 8" to "2-4 of 8", "6-8 of 8" at End). Source order stays visual order.
- **Keyboard.** The skip link is the first Tab stop on every route and activates
  to `#main-content`. 120 focus stops measured (6 routes x 2 locales x 10), 0
  without a visible outline, 0 invisible. No `outline: none` in the stylesheet.
- **Motion.** One infinite animation in the whole site: the 34s background wash.
  The hero canvas is the only scripted motion and has a reduced-motion path.
  Under `prefers-reduced-motion: reduce` the wash runs once at 1e-05s and all
  transitions collapse to the same, so nothing loops.
- **Admin.** Logged-in layout holds at 1366, 768, 390, and 280 with no overflow.
  Editing a title raises the unsaved-changes guard, and navigating away raises
  "Discard unsaved event changes?" and stays on `/admin` when declined. Save and
  Cancel are present and enabled. Removing a selected post and refreshing the
  list are present and enabled; only the Page-token refresh is disabled, with
  the reason on screen.
- **Locale.** Default landing is English with `lang="en"`; `?lang=mn` serves
  Mongolian with `lang="mn"` and Mongolian `<title>`; the toggle updates URL,
  `lang`, and `aria-pressed` together; an unknown `?lang=xx` falls back to
  English rather than rendering an untranslated mix.

## Gate status

Not clean. Findings 1, 2, and 3 are R-03 failures at narrow viewports. Finding 4
is an honesty-precision issue, finding 5 a legibility issue, finding 6 a console
record.

No finding has been changed. Approve specific numbers, for example `1`, `1 and 2`,
or `1, 2 and 3`, before any follow-up work.