# Carbon-inspired public-page layers

Approved direction: apply Carbon-style depth to About, Gallery, and Events while retaining CCS green, Geist Mono, and the original shield. Antislop applied during the work. No Carbon library, blue branding, new website image assets, or application behavior changes were required.

Design Read: bilingual student-club editorial pages for MUST undergraduates, with charcoal hierarchy and sparse shield-derived texture. ENERGY 2 / RHYTHM 2 / MOTION 1; existing Home motion exceptions retained.

## Decisions

- Near-black `#0a0a0a` ground and `#101010` content bands keep the page grounded.
- `#161616` headers/sections establish a distinct second layer.
- `#202020` photographic surfaces and the closing invitation create a higher layer.
- `#262626` hover/selected surfaces indicate interaction without another accent.
- Metadata becomes `#949494` locally to preserve contrast on the lighter layers.
- Interactive borders use `#707070`; green remains the focus/selected/hover accent.
- Static square dots use the original PNG's alpha as a shield mask. No logo file was recolored, redrawn, or replaced. Home retains the expressive animated matrix.
- Public page variables are scoped to `.public-page`; Home and admin keep their existing colors.
- Archive filters now have bounded charcoal fills and a selected green edge. Navigation stays plain text. DESIGN.md records this approved change.
- Event cards brighten rather than lift on hover. Gallery tile hover brightens the caption surface and strengthens its boundary.
- About retains the single MNSEC preview and the full archive retains all 18 photographs.

Implementation: `src/app/globals.css`, the About/Gallery/Events view wrappers, and `DESIGN.md`. Regression coverage: `tests/browser/visual.spec.ts`, including real inactive-filter backgrounds, scoped tokens, static mask properties, full-page screenshot widths, and selected state.

## Evidence

[`evidence-carbon-public-pages/`](./evidence-carbon-public-pages/) contains screenshots, 122 layout measurements, contrast records, and `header-and-hover.json`.

- Production build, lint, typecheck, 16 unit checks, 69 browser tests, and `git diff --check` passed.
- The repeated 122-case sweep found zero normal console errors, horizontal spills, unintended clipping, or solid-background text contrast failures. Full-page capture widths matched their viewports too.
- Separate pixel checks hide text without moving it, then measure the actual background behind each header label/title/description/stat. Across three public routes, two languages, and 1366px/768px/312px widths, the lowest measured ratio was 5.93:1.
- The regression test verifies metadata at least 4.5:1 and interactive borders at least 3:1 on each charcoal layer. The brighter `#262626` layer is included.
- Actual event hover produced `#202020`, green border, and no transform. Gallery hover produced `#262626`, green border, and no transform.
- Desktop About remains 2969px English / 3057px Mongolian. Its single photograph and all three programme descriptions remain.
- Manual full-page inspection caught a decorative pseudo-element extending capture width. Its right edge is now contained; a full-page-width assertion prevents recurrence. About's history band establishes a formatting context so its opening margin stays inside the band.

The measurement server used an isolated copy of the real eight-event archive. Recovery browser tests used their own temporary fixtures. Production event data was not written by this pass, and unrelated working-tree changes were retained.

## Interaction record

- EN/MN and header navigation: both languages and all public routes render; mobile navigation opens/closes and reaches Events.
- Gallery: all 18 localized captions/alt texts match; tiles open the viewer; buttons/arrow keys step; Escape/close dismiss; focus returns.
- About preview: one photo, localized 1-of-18 count, only the close control in its single-photo viewer; Escape dismisses.
- Archive filters: clicking changes pressed state and visible records; selected fill is `#262626` with a green lower edge.
- Gallery/event hover: actual pointer hover changes surfaces and borders as recorded above.
- Login/editor: validation, invalid password, draft retention, keyboard reauthentication, stale revision, reload latest, reset/new event/delete/logout remain covered by the passing suite.
- Error retry: both languages and both server-data boundaries still recover after isolated-store restoration.
- Existing programme/contact/gallery destinations remain unchanged; their original click-through record is in audit 003. Footer phone/mail/social/map links remain inspected destinations, not claims of external-app/service testing.

## Delivery gate

PASS for this change in the tested Chromium scope. Unchanged behavior is supported by the passing suite and the prior [full follow-up gate](./audit-003-2026-10-02-followup.md).

