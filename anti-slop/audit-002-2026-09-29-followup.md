# Anti-slop audit 002 follow-up - 2026-09-29

Fixes all nine findings from `audit-002-2026-09-29.md`, plus the `/gallery` route
the audit flagged as unbuilt. Every PASS below is backed by a measurement taken
after the change, not by inspection.

## Findings closed

| # | Rule | What changed |
|---|---|---|
| 1 | R-03, R-32 | The `}` that closed `@media (max-width: 640px)` early was moved. Its rules and the landscape query are now two separate blocks. |
| 2 | R-03, R-32 | Viewer buttons 40px to 44px. The 44px minimum was also lifted out of the mobile block and applied at every width, because a 740px landscape phone and a tablet are touch devices too. |
| 3 | R-25 | The radial scrim `DESIGN.md` describes now exists, sized to the copy block rather than to the shield or the viewport. |
| 4 | R-27 | The gallery has an empty state, a per-image failure state, and a reserved box for decode. |
| 5 | R-25 | New `--line-strong: #6b6b6b`, at 3.20:1 on the lightest surface it sits on. Applied to the controls whose boundary is what identifies them. |
| 6 | R-05, R-14 | The grid is flex with a `flex-basis` floor, so a short final row shares the width instead of leaving a hole. The three framed posters now crop centred. |
| 7 | R-23, R-36 | Captions unchanged; the provenance note is in `README.md` instead. They are inferences and remain unconfirmed. |
| 8 | R-06 | Section labels and footer headings are sentence case, tracking reduced from 0.22em to 0.06em. |
| 9 | antislop-code | Thirteen box-drawing banner comments replaced with plain section names. |

### 1. The unreachable media query

`globals.css` closed `@media (max-width: 640px)` after the hero-facts rules and
opened `@media (max-height: 560px) and (min-width: 641px)` in its place, so
everything below was gated on a wide, short window. At 408px:

| Selector | Before | After |
|---|---|---|
| `.program-card` columns | `54px 150px 44px` | `34px 208px 38px` |
| `.program-copy` width | 150px | 208px |
| `.stats-grid` | `173.5px 173.5px` | single column |
| `.site-footer` padding | `64px 32px 58px` | `44px 20px` |
| `.text-link` min-height | 0px | 44px |
| `.footer-contact-links a` | 36px | 44px |

The program card needed a third track, not two: with `1fr 38px` the copy landed
in the 38px arrow column. It is now `34px 1fr 38px` so number, copy and arrow
share one row.

### 2. Target sizes

`.gallery-viewer-button` was 40x40 with no mobile override. More usefully, the
whole 44px story only existed below 640px, so 740px and 900px viewports served
23px nav pills and 24px text links. 44px is now unconditional on the nav pills,
locale toggle, brand, skip link, text link, year filters, footer links and
footer brand. Measured across `/`, `/about`, `/gallery`, `/events` at 390, 740,
900 and 1280 CSS px: **zero elements under 44px**, zero horizontal overflow. The
64px header absorbed 44px pills without growing.

### 3. Hero scrim

`.hero-content::before`, a radial gradient in `--bg` sized to the copy block
with an 80px vertical bleed. Sized to the shield it would still miss: at 740x360
the shield is 284px and the facts row sits below it. Verified by screenshot at
740x360, where `FOUNDED 2019` and `120+` now sit on black rather than on live
dots that composited to 1.60:1 behind the text.

### 4. Gallery states

All three verified by driving the browser, not by reading the code.

- **Empty**: emptied `gallery.json` to `plates: []`. The `length === 0` guard
  returns a labelled panel instead of a heading over an empty grid.
- **Failure**: pointed a plate at an id with no WebP on disk so the optimiser
  returned a real 400. The tile swapped to a labelled placeholder, the `<img>`
  left the DOM, and the caption stayed. Note that deleting a file the optimiser
  had already cached does not 404, so the first two attempts proved nothing.
- **Decoding**: the tile's `aspect-ratio` plus its own fill reserve the box
  before the file decodes, so nothing shifts.

### 5. Component boundaries

`--line-strong: #6b6b6b`, measured with the skill's `contrast-check.py`:

| Surface | Ratio |
|---|---|
| `--bg` `#0a0a0a` | 3.72:1 |
| `--surface` `#141414` | 3.46:1 |
| `--surface-2` `#1c1c1c` | 3.20:1 |

Applied to `.button-quiet` (its fill was 1.16:1, so the border was the only thing
identifying it), the viewer buttons, the year filter, gallery tiles and event
cards. The existing `--control-border` is 2.79:1 on `--surface-2`, which is why
a second value was needed rather than reusing it.

### 6. Gallery grid

Flex with `flex: 1 1 300px`, so a partial last row shares the width. Verified:
the final two tiles measure 524px each against a 16px gap, no hole. The layout
no longer depends on the photo count, so adding a photograph cannot recreate it.

The three club-designed posters are cropped `centre` instead of `attention`,
which was slicing their green border bands in half. They are still posters
sitting beside photographs. That mismatch is a content judgement and it belongs
to the club, not to this pass.

