# Anti-slop follow-up — 2026-09-27

Follow-up to `audit-001-2026-09-27.md`. All 12 findings from that audit were
approved and actioned, plus a hero rework and a copy pass requested separately.

## Audit findings closed

| # | Rule | Status | What changed |
|---|---|---|---|
| 1 | C-3, R-05 | FIXED | `showFeatured` now requires `featured.status !== "ended"`. The archive carries an ended featured event instead of the featured slot advertising an event from December 2025. |
| 2 | C-3, R-20 | FIXED | `/events` hero stats no longer duplicate the home page. Now computed from the archive: event count, years covered, most recent year. Every figure is real and derived. |
| 12 | R-37, R-31 | FIXED | `DESIGN.md` written: identity, dials, palette with reasons, and the non-negotiable rules. |
| 9 | R-31 | FIXED | `01`-`07` numbering removed from both pages. The conditional `{showFeatured ? "07" : "06"}` went with it. |
| 4 | R-31 | FIXED | Unused `Geist` sans face and `--font-geist-sans` removed from `layout.tsx`. |
| 3 | C-2 | FIXED | `event-cover-compact` was live (it feeds the `sizes` attribute). Gave it a real rule; that rule broke the grid, so the class is now used only for sizing. See "Reverted" below. |
| 5 | C-2 | FIXED | `nav.home`, `nav.activities`, `hero.eyebrow`, and `nav.join` all removed from both locales after the UI stopped rendering them. |
| 6 | R-31 | FIXED | Split `.hero-footnote` rule merged. |
| 7 | R-03 | FIXED | Footer links, `.footer-brand`, `.text-link`, and `.scroll-mark` all raised to 44px on touch widths. |
| 11 | C-3 | FIXED | Deleted `next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`, and the unused `ccs-logo-with-text.png`. `public/` now holds only the real logo and five event photos. |
| 10 | C-4 | FIXED | Comment added explaining that `overflow-x: hidden` is load-bearing. |
| 8 | C-2 | N/A | The register link is correctly conditional. Nothing to fix. |

## Hero rework

The original hid the logo: it sampled the shield's alpha into a dot field, then
put the real logo underneath at `opacity: 0.07`, blurred 34px and desaturated.
The shield was a ghost.

Now: the real logo renders at `opacity: 0.22` with a green drop-shadow, and the
dot field draws on top of it at 34% density (`KEEP = 0.34` in
`matrix-logo.tsx`). Same effect, same shimmer maths, same reduced-motion
handling as the original. The logo is now the object the effect sits on.

Two problems surfaced during the rework and were fixed:

- **Text was unreadable.** The dot field ran straight through the headline and
  description. Restored the radial scrim the original had, widened to 62%x52%
  with a soft falloff so it fades the dots under the copy without leaving a
  visible dark blob. The description moved from `--fg-3` to `--fg-2` because it
  now sits over the shield rather than on black.
- **The shield was too strong at first.** At `opacity: 0.62` it flattened the
  headline. Settled at 0.22, where the green reads and the type stays on top.

Also added: `.background-wash`, a fixed three-layer radial gradient at 5% opacity
drifting on a 34s alternate cycle, so the page is not flat black. Sized at
`inset: -6%` with matching scale caps so the drift has headroom inside the frame
and does not depend on the body clip. Disabled under `prefers-reduced-motion`.

## Copy pass

Voice: plain and factual, as chosen. Both locales written, flagged for native
review below.

| Key | Before | After |
|---|---|---|
| `hero.description` (EN) | "A student community learning, building and growing together in information networks and security." | "A student club at MUST running competitions, talks and hands-on security sessions." |
| `about.titleLine1/2` (EN) | "From curiosity to capability." | "Founded 2019. / Running since." |
| `about.body2` (EN) | "We bring together students interested in information security to share knowledge, build skills and grow into cybersecurity specialists." | "We run competitions, lecture series and practical sessions for students who are into information security." |
| `about.link` (EN) | "What we do" | "What we run" |
| `programs.title` (EN) | "Learn. Practise. Build." | "What we run." |
| `join.title*` (EN) | "Let's take on challenges together." | "Come to / a session / sometime." |
| `join.body` (EN) | "Just starting out, or want to share your experience? Join the next CCS activity." | "No experience needed. Come to one session and see whether it is for you." |
| `events.stats` (EN) | founded / members / MUST-CTF participants | events archived / years covered / most recent |

## MN copy for native review

Written to match the English register and length. Not verified by a native
speaker. Check these before launch:

