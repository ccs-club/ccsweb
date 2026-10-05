# Facebook Posts audit 007: approved fixes follow-up

The user approved findings 1 and 2 from
[`audit-007-2026-10-04.md`](./audit-007-2026-10-04.md). Antislop remained in
Mode 2. No unapproved audit finding, production data, or secret was changed.

## Results

| # | Result | Fix and verification |
|---|---|---|
| 1 | PASS | At 360px and below, the footer reflows from two columns to one before the social labels become too narrow. At 280px, each visible social link is 240px wide, has no internal overflow, and remains 44px tall. |
| 2 | PASS | `DESIGN.md` now records five public routes and five resolving navbar items. It defines Posts as a curated Page record, not a live Facebook feed or external embed, and applies the public charcoal direction to it. |

Implementation: `src/app/globals.css`, `DESIGN.md`, and the new narrow-footer
regression in `tests/browser/visual.spec.ts`.

Evidence: [`evidence-007-2026-10-04/fixed/`](./evidence-007-2026-10-04/fixed/).
`footer-280.json` records a 280px Mongolian Posts page with a 280px document
width, a one-column 240px footer grid, five unclipped social links, and no
browser errors. `posts-mn-narrow.png` is the corresponding full-page capture.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 24 assertions passed.
- `npm run lint`: completed with the two existing unused-variable warnings in
  `anti-slop/audit-005-visual-sweep.mjs`.
- `npm run build`: passed.
- `npm run test:e2e`: 90 browser tests passed across desktop, tablet, and
  mobile Chromium projects. The new test checks both locales at 280px for
  unclipped social-link labels, 44px targets, and no document overflow.
- `git diff --check`: passed.

The expected server logs from deliberately malformed event-store tests still
appear only while error-boundary recovery is being exercised. Those test cases
pass and are unrelated to these fixes.

## Delivery status

The approved audit 007 findings pass. The separate, unapproved home-heading
issue remains documented as finding 3 in
[`audit-006-2026-10-04-followup.md`](./audit-006-2026-10-04-followup.md) and
was not changed.