### Hard gate

- R-02 PASS: no UI copy added or changed.
- R-03 PASS: 122 layout measurements and capture-width checks show no overflow or unintended clipping; existing 44px controls remain tested.
- R-17 PASS: real club/event counts retained; no invented statistics.
- R-18 PASS: no testimonials or fictional identities added.
- R-23 PASS: original image assets retained; approved dots use the original shield mask.
- R-24 PASS: navigation regression tests pass; no new destinations.
- R-25 PASS: header pixel minimum 5.93:1; text/background scan and palette checks pass.
- R-26 PASS: recorded viewer, filters, forms, editor, and retry actions pass.
- R-27 PASS: existing localized states retained; error recovery remains tested.
- R-28 PASS: no FAQ added.
- R-32 PASS: keyboard viewer, Escape/focus return, reauthentication, and focus styles remain covered.
- R-33 PASS: direct source edits; measurement scripts do not patch application styles.
- R-34 PASS: existing single dark website theme retained; Home/admin scopes unchanged.
- R-35 PASS: production build, 69 browser tests, screenshot inspection, console checks, and interaction record above.
- R-36 PASS: no security/compliance/performance claims added.
- R-37 PASS: approved direction recorded in DESIGN.md before verification.
- R-38 PASS: original club information/photos retained; no fabricated content.

### Purpose gate

- R-01 PASS: charcoal layers communicate hierarchy; no new chromatic accent or colored glow added.
- R-04 PASS: existing meaningful action glyphs retained; no icon set added.
- R-06 PASS: documented Geist Mono voice retained.
- R-07 PASS: static header dots reproduce the approved shield silhouette from its actual alpha, not a stock grid.
- R-08 PASS: existing navigation arrows retained; single-photo preview has no useless step controls.
- R-09 PASS: no promotional capsules or new badges added.
- R-10 PASS: existing header/viewer layer separation retained; no additional glass.
- R-12 PASS: full-width bands are flat backgrounds, not elevation shadows; no new floating-card treatment.
- R-13 PASS: no glow added.
- R-14 PASS: lead photograph remains full width within its grid; secondary archive photographs retain their hierarchy.
- R-19 PASS: new texture is static; interaction transitions remain brief and event cards no longer lift.
- R-22 PASS: real photographs retained; no illustrations introduced.

### Liveliness

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 declared and retained.
- Consistency PASS: calm public-page texture contrasts with the expressive Home entrance.
- Focal points PASS: inspected screenshots keep titles and lead photographs dominant.
- Whitespace PASS: distinct full-width bands organize existing content without increasing About height.
- Accent PASS: CCS green remains the single active brand accent.
- Identity PASS: real shield, square-dot silhouette, Geist Mono, and club photographs remain specific to CCS.
- Design Read PASS: declared above, following the user's approved Carbon-inspired direction.

### Craftsmanship and quality locks

- C-1 PASS: layer, texture, metadata, border, and state purposes are recorded in Decisions.
- C-2 PASS: interaction record and 69 browser tests support functional completeness.
- C-3 PASS: no template sections or filler content added.
- C-4 PASS: bilingual layout, keyboard, admin/recovery, and image-viewer regressions pass in the stated scope.
- C-5 PASS: screenshots, measured ratios, geometry, and test results support the claims here.
- R-05 PASS: existing distinct page compositions retained; no template restructuring.
- R-11 PASS: bounded filters use 4px corners; existing card/control radius hierarchy retained.
- R-15 PASS: action-specific CTAs unchanged.
- R-16 PASS: no promotional buzzwords added.
- R-20 PASS: Carbon supplies layering logic, not borrowed branding; CCS identity remains.
- R-21 PASS: existing approved dark direction retained.
- R-29 PASS: charcoal neutrals plus the existing green accent; no extra palette family.
- R-30 PASS: no Carbon dashboard/page template or IBM visual identity copied.
- R-31 PASS: major changed decisions have one-line purposes above.

## Limits

Chromium only; no physical-device, Safari/Firefox mask rendering, actual browser 200% zoom, or complete screen-reader certification. CSS-mask rendering was inspected in Chromium, not assumed solely from its computed properties. No broader security or accessibility certification is implied. No commit made.
