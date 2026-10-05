# Visual audit 006: approved fixes follow-up

The user approved findings 1 and 2 from [`audit-006-2026-10-04.md`](./audit-006-2026-10-04.md). Antislop remained active during implementation. This report closes those two fixes in the tested Chromium scope and records one newly discovered issue that was not changed without separate approval.

## Results

| # | Result | Fix and verification |
|---|---|---|
| 1 | PASS | The shallow-desktop home compact breakpoint now applies through 600px rather than ending at 560px. At 1366px wide, both locales have no range-level text outside the hero for every height from 561px through 600px. The optional description is hidden, the headline, actions, and facts remain visible, and the document does not exceed the viewport height. |
| 2 | PASS | The mobile navigation control now shows its localized label, `Menu` or `Цэс`, alongside the hamburger at 390px. It is a minimum 44px-tall target, opens and closes its destination panel, and introduces no horizontal overflow. At 280px, the label stays visible and the icon gives way so the header retains its usable 44px control. |

Implementation: `src/app/site-header.tsx`, `src/app/globals.css`, and regression coverage in `tests/browser/visual.spec.ts`. No assets, content claims, routes, or production data were added or changed. Existing unrelated working-tree changes were preserved.

## New finding discovered during revalidation

### 3. HIGH - R-03: the home heading clips at a 280px-wide viewport

At 280px wide, the `Communication` headline line measures 268.84px inside a 240px `h1` content box. Its right edge reaches x=288.84, so the last 8.84px is visually clipped. The document itself reports no horizontal overflow because the page hides the spill. At 312px, the same line fits.

Reason: actual text escapes its container at a supported narrow mobile width.

Evidence: [`fixed/home-mn-280x844.png`](./evidence-006-2026-10-04/fixed/home-mn-280x844.png) and [`fixed/narrow-hero.json`](./evidence-006-2026-10-04/fixed/narrow-hero.json). This is outside the approved findings, so no source change has been made for it.

## Verification

- `npm run lint`: completed with the two pre-existing unused-variable warnings in `anti-slop/audit-005-visual-sweep.mjs`.
- `npm run typecheck`: passed.
- `npm run build`: passed. It retains the pre-existing `Unknown at rule: @theme` warning in `src/app/globals.css`.
- `npm test`: 18 assertions passed.
- `npx playwright test`: 81 browser tests passed.
- `git diff --check`: passed.

The new browser checks cover English and Mongolian menu labels at 280px and 390px, their target dimensions, panel opening, horizontal overflow, and the 1366x570 compact hero in both locales. The mobile menu opens and closes by its visible summary control in every checked locale and width. Revalidation evidence is in [`evidence-006-2026-10-04/fixed/`](./evidence-006-2026-10-04/fixed/), including the 80 height-and-locale compact-hero measurements.

## Delivery gate

Not clean. Approved findings 1 and 2 pass, but R-03 fails for new finding 3. Approve `3` before it is changed.
