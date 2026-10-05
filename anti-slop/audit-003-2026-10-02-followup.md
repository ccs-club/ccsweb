# Visual audit 003: approved fixes

The user approved all eight findings in [`audit-003-2026-10-02.md`](./audit-003-2026-10-02.md). Antislop remained active during implementation. This report closes those findings in the tested Chromium scope; it is not a new comprehensive audit.

## Subsequent space-saving adjustment

The user then requested removal of the two lower About-preview photographs. `/about` now shows only MNSEC 13, with a localized 1-of-18 count; `/gallery` still contains all 18 photographs. Single-photo viewers omit previous/next controls but retain close and Escape. No image files were deleted.

Current desktop heights are 2969px English and 3057px Mongolian. Updated screenshots and `fixed/about-single-measurements.json` cover desktop, tablet, and 312px layouts, with one preview, no page errors, and no horizontal overflow. Lint, typecheck, production build, all 16 unit checks, all 66 browser tests, and diff whitespace checks were rerun successfully. The Delivery Gate remains PASS in the stated scope; no new visual techniques or content were introduced. Regression tests now assert one preview, its localized count, a closable single-photo viewer, and a 3100px desktop budget.

The three-photo measurements and 122-case sweep described below document the initial eight-finding fix pass. They are retained as historical evidence; `about-single-*` records supersede their About-photo counts and heights.

Design direction retained: dark editorial Geist Mono, original shield, real club photographs, restrained green accent. ENERGY 2 / RHYTHM 2 / MOTION 1, including the previously documented motion exceptions. No new website assets, content claims, navigation destinations, or production event-data changes were introduced by this pass. Existing unrelated working-tree changes were preserved.

## Findings and evidence

| # | Result | Fix and verification |
|---|---|---|
| 1 | PASS | Events and admin boundaries now call Next.js `retry()`. Browser tests corrupt an isolated store, restore it, click the localized button, observe a new fetch, and verify recovered cards/editor. Both languages, all three viewport projects. |
| 2 | PASS | A feathered dark backing protects the complete hero-facts area. Pixel tests force a white background and check every pixel behind each label/value at 312x667, 740x360, and 1366x900 against a 4.5:1 minimum. The shield-derived dots remain visible outside the protected area. |
| 3 | PASS | Removed inactive count opacity. `#8c8c8c` on `#0a0a0a` measures 5.89:1. Tests cover inactive filters in both languages. |
| 4 | PASS | Admin fields, delete buttons, selected-event New event controls, and checkbox labels have minimum 44px actionable dimensions. The sweep found no undersized actionable targets; the small checkbox itself has a sufficiently large enclosing label. |
| 5 | PASS | The tablet basis override excludes the lead photo. At 768px, the lead is 704px wide, with a 394.875px image and only its expected border below the caption. Supporting photographs stay in two columns. Geometry tests cover both routes/locales and additional 941px/1024px widths. |
| 6 | PASS | Declared `color-scheme: dark`. Date indicators now render light against the dark input. Screenshots verify readable icons and native calendars under light and dark browser preferences. The popup follows Chromium's browser/OS preference, not the site's forced dark scheme: it remains white under a light preference and dark under a dark preference. Native functionality is retained rather than replaced. |
| 7 | PASS | Narrow programme cards give copy its own full-width row, with linked arrows positioned separately. At 312px, the reading column is 230px rather than 130px. The static MUST-CTF card no longer reserves an empty arrow track. Tests verify width and arrow separation in both languages. |
| 8 | PASS | Reduced repeated About padding and placed the three-photo selection beside its introduction on desktop. English is 3256px tall; Mongolian is 3344px, down from 4775px/4863px. No photographs, programme descriptions, or join content were removed. The 2900px direction remains a reference, not an enforced identical locale height. |

Implementation: `src/app/globals.css`, `src/app/about/about-view.tsx`, `src/app/events/error.tsx`, and `src/app/admin/error.tsx`. Regression coverage: `tests/browser/visual.spec.ts`. The isolated store path is shared by `playwright.config.ts` and `scripts/start-test-server.mjs`; `sharp` is an explicit development dependency for screenshot pixel analysis.

Updated evidence: [`evidence-003-2026-10-02/fixed/`](./evidence-003-2026-10-02/fixed/). Original failing-state evidence remains unchanged. The updated folder contains 122 measurements, contrast/detail records, desktop About screenshots in both languages, narrow programme and hero screenshots, the tablet gallery, and admin/date-control screenshots.

## Verification and interactions

All commands passed: `npm run lint`, `npm run typecheck`, `npm test` (16 checks), `npm run test:e2e` (production build and 66 browser tests), and `git diff --check`.

The repeated 122-case production sweep found zero normal console errors, horizontal spills, unintended vertical clipping, undersized actionable targets, or solid-background text contrast failures. As before, intentionally clipped screen-reader text is excluded. Hero compositing is checked separately by the forced-white pixel test, not inferred from CSS colors alone. Deliberately malformed stores produce expected server-error logs during recovery tests.

