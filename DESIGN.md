# CCS Club design direction

The design system for `sict-ccs.club`. Read this before changing anything visual.
`antislop.md` is the filter applied on top; this file is the direction it filters
toward. Where the two conflict, this file wins and antislop asks first.

## What this is

A bilingual (MN/EN) site for a student cybersecurity club at MUST. The audience
is ICT undergraduates deciding whether to attend a session, and club members
looking for the next event. The second audience already knows the club; the
first does not, so the site has to state plainly what happens and when.

## Identity

**The shield is the product.** The club's real logo is the only brand asset and
it is never restyled, recoloured, or redrawn. Everything else defers to it.

**Monospace throughout.** One typeface, `Geist Mono`, for copy and headings
alike. Reason: the club works in terminals and hex dumps, and a monospace site
is legible to a technical reader without a second typeface competing for
attention. This is the site's clearest identity signal, so it is absolute: do
not add a sans face.

**One accent, used sparingly.** `#00c950` is the only chromatic colour in the
stylesheet. It marks: the accent word in a headline, section labels, the primary
button's hover, focus rings, and the dot field in the hero. If two things on a
screen are green and neither is a focus ring, one of them is wrong.

**Dot field, not rain.** The hero effect is a static shimmering grid of square
dots shaped like the shield, drawn over the real logo. It is not falling code
and not a rain animation. Reason: the dots are the logo's own pixels resampled,
so the effect says "this is the club" rather than "this is a hacker template".
Density is a named constant (`KEEP` in `matrix-logo.tsx`) for exactly this
reason: it is tuned, not incidental.

## Dials

| Dial | Value | What it means here |
|---|---|---|
| ENERGY | 2 | Committed, not loud. Big type, one accent, no decoration without a job. |
| RHYTHM | 2 | Four distinct compositions on the home page, not five variations of one. |
| MOTION | 1 | The hero dot shimmer and a slow background wash. Everything else is a 150-200ms state transition. |

MOTION is 1 on purpose. The one expressive moment is the hero, and it is enough.

## Palette

| Token | Value | Job |
|---|---|---|
| `--bg` | `#0a0a0a` | Page. Near-black, not pure black, so the green has somewhere to sit. |
| `--surface` | `#141414` | Cards, the join section. |
| `--surface-2` | `#1c1c1c` | Cover placeholders, quiet buttons. |
| `--surface-3` | `#262626` | Active toggle fills. |
| `--fg` | `#ffffff` | Headlines. |
| `--fg-2` | `#d1d5dc` | Hero description, which sits over the shield rather than on black. |
| `--fg-3` | `#a1a1a1` | Body copy. |
| `--fg-4` | `#8c8c8c` | Labels and metadata. 4.5:1 on `--surface-3` exactly, so nudge it to `#909090` if that surface is touched. |
| `--green` | `#00c950` | The accent. |
| `--radius` | `14px` | Cards and sections. |

Every token clears WCAG AA. This is a floor, not a target.

## Rules that are not negotiable here

- **No fabricated numbers.** Every figure traces to `src/data/club-stats.json`
  or to a real record in `data/events.json`. Adding a stat means adding its
  source. Empty beats invented.
- **No testimonials, no FAQ, no pricing, no logo bar.** The club has none, so
  the site has none.
- **No section numbering.** It was removed: a `01`-`07` counter across two pages
  implied one continuous document that does not exist.
- **No live link in the navbar without a page.** The navbar is three items and
  every one resolves.
- **The hero logo is never obscured.** The dot field fades out under the copy via
  a radial scrim (`.matrix-logo::after`). If text over the hero is hard to read,
  the scrim is the thing to adjust, not the type colour.

## Reference

`haruulzangi.mn` is the club's design reference: compact rather than endless,
stats treated as a hero element, past events grouped by year, dark palette.
Its target was roughly 2900px tall for a content page. Hold to that.
