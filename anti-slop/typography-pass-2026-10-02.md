# Typography and About copy follow-up

Antislop was applied during this pass. Design Read: bilingual student-club pages in the existing Geist Mono editorial language, ENERGY 2 / RHYTHM 2 / MOTION 1. The purpose of the size changes is to make body copy and secondary labels easier to read without changing the shield, palette, typeface, or page structure.

## Changes and evidence

- Public body text now uses 16-17px sizes; repeated labels, event metadata, gallery captions, and archive actions were enlarged. Main headings retain their existing scale.
- Home statistics have no individual black backplates. Their text uses the same foreground color as the hero description, and the shield pulse remains visible behind both. At 312px, the fact labels scale down enough to stay on one line; no horizontal overflow.
- Copy review replaced awkward fragments and literal phrasing across Home, About, Gallery, programs, and Events in both languages. For example, the Home introduction now states who CCS is and what it runs; the gallery is titled “CCS photo gallery”; event actions use direct wording. About invitation reads “Join us.” / “Бидэнтэй нэгдээрэй.” with “No experience needed. Just come ready to learn.” / “Туршлага шаардахгүй. Сурах хүсэл, эрмэлзэл байхад болно.” The Mongolian word Сурах uses Cyrillic С.
- `DESIGN.md` records the 16px public body baseline and 12px minimum for secondary labels and metadata. Admin-specific field/layout rules remain unchanged.
- Final screenshots and measurements are in [`evidence-typography/`](./evidence-typography/). About measures 2955px English and 3099px Mongolian at 1366px wide; Home fits both 312x667 and 390x844 without horizontal overflow.

## Delivery Gate, scoped to this change

- R-02 PASS: revised copy contains no em dash and its grammar was checked in both dictionaries.
- R-03 PASS: 312px and 390px Home and Events screenshots show no horizontal overflow; full browser suite passed at desktop, tablet, and mobile projects.
- R-06 PASS: Geist Mono remains the intentional club typeface; copy and supporting text are larger for legibility.
- R-25 PASS: regression test measures hero-fact contrast over the actual shield field at 312x667, 740x360, and 1366x900; all samples pass 4.5:1.
- R-31 PASS: typography increases serve readability; narrower 312px Home sizes preserve the single-screen layout and avoid wrapping the longest Mongolian label.
- R-35 PASS: lint, typecheck, production build, 18 unit tests, and 75 browser tests passed. Browser coverage checks bilingual copy, page type sizes, hero-fact styling, contrast, and responsive overflow.
- R-37 PASS: retained the existing `DESIGN.md` direction and dials; no new visual language or assets were introduced.
- C-4 PASS: page and locale checks pass at desktop, tablet, and mobile; hero text remains legible over the animated shield.

Previously reviewed shared rules remain covered by [`audit-003-2026-10-02-followup.md`](./audit-003-2026-10-02-followup.md). No commit was made.