| Interaction | Observed result |
|---|---|
| Locale controls | URL and document language switch; all five routes render in both languages. |
| Header/mobile navigation | Real routes render; mobile menu opens and closes. |
| About programme/contact links | What we run reaches `#programs`; BANKSEC opens Events; CCS Workshop reaches `#contact`. Recorded during the original sweep, with unchanged handlers/destinations. |
| Gallery link and tiles | Gallery renders 18 photographs; every caption and alt text matches its locale; Enter opens the viewer. |
| Viewer controls | Buttons and arrow keys change photographs; close and Escape dismiss; focus returns to the tile. |
| Archive year buttons | Pressed state and visible records change to the selected year. |
| Error retry | Fresh server fetch recovers events/admin after store restoration, without a full reload. |
| Password form | Empty input validates; invalid password shows an error; valid login opens the editor. |
| Expired session | Reauthentication focuses the password and retains new/existing drafts; keyboard recovery works in Mongolian. |
| Admin editor controls | Tests exercise save, stale revision, reload latest, cancel/reset, new event, confirmed deletion, refresh after expiry, and sign out. |
| Native date controls | Calendar indicator is visible; clicking opens the native popup under both browser preferences. |
| Footer destinations | Phone/mail/social/map hrefs remain unchanged and were inspected, not opened through external applications or authenticated services. |

## Delivery gate

PASS for the approved fixes within the stated browser scope. Each line records evidence or the unchanged, previously inspected implementation.

### Hard gate

- R-02 PASS: no UI prose was added in this pass; the bilingual dictionary remains unchanged.
- R-03 PASS: 122 measurements found no horizontal overflow or unintended clipping; admin actionable targets meet 44px.
- R-17 PASS: existing club statistics retained; no new statistics were invented.
- R-18 PASS: no testimonials or fictional identities added.
- R-23 PASS: original photographs and shield retained; no website assets generated.
- R-24 PASS: bilingual route/navigation browser tests pass; no destinations added.
- R-25 PASS: solid-background scan has no failures; count contrast is 5.89:1; worst-case hero pixel tests pass 4.5:1.
- R-26 PASS: retry now produces a fetch and recovery; viewer, filters, forms, and editor interactions pass.
- R-27 PASS: existing localized empty/loading/error branches retained; both server-error boundaries now recover.
- R-28 PASS: no FAQ added.
- R-32 PASS: keyboard viewer and reauthentication tests pass; focus styling and semantic controls retained.
- R-33 PASS: fixes are direct source edits; temporary measurement scripts do not patch application files.
- R-34 PASS: the existing single dark website theme is retained; native controls are checked under both browser preferences.
- R-35 PASS: production build, 66 browser tests, screenshot inspection, console sweep, and recorded interaction results above.
- R-36 PASS: no security, compliance, customer, or performance claims added.
- R-37 PASS: existing DESIGN.md direction and declared dials retained.
- R-38 PASS: existing real content retained; no plausible-looking fabricated content added.

### Purpose gate

- R-01 PASS: the additional dark gradient exists solely to protect fact-label contrast; existing brand accents remain restrained.
- R-04 PASS: existing navigation/action glyphs retained; no icon library or decorative glyphs added.
- R-06 PASS: Geist Mono remains the documented editorial brand voice; wider mobile copy improves reading without changing typography.
- R-07 PASS: the shield-derived dot motif is retained for club identity, with text independently protected.
- R-08 PASS: programme arrows retain their navigation purpose; static MUST-CTF reserves no arrow track.
- R-09 PASS: functional archive/programme labels retained; no promotional badges added.
- R-10 PASS: existing header/viewer layer separation retained; no additional glass treatment.
- R-12 PASS: existing menu-overlay elevation retained; no new floating-card shadows.
- R-13 PASS: no glow added.
- R-14 PASS: lead-photo hierarchy is preserved across tested widths; ordinary photographs remain secondary.
- R-19 PASS: existing documented motion exceptions retained; fixes introduce no animation.
- R-22 PASS: real photographs retained; no generic illustrations introduced.

### Liveliness

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1, as documented before implementation.
- Dial consistency PASS: desktop About still varies headline, history, stats, photographic band, programmes, and closing invitation.
- Focal points PASS: screenshot inspection confirms the headline/lead image lead their respective sections; tablet lead is full width.
- Whitespace PASS: reduced section padding restores density while maintaining section boundaries.
- Accent PASS: restrained green remains the sole site accent.
- Identity PASS: original shield, Geist Mono voice, real club photographs, and shield-dot motif remain recognizable.
- Design Read PASS: existing bilingual student-club editorial direction was retained rather than replaced.

### Craftsmanship and quality locks

- C-1 PASS: scrim serves contrast, wider copy serves reading, and compact spacing serves the approved density correction.
- C-2 PASS: recorded interaction tests pass, including the previously broken retry.
- C-3 PASS: no template sections added; all existing club content retained.
- C-4 PASS: normal layouts and isolated recovery states pass in the tested Chromium scope.
- C-5 PASS: measurements, screenshots, and tests support this report; no broader accessibility/security certification claimed.
- R-05 PASS: About retains distinct content-driven compositions; narrow programme copy no longer loses half its width.
- R-11 PASS: existing radius hierarchy retained, without making every element pill-shaped.
- R-15 PASS: existing action-specific CTAs retained.
- R-16 PASS: no promotional buzzwords added.
- R-20 PASS: club identity retained, with restored lead-photo hierarchy and more compact About composition.
- R-21 PASS: the documented dark-brand direction is preserved, not newly assumed.
- R-29 PASS: no new palette colors added.
- R-30 PASS: no external product design cloned.
- R-31 PASS: each major changed decision has its one-line purpose in the findings table and C-1 above.

## Limits and separate follow-up

Chromium only. No physical-device, Safari/Firefox native-picker, actual browser 200% zoom, or complete screen-reader certification is implied. Gallery failure/empty/loading inspection and external-link boundaries remain those recorded in the original report. Native popup theme is browser-controlled, as shown in the two preference screenshots.

Dependency installation reported one high-severity npm advisory. It was not remediated as part of this visual-fix scope; passing these checks is not a dependency-security clearance. No commit was made.