### 8 and 9. Labels and comments

Section labels, the hero fact labels and the footer headings are sentence case
at 0.06em. The data-field labels inside event cards and programme rows keep
their caps, because they are a different register and 0.08-0.2em is not the
"extreme" tracking the rule names. Zero box-drawing comments remain in
`globals.css`; the explanatory comments underneath were kept.

## The `/gallery` route

Built after the fixes, so it inherits them: the same empty, failure and decode
states, the same boundaries, the same count-agnostic grid. It is in the navbar
(desktop and mobile), the sitemap, `page-metadata.ts` and the client-side title
logic. `photo-gallery.tsx` and `gallery-plates.ts` moved from `src/app/about/`
to `src/components/` because two routes now own them.

`DESIGN.md` said "the navbar is three items". It is four. Updated.

## Verification

Run after all changes: `npx tsc --noEmit`, `npx eslint .` and `npm run build`
all clean. Ten routes build, `/gallery` among them.

- Lighthouse on `/`, `/about`, `/gallery`, `/events`: accessibility 100, best
  practices 100. No console errors or warnings on any route.
- The `meta-description` failure is still reported and is still the same false
  positive recorded in the audit. All four routes carry the tag in server HTML
  and in the live DOM; verified with curl after the changes.
- Keyboard, re-verified on the shared component: Tab reaches every tile, Enter
  opens the viewer, focus moves into the dialog, ArrowLeft and ArrowRight change
  photograph, Escape closes, focus returns to the originating tile.
- No horizontal overflow at 390, 408, 700, 740, 900, 1164 or 1280 CSS px.

## Fixed after the first pass

**The viewer opened in the top left corner.** `margin: auto` on a modal dialog is
what centres it, and it comes from the user-agent stylesheet. Tailwind's
preflight resets every margin to zero, so the dialog was laid out at
`position: fixed; inset: 0` with no margin and sat in the corner. Added
`margin: auto` to `.gallery-viewer`. Verified centred and fully inside the
viewport at 2019, 397 and 740 CSS px wide, with the image inside the stage and
the control bar inside the viewport at each.

## Third pass: the two pages no longer show the same set

`/about` and `/gallery` were rendering all eighteen photographs, which was the
last structural finding left open. They now have separate jobs.

`/about` shows a six-photograph band: the MNSEC 19 lead plus five spanning
2023 to 2026, ending in a "See all 18 photographs" link to the archive.
`/gallery` keeps all eighteen. Which six is a `feature` flag per plate in
`src/data/gallery.json`, not a list in a component, so the spec stays the single
place the set is declared.

`PhotoGallery` now takes `photos` as a prop rather than importing the set. The
viewer, its counter and its arrow keys all step through whichever set the page is
showing. Verified by driving both: on `/about` seven presses of ArrowRight from
the first tile give 2, 3, 4, 5, 6, 1, 2 of 6; on `/gallery`, 2 through 8 of 18.
The set wraps inside itself rather than at eighteen.

The split also settles the framed posters without dropping them. All six band
photographs are plain photographs; the three club-designed posters, which carry
their own printed date frames, live in the archive where a poster among
photographs belongs. Not a deletion, a placement.

`banksec-6-2025` in the gallery and the BANKSEC #6 cover on `/events` are two
different frames of the same group shot, the `/events` one wider with the
conference table in frame. Compared them side by side and left them as two frames
so a visitor crossing between the pages is not looking at the identical picture
twice. Recorded in `README.md`.

## A wrong reason, corrected

`banksec-three-friends-2025.jpg` was held back as "stored rotated, so the people
lie sideways in frame". That was wrong. The build calls `.rotate()`, which honours
EXIF orientation before it reads any pixels, and a 4:3 crop of the corrected image
is an ordinary photograph of three members. Verified by generating the crop and
looking at it, not by reasoning about the metadata.

The reason under `omitted` now says so, and both omitted entries are reduced to
the question that actually remains: nobody has confirmed the people in them are
comfortable being on the site. That is not an agent's call to make quietly, so
they stay out and the path to publishing each one is written down. `ccs-expo-team-2024.jpg`
is also fixable now that the distortion can be cropped out rather than being a
reason to leave it alone.

## Captions: a review sheet instead of a warning (first-pass status)

Finding 7 cannot be closed by code, because the gap is a person reading eighteen
captions. What could be done was make the review small, so
`anti-slop/gallery-copy-review.md` lists every plate with its source
file, its caption, and where the date in that caption came from: corroborated by
`data/events.json`, read off a banner inside the photograph, or inferred from the
filename and nothing else.

Twelve of the eighteen rest on the filename alone. Two of those twelve are claims
about people rather than dates, and they are the ones most likely to be skipped
because they look harmless next to a competition floor:

- `founding-2020` says **founding members**, on a frame that carries a date but
  not a claim about who the people are
- `early-members` says **earliest members**, with no date at all to anchor it

`README.md` and `DESIGN.md` point at the sheet, and the readme says twelve need
checking rather than the softer "please review".

