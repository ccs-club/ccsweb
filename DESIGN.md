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
not add a sans face. Public body copy uses a 16px baseline; secondary labels
and metadata stay readable at 12px or larger. Reason: the mono face has narrow
forms, and shrinking it further makes dense bilingual copy hard to scan.

**People, not illustration.** The site shows the club itself: real members at
real events, holding real certificates, in a real room. No stock photography,
no illustration, no placeholder humans. This is the one place where the
monospace-terminal language yields, because the audience is deciding whether
these specific people are worth walking across campus for, and a drawing of a
person answers nothing. Photographs are held slightly desaturated so they sit
inside the palette rather than on top of it.

**One accent, used sparingly.** `#00c950` is the only chromatic colour in the
stylesheet. It marks: the accent word in a headline, section labels, the primary
button's hover, focus rings, and the dot field in the hero. If two things on a
screen are green and neither is a focus ring, one of them is wrong.

**Charcoal depth on public pages.** About, Gallery, Events, and Posts use
Carbon-inspired layering, not Carbon branding: near-black ground with
progressively lighter cards, tiles, and interaction states. Sections do not
paint their own bands: by user direction every public route renders as one
continuous ground from header to footer, so any background change adapts a
whole page at once. The Join section's surface fill and all hero/section
separators were removed with the band system. CCS green remains the accent.
The original shield's alpha forms sparse static square dots in public headers;
the animated matrix remains exclusive to Home.

**Dot field, not rain.** The hero effect is a static shimmering grid of square
dots shaped like the shield, drawn over the real logo. It is not falling code
and not a rain animation. Reason: the dots are the logo's own pixels resampled,
so the effect says "this is the club" rather than "this is a hacker template".
The sweep across the shield's circuit paths is brighter than the ambient trace;
it brings out the logo without replacing its original colors. Density is a
named constant (`KEEP` in `matrix-field.tsx`) for exactly this reason: it is
tuned, not incidental.

## Dials

| Dial | Value | What it means here |
|---|---|---|
| ENERGY | 2 | Committed, not loud. Big type, one accent, no decoration without a job. |
| RHYTHM | 2 | Five distinct public-route compositions, not five variations of one. |
| MOTION | 1 | The hero dot shimmer and a slow background wash. Everything else is a 150-200ms state transition. |

MOTION is 1 on purpose. The one expressive moment is the hero, and it is enough.

## Shape of the site

Five public routes, and the split is deliberate.

**`/` is one screen and does not scroll.** The hero states what the club is and
carries three real figures underneath the buttons. It has to work as a
poster: a visitor who sees nothing else should still leave knowing the club
exists, what it does, and roughly how big it is.

**`/about` carries the argument.** The founding statement, the statistics, the
photographs, the programs, and the join call. Everything that used to sit below
the home page's fold lives here, so this page is the one that scrolls.

**`/events` is the archive.** It is a record, not a funnel.

**`/posts` is a curated record of selected Facebook Page posts.** It is not a
live feed. An administrator chooses the snapshots that belong on the site, so
the public page stays intentional and the Page token stays server-side. The
selected record is browsed horizontally, with compact equal-height previews so
mixed image and text posts remain easy to scan. A long message is line-clamped
in its preview and remains available through its Facebook link. A selected post
containing `#ccs-info` also appears in the Information section below. The
marker remains in the original Facebook copy rather than being rewritten by the
site.

**`/gallery` is the photographs on their own.** `/about` carries a gallery band
as part of its argument: the MNSEC lead photograph and a link to the rest.
This route is the full eighteen with room to look at them. The split is deliberate.
Two pages showing the same set reads as an unfinished site, and it also keeps the
club's three designed posters, which carry their own printed date frames, in the
archive where a poster among photographs belongs.

The reason for cutting the home page down to a single screen: a club site that
scrolls immediately asks the visitor to keep reading before it has told them
anything. One screen and two calls to action is a complete first impression.

## Section labels

Section labels are sentence case at 0.06em, in the accent green. Data-field
labels inside event cards and programme rows keep their caps as a different
register, but stay at a readable 12px minimum. If a label needs to shout, it is
a heading, not a label.

## Control shape

Navigation uses plain text with color-only hover. Archive filters use bounded
charcoal controls, lighter hover/selected fills, and a green selected edge. Ordinary buttons,
tags, and icon controls use 4–8px corners. Club join calls to action keep a pill
shape; the EN/MN selector is plain text with a color-only active state. Cards
retain the shared 14px radius.

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

Public-page overrides use `--surface: #161616`, `--surface-2: #202020`,
`--surface-3: #262626`, `--fg-4: #949494`, and `--line-strong: #707070`.
Section ground is `#101010`; brighter `#161616` bands establish hierarchy.
Metadata is brightened to preserve contrast on the new layers and the static
header dots. Home and admin retain their existing tokens.

**Posts background.** The tinted-ground experiments were all rejected on the
live page: a whisper tint, a full green route, a gold record accent, a dot-grid
texture, and a green hero slab. The route now renders on the same continuous
ground as every other public page: no band stripes, no hero border, no
Information divider, no tinted surfaces. Cards stay `#161616`; green remains in
labels, links, focus rings, and the static shield dots. Do not reintroduce
tinted grounds or band stripes without an explicit new direction; if a page
needs more life, add it through content and contrast, not background paint.

Text token pairings must clear WCAG AA. Decorative surface differences are
not control boundaries; interactive borders retain their stronger tokens.
This is a floor, not a target.

## Rules that are not negotiable here

- **No fabricated numbers.** Every figure traces to `src/data/club-stats.json`
  or to a real record in `data/events.json`. Adding a stat means adding its
  source. Empty beats invented.
- **No testimonials, no FAQ, no pricing, no logo bar.** The club has none, so
  the site has none.
- **No section numbering.** It was removed: a `01`-`07` counter across two pages
  implied one continuous document that does not exist.
- **No live link in the navbar without a page.** The navbar is five items and
  every one resolves: Home, About, Gallery, Events, Posts. Posts stays in the
  primary navigation because it is a maintained club record, not an external
  Facebook embed.
- **No section promises content it does not have.** A heading over an empty
  state is worse than no heading. The events page drops its "up next" section
  entirely when nothing is scheduled rather than showing the word "upcoming"
  above a line apologising for having nothing.
- **The hero logo is never obscured.** The dot field fades out under the copy via
  a radial scrim (`.hero-content::before`). If text over the hero is hard to read,
  the scrim is the thing to adjust, not the type colour.

## Reference

`haruulzangi.mn` is the club's design reference: compact rather than endless,
stats treated as a hero element, past events grouped by year, dark palette.
Its target was roughly 2900px tall for a content page. Hold to that.
