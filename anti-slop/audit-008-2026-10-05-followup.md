# Posts layout audit 008: approved fix follow-up

The user approved finding 1 from [`audit-008-2026-10-05.md`](./audit-008-2026-10-05.md).
Antislop remained in Mode 2. The implementation follows the later approved
posts direction: a horizontal selected-post browser and a filtered Information
section below it.

## Result

| # | Result | Fix |
|---|---|---|
| 1 | PASS | The two-column grid became a native horizontal scroller. The user later requested equal-height cards, so the rail now uses deliberate responsive preview heights rather than a row height dictated by the longest post. Each preview keeps its 16:9 image presentation and clamps text to four lines. Source, keyboard, and screen-reader order remain the admin-selected chronological order. |

The main browser has visible previous/next controls, native touch and trackpad
scrolling, Arrow keys, Home, and End. Controls are 44px. The status text
announces the visible range. The below-page Information section contains only
selected posts whose original text includes `#ccs-info`, case-insensitively.
It does not fetch or expose any additional Facebook content. The Facebook link
continues to expose the full original post.

Implementation: `src/app/posts/posts-view.tsx`, `src/app/globals.css`,
`src/app/i18n.ts`, and `src/app/admin/facebook-post-manager.tsx`.

Evidence: [`evidence-008-2026-10-05/fixed/`](./evidence-008-2026-10-05/fixed/).
The desktop capture shows equal-height cards with full 16:9 image previews and
four-line text previews. The 390px Mongolian capture shows the touch-scroll
affordance, 44px controls, preserved image proportions, and no horizontal page
overflow.

## Verification

- `npm run typecheck`: passed.
- `npm test`: passed (24 assertions).
- `npm run lint`: completed with the two existing unused-variable warnings in
  `anti-slop/audit-005-visual-sweep.mjs`.
- `npm run test:e2e`: 96 browser tests passed across desktop, tablet, and
  mobile Chromium projects. The added browser regression covers both locales, case-insensitive
  `#ccs-info` selection, equal card heights, clamped long text, controls,
  keyboard navigation, touch scrolling, and no document overflow.
- `git diff --check`: passed.

The existing, unapproved narrow home-heading issue remains out of scope and
unchanged.