- `hero.description`: "ШУТИС дээр суралцан оюутнуудын мэдээллийн аюулгүй байдлын клуб. Тэмцээн, лекц, дадлагын цаг зохион байгуулна."
- `about.titleLine1/2`: "2019 онд" / "байгуулагдсан."
- `about.body2`: "Бид мэдээллийн аюулгүй байдлыг сонирхон судалдаг оюутнууд тэмцээн, лекц, дадлагын цаг зохион байгуулна."
- `about.link`: "Бидний зохион байгуулдаг зүйл"
- `programs.title`: "Бидний зохион байгуулдаг зүйл."
- `join.title*`: "Дурын" / "өдөр" / "ирж үзээрэй."
- `join.body`: "Туршлага шаардахгүй. Нэг цаг ирж, өөрийнхөө ч сонилцоод үзээрэй."
- `events.stats`: "Бүртгэсэн үйл ажиллагаа" / "Хамарсан он" / "Хамгийн сүүлд"

Note that `about.link` and `programs.title` are now near-identical strings. That
matches the English, where they are also both "What we run", but if it reads
repetitively in Mongolian, change one.

## Reverted

**`event-cover-compact` rule.** The audit called this class dead. It was not
fully dead: it feeds the `sizes` attribute on the cover image, which is a real
performance decision. Giving the class a CSS rule to satisfy the audit broke the
archive grid, so the rule was removed and the class left doing its actual job.

**Archive grid alignment.** `align-items: start` on `.event-card-grid` left
ragged rows, because events with a cover photo are much taller than the ones
without. Changed to `stretch` with the card body as a flex column, so a row reads
evenly. Coverless events now get a labelled placeholder slot rather than a hole.

## Delivery Gate

| Item | Result |
|---|---|
| R-02 no em dash | PASS. `grep -rno "—" src/` returns 0. One em dash was caught in a code string during the pass and replaced. |
| R-03 mobile | PASS. 390px: `scrollWidth === clientWidth`, zero overflowing elements. All tap targets 44px except skip-link (keyboard-only), brand (42px, beside a 44px logo), and the EN/MN buttons (36px wide, 44px tall). |
| R-17, R-36 no unsourced numbers | PASS. Home stats still trace to `club-stats.json` with its source line. Events stats are computed from `data/events.json`. |
| R-18, R-28 no testimonials, no FAQ | PASS. Neither exists. |
| R-23, R-38 no assumed assets | PASS. Only the real logo. The cover placeholder is a labelled slot, not a fabricated image. |
| R-24 navbar resolves | PASS. Three items: `/#about`, `/events`, external CTF. The redundant "Join" button was removed; the hero and join sections still carry the real form link. |
| R-25 contrast | PASS. Green 8.09:1 over the new background wash. `--fg-2` description over the shield, 8.93:1 worst case. Lighthouse 100 on both routes, both widths. |
| R-26 no dead controls | PASS. Enumerated every anchor and button on both routes. No console errors. |
| R-27 three states | PASS. Loading, error, and empty for events; loading, error, empty, and not-configured for admin. |
| R-32 keyboard | PASS. Focus ring defined once, covers `summary`. No `outline: none`. Mobile menu is native `<details>`. |
| R-33 no patch scripts | PASS. |
| R-34 both themes | PASS. One palette, fully implemented. |
| R-35 verified by running | PASS. `npm run build` clean. Driven in a real browser at 1440px and 390px on both routes. Lighthouse 100/100/100 across four runs. Console clean. |
| C-1..C-5 | PASS. The join section is now the largest element on the page, so the closing ask reads as the page's point. |
| R-31 reasons written down | PASS. `DESIGN.md` now holds the reasons. The load-bearing `overflow-x` clip and the dot-density constant are both commented at source. |

## One question outstanding

`ctf-duel-2026` (Mazala 1vs1 CTF Duel, May 2026) is marked `featured: true`,
and there is no BANKSEC #7 record. If Mazala 1v1 ran as a side event of BANKSEC
#7, then a BANKSEC #7 record is missing from `data/events.json` and the featured
slot points at the side event rather than the thing it belonged to.

This was not changed. Adding an event means asserting its date, format, location
and participant numbers, and those are facts only the club has. Add it through
`/admin` once the fields are confirmed.

## 2026-09-29 status update

The question above is now closed against the current event data. `data/events.json`
contains a BANKSEC #7 record, and `ctf-duel-2026` is no longer marked as the
featured event. The two records remain separate; the data does not assert a
relationship between them.