**Superseded by the 2026-09-29 source-image review below.** The filename-only
counts and the “founding members” / “earliest members” claims describe the
earlier draft, not the current captions.

## Verification after this pass

`npx tsc --noEmit`, `npx eslint .` and `npm run build` clean. 18 plates, 5
features plus the lead, every plate has a WebP on disk and copy in both locales,
0 problems.

- Lighthouse on `/`, `/about`, `/gallery`, `/events`, `/admin`: accessibility
  100 and best practices 100 on all five. Zero console errors or warnings.
- Zero elements under 44px and zero horizontal overflow across all four public
  routes at 390, 740, 900 and 1280 CSS px.
- Viewer on both pages: centred, fully inside the viewport, image inside its
  stage, all three controls at 44px, wraps within its own set, focus returns to
  the originating tile, body scroll restored. Enter opens and Escape closes with
  real key events.
- "See all 18 photographs" navigates to `/gallery`, which loads all eighteen. The
  link is localised: `?lang=mn` renders `Бүх 18 зураг үзэх` pointing at
  `/gallery?lang=mn`, and the count reads `18-ийн 6`.
- Both pages one column at 390px with no overflow.

## Open after the first follow-up pass, before later reviews

- **Finding 7 needs a person.** The review sheet is written and the build cannot
  verify truth. Twelve captions rest on filenames, and two of them assert who
  people are.
- **The two omitted photographs need a person**, for the same reason: consent,
  not optics.

## 2026-09-29 follow-up: copy and permission update

The eighteen source photographs were reviewed directly. Captions and alt text in
both locales now stick to details visible in the images or corroborated by event
records; unsupported claims about winners, founders, membership chronology,
event editions, and participant roles were removed. See
`anti-slop/gallery-copy-review.md` for the image-by-image evidence.

The requester confirmed that all eighteen photographs currently selected for the
gallery are approved for publication. This closes the permission question for
those eighteen. The two separately omitted photographs were not part of that
confirmation and remain out of the gallery pending their own permission check.

This source-image review closes Finding 7 for the current gallery: each caption
and alt text is tied to visible image details or an event record, and the
unsupported people, role, and chronology claims were removed. The two omitted
photographs remain excluded pending separate publication permission.

## Narrow mobile pass on 2026-09-29

Real Chromium inspection at 312 × 780 found two layout defects missed by the
earlier viewport set:

- The EN and MN controls were 36 × 44px. Their shared rule now gives each a
  44 × 44px target.
- The footer's two-column social-link grid squeezed labels into 55px tracks and
  overflowed its 126px column by 46px. At phone widths, the links now use one
  column.

After the changes, `/about` measured 312px for the document, shell, and footer;
the 272px footer grid and every 126 × 44px social link fit their containers.
No visible content overflow remained. `/gallery` and `/events` also measured
312px document width at this viewport. The Mongolian gallery screenshot showed
the title, instructions, and first photographs without clipping.

## Further fixes on 2026-09-29

- Mongolian URLs now pass their `lang` query into the route's locale provider, so
  page copy is localized in the first server-rendered HTML instead of switching
  from English after hydration. The provider owns the `lang` attribute so it
  also stays correct when the visitor switches languages.
- The gallery viewer uses the same order as the rendered tiles when the lead
  image is moved to the front. If a non-empty list has no lead marker, the
  first photograph is used as the lead instead of crashing the page.
- Several Mongolian descriptions, captions, date labels, and admin messages
  were tightened for more natural phrasing.
- The `/events` and `/admin` loading/error fallbacks used the root provider's
  English default even on Mongolian URLs. They now read `lang=mn` from the route
  and render the matching localized message and header.
- The admin badge was hard-coded in English in both the login and dashboard;
  it now has a Mongolian label.
- The CTF Duel's sixteen participants were shown under “Team size.” That data
  field was removed; the participant count remains in the event summary.
- The edit form's Cancel button stayed active during a pending save, even while
  other draft controls were disabled. It now disables with the form.
- The home page's `120+` label now says it counts MUST-CTF participants, and
  the Mongolian event dates use the same `дүгээр сарын` style as the rest of
  the site.
- Event date ranges now mark both the start and end dates separately in HTML.

Manual Chromium inspection checked Mongolian home, about, events, gallery, and
admin pages at phone and desktop widths; the inspected pages had no horizontal
overflow or console errors. Reloading `/about?lang=mn` returned Mongolian copy
and `lang="mn"` on the server-rendered page subtree. No automated tests or build
were run for this follow-up.

## Short phone height check on 2026-09-29

At 312 × 540, the home page's fixed-height shell clipped the top of the headline
and the last statistic. At 660px tall or shorter, the shell grows to its content
and allows vertical scrolling. Setting the hero width explicitly also prevents
its flex item from expanding past the phone width.

After the change, at 312 × 540 the page is 697px tall, the 272px-wide content
fits inside the hero, and the document remains 312px wide. PageDown reaches the
bottom of the full content, including all three statistics. At 312 × 667 the
entire hero fits without scrolling. This was one additional confirmed visual
bug in the narrow-height sweep. No automated tests or build were run.
