# CCS Club code review

**Reviewed:** 2026-09-25  
**Scope:** Application source, event storage and admin routes, project configuration, event data, and project documentation.  
**Verdict:** The reviewed snapshot had useful security controls, but the admin workflow also had defects involving login throttling, unsaved drafts, and duplicate events. The status note below clarifies that these findings are historical and unverified against the current source.

**Status:** Historical review of the 2026-09-25 source snapshot. The current files have since changed; treat the findings below as unverified until they are reviewed against the current source.

The repository does not have a Git commit, so this review covers the current uncommitted files. It is a source review with controlled, local probes. The production website and proxy configuration were not inspected.

## Findings

### P2 - Concurrent login requests exceed the password attempt limit

**Security impact: medium.** The five-attempt limit slows sequential guessing, but does not cap concurrent requests. This weakens protection against password guessing; it does not bypass password verification.

In [`src/app/api/admin/session/route.ts`](src/app/api/admin/session/route.ts#L60), the route checks the client's attempt bucket and then awaits reading the request body. Failed attempts are recorded only after password verification at line 90. Since the bucket check does not reserve a slot, multiple requests from the same client can pass it before any of them records a failure.

**Reproduction:** Start six POST requests with the same client key and leave each body unread. Release the bodies with an incorrect password. All six reached password comparison and returned `401`. Sending six such requests sequentially returned five `401` responses followed by `429`.

**Recommended change:** After reading and validating the password, recheck and reserve the attempt synchronously immediately before password comparison. No `await` should occur between the final check, the comparison, and recording a failed attempt. Keep proxy IP handling and shared storage aligned with the documented deployment requirements.

### P2 - A save can clear a newer event draft

**Impact: medium.** The form remains editable while a save is pending. Its completion unconditionally resets the shared form at [`src/app/admin/admin-client.tsx`](src/app/admin/admin-client.tsx#L513). A user can select another event or edit the current draft while the request is in flight, then lose those unsaved changes when the earlier save finishes.

**Reproduction:** Start saving a draft, change its title while the save request is pending, then complete the request. The later title is cleared.

**Recommended change:** Disable draft inputs, event selection, New Event, and Cancel during submission, or reset the form only when its current revision still matches the submitted revision.

### P2 - A failed list refresh makes a successful creation look unsuccessful

**Impact: medium.** After a successful POST, the client awaits a second GET to refresh the event list. If that GET fails, the shared catch reports a save error and leaves the form in create mode. Retrying submits a second POST. [`src/lib/events.ts`](src/lib/events.ts#L343) intentionally generates a fresh ID when the title and date are already in use, so the retry creates a second record rather than rejecting the duplicate.

**Reproduction:** Return a successful create response followed by a failed list response, then retry Save. Two matching events are created.

**Recommended change:** Report the successful POST as saved before refreshing the list. Handle refresh failure separately, preserve the created event in the UI, and prevent retry from repeating an already completed create.

### P2 - Editing an older snapshot silently overwrites another edit

**Impact: medium when the same event is open in multiple tabs or editors.** The in-process queue serializes file writes, but [`updateEvent`](src/lib/events.ts#L395) replaces every field with the submitted form snapshot. If one tab changes the title and a second tab later saves an older copy with only a date change, the second save restores the old title. This can happen sequentially on a single supported server process; it does not require multiple server instances.

**Recommended change:** Add a revision or update timestamp to each event and reject edits whose submitted revision no longer matches the stored revision. Show the conflict and let the editor reload or reconcile the latest record.

### P2 - The tag field drops separators while typing

**Impact: medium for event entry.** [`src/app/admin/admin-client.tsx`](src/app/admin/admin-client.tsx#L365) parses, trims, and filters the controlled field after each keystroke. Typing `pwn, web` character by character produces `pwnweb`: the comma is dropped before the next tag can be entered.

**Reproduction:** Type `pwn, web` one character at a time. The saved draft's tag is `pwnweb`. Pasting an entire list can hide the problem.

**Recommended change:** Keep the input string as form state and parse the comma-separated tags on blur or submit. Check both typing and pasting a list.

### P2 - Language selection fails when browser storage is blocked

**Impact: medium for people using restricted browser storage.** [`src/app/locale-provider.tsx`](src/app/locale-provider.tsx#L73) sets an in-memory locale, catches storage errors, then dispatches a custom event. The shared event handler at line 29 clears that in-memory value, so reading the locale again falls back to English. The Mongolian selection therefore fails even though the code comment says that in-memory state keeps the tab usable.

**Reproduction:** Make `localStorage.getItem` and `setItem` throw, select Mongolian, and rerender. The provider reports English.

**Recommended change:** Keep same-tab locale notifications from clearing the fallback value. Use a separate storage-event handler for changes from other tabs, and only invalidate the stored snapshot for the relevant locale key.

### P3 - A delayed logo load can restart animation after unmount

**Impact: low.** [`src/app/matrix-logo.tsx`](src/app/matrix-logo.tsx#L114) schedules the animation when the image loads, but cleanup at line 126 does not remove the image load callback. If the component unmounts before the image finishes loading, that callback starts a new animation loop on the detached canvas. The loop schedules its next frame indefinitely.

**Reproduction:** Unmount the component before firing the image's load callback. The callback still schedules an animation frame after cleanup.

**Recommended change:** Clear image callbacks in cleanup and guard the load handler and animation loop with a disposed flag.

### P3 - Reduced-motion mode still runs the animation loop

**Impact: low, with avoidable CPU and battery use for people who request reduced motion.** In [`src/app/matrix-logo.tsx`](src/app/matrix-logo.tsx#L99), reduced motion only changes dot brightness. The code still clears and redraws the canvas and requests another animation frame at line 111, even though the visual result does not change.

**Recommended change:** Draw once when reduced motion is enabled and redraw after resize. Respond to changes in the user's motion preference.

## Follow-up checks

- **Verify public statistics.** [`src/app/page.tsx`](src/app/page.tsx#L12) and `src/app/events/events-view.tsx` publish fixed membership, competition, founding-year, and event counts. I found no source for these numbers in the repository. Confirm them against club records and set an update owner.
- **Correct image size hints.** [`src/app/events/events-view.tsx`](src/app/events/events-view.tsx#L84) advertises compact event images as `33vw`, while [`src/app/globals.css`](src/app/globals.css#L839) renders a two-column grid and switches to one column at a different breakpoint. Match the image `sizes` breakpoints to the actual grid to avoid needlessly large or blurry images.
- **Complete the Mongolian localization.** The date range uses the English word `to` in both locales at `src/app/events/events-view.tsx:131`. The home page's `aria-label="Club statistics"` is also English in Mongolian at `src/app/page.tsx:77`. Add both strings to the locale dictionaries.

## Security controls that are working

- All admin event API methods check the signed admin session server-side.
- Event mutations require a matching `Origin` header. The session cookie is HTTP-only and SameSite Strict, and is Secure in production.
- Session tokens are signed, expire after eight hours, and become invalid when either admin credential changes.
- Request bodies are streamed with byte limits; event fields, dates, registration URL schemes, and local image paths are validated before storage.
- Event mutations are serialized within a process and written through a temporary file followed by rename.
- The documented requirement for persistent storage and one writer process is accurate. Multiple replicas, volatile serverless storage, untrusted forwarded IP headers, and proxy origin behavior still require deployment checks as described in `README.md:70-83`.

No source-backed path to unauthenticated event writes, session forgery, stored script execution, or access to files outside the public image directory was identified in the reviewed code. Deployment behavior was not tested.

## Verification

All checks ran in an isolated sandbox with the source mounted read-only, networking disabled, and dummy credentials and event data. Temporary test data stayed in the sandbox.

- **Passed:** `node node_modules/next/dist/bin/next typegen`
- **Passed:** `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- **Passed:** `node node_modules/eslint/bin/eslint.js .`
- **Passed focused probes:** Login throttling, bounded request bodies, signed session integrity and expiry, invalid event inputs, event creation, tag entry, locale selection with blocked storage, stale event updates, pending save edits, failed refresh after create, and image load after component cleanup. The probes reproduced the defects described above and confirmed the listed input and session controls. No test files were added to the repository.
- **Blocked:** `node node_modules/next/dist/bin/next build` could not fetch the Geist and Geist Mono font CSS from `fonts.googleapis.com` while the build was sandboxed without network access. This leaves the production build unverified; it does not by itself show that the app fails when network access is available.
- **Dependency advisories:** Queried the npm advisory bulk endpoint for all 438 locked package/version pairs across 418 package names. It returned no matching advisories on the review date. This is a point-in-time registry lookup, not a guarantee against unknown vulnerabilities. See [npm audit documentation](https://docs.npmjs.com/cli/v11/commands/npm-audit).
- **Not checked:** Browser-level accessibility, visual contrast, responsive rendering, live deployment or reverse proxy settings, and the truth of club statistics.

The reviewed repository had no initial Git commit; `review.md` is the review artifact, and no application source was changed.

## 2026-09-27 re-audit and fixes

The findings above describe the 2026-09-25 snapshot. I rechecked them against the current source and confirmed that the login-attempt reservation, pending-save protection, create-refresh recovery, revisioned updates, raw tag input, locale fallback, animation cleanup, reduced-motion handling, image sizing, and localized event labels/ranges are now addressed.

This pass fixed three additional issues:

- Event deletion now requires the revision shown in the editor and returns `409` when another session has changed that event.
- Deleting the event currently being edited warns that unsaved edits will be discarded. A stale delete refreshes the event list and shows the localized conflict message.
- Admin field borders now meet the 3:1 UI boundary contrast target against their `#0a0a0a` field background (measured 3.25:1).
- The canonical site URL now uses `https://www.sict-ccs.club`, matching the production redirect target used by the sitemap and robots file.

The old club homepage confirms the current program descriptions and contact phone/email values. Its `35+`, `70+`, `30+`, and `40+` totals have no visible reporting date, so the site keeps its separately dated statistics rather than copying those values.

**Verification:** `npm run typecheck`, `npm run lint`, and `npm run build` passed. Against an isolated temporary event file, create/update succeeded, deletion with an older revision returned `409` and preserved the event, and deletion with the current revision succeeded. The admin UI displayed the Mongolian unsaved-draft warning and retained the draft after dismissal. Browser checks confirmed the `www` host in sitemap/robots and no horizontal overflow on the populated events page at a 341px CSS viewport; all five event covers loaded after scrolling. Temporary event data was removed; the repository's eight event records remained.

**Still outside this source audit:** production proxy/storage behavior and current club-drive photos for events without covers.
