# Visual audit 010 - 2026-10-06

Antislop applied after the audit (Mode 2). This is a findings report only; no
application source, design direction, content, or production data was changed.

## Design Read

Bilingual student cybersecurity archive for MUST students, with a dark editorial
visual language; ENERGY 2 / RHYTHM 2 / MOTION 1, as stated in `README.md`.

## Scope and method

Reviewed the latest available production screenshots in
[`evidence-009-2026-10-05/`](./evidence-009-2026-10-05/): home, about, events,
gallery, and posts at 1366px desktop and 390px mobile. The current HEAD changes
documentation only, so these screenshots represent the current UI. This pass
focuses on visual hierarchy and identity, not a fresh interaction or responsive
regression sweep. Audit 009 records the recent contrast, keyboard, and breakpoint
checks.

The strongest visual material is the real club photography and event artwork.
The weaker impression comes from how much of the experience is carried by a
single typeface and repeated abstract framing, while that specific club content
is often secondary.

## Findings

### 1. MEDIUM - R-06: one monospace voice is doing every typographic job

`globals.css` sets Geist Mono as the global body font. It appears in the large
headings, longer reading copy, navigation, statistics, card metadata, and
controls. This gives the whole site a terminal-like voice, but little contrast
between editorial content and technical labels. Long text on `/about` and
Facebook posts also inherits the same narrow, mechanical texture.

**Improve:** create distinct roles: a characterful display voice for headings,
a comfortable reading voice for paragraphs, and monospace for dates, counts,
labels, and technical details. Choose typefaces from the club's identity and
check Mongolian glyph coverage; do not swap in another default font by habit.

Evidence: `src/app/globals.css` global `body` font rule; `shot-_-en-1366x900.png`,
`shot-_about-en-1366x900.png`, and `shot-_posts-en-1366x900.png`.

### 2. LOW - R-20: the home screen gives the name more emphasis than the club

The oversized home headline spells out “Computer Communication Security,”
which the masthead already does. The actual proposition and invitation sit
smaller beneath it, while the matrix shield occupies most of the visual field.
The first screen therefore establishes the club's label more strongly than its
people or what a student can do there. The approved event and member photography
is the site's most distinctive content, but visitors have to reach `/about` or
`/gallery` to see it.

**Improve:** make an approved photograph of members at a real event, or a
specific event artifact, the home screen's visual anchor. Give the club's
activity and invitation the headline-level hierarchy; keep the shield/matrix
as a supporting brand element. No new image asset is needed.

Evidence: `shot-_-en-1366x900.png`, `shot-_-en-390x844.png`, and
`shot-_gallery-en-1366x900.png`.

### 3. LOW - R-05: the events archive starts too far below its own introduction

At 1366×900, the events page uses most of the first viewport for the headline,
intro, and three statistics. There is then a large empty gap before “Past
events”; the event covers begin below the fold. That makes an archive page feel
like a sparse campaign page before it feels like an archive. In the stylesheet,
the events hero has 82px bottom padding and the archive section adds 86px top
padding, on top of the statistics spacing.

**Improve:** reduce that transition and bring at least the first event covers
into the opening viewport, or use a real featured/upcoming event in that space.
Keep the statistics if they help orientation, but do not let them delay the
page's primary content.

Evidence: `src/app/globals.css` `.events-hero`, `.events-stats`, and
`.events-section`; `shot-_events-en-1366x900.png`.

### 4. LOW - R-05: interior pages share the same opening composition

The About, Events, and Posts pages repeatedly open with a small green label,
a large monospace heading, a short grey paragraph, and the dotted shield mark
at the right. The Gallery page follows the same heading treatment before its
lead image. The consistent system is coherent, but the same first-screen
rhythm makes different kinds of content feel like one page template.

**Improve:** retain shared colors and navigation, but vary the opening according
to what each page contains: a human/story-led About opening, an event-led Events
opening, and a post-led Posts opening. The Gallery's lead image is already a
useful example of content-specific composition.

Evidence: `shot-_about-en-1366x900.png`, `shot-_events-en-1366x900.png`,
`shot-_posts-en-1366x900.png`, and `shot-_gallery-en-1366x900.png`.

## What is already working

- The approved photographs and event posters give the site real texture and
  recognizable subject matter. The Gallery is the strongest example of this.
- The green accent is restrained and the dark palette is coherent. More color
  or more effects alone would not solve the hierarchy and identity issues.
- Audit 009 measured no public-page overflow or sub-44px targets and found its
  sampled text contrast pairs above AA; this report does not reopen those items.

## Status

No findings implemented. Awaiting approval of the numbered findings to fix.
