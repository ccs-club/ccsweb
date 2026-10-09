# Deploy guide — Vercel project `ccs-frontend`

Instructions for an AI agent (or human) to deploy this repo and manage its
Vercel project safely from the terminal. Follow steps in order. Do not skip
verification steps.

Facts about the linked project:

- Team / scope: `ccs-89d8f543`
- Vercel project name: `ccs-frontend` (yes, it is an older project name —
  the name is cosmetic; domains and env vars stay attached to it)
- Local link: `.vercel/project.json` (`projectId: prj_gI51UPzEDL24nxkBrHYbmhj1Ajig`)
- This repo: `github.com/ccs-club/ccsweb`

## 0. Preflight (every session)

```bash
vercel whoami          # must print a logged-in user
cat .vercel/project.json   # projectName must be ccs-frontend
vercel env ls          # list env vars; check names exist (values are hidden)
```

If `vercel` is not installed: `npm i -g vercel && vercel login`.

If `.vercel/project.json` is missing or wrong, `vercel link` → pick team
`CCS (ccs-89d8f543)` → `ccs-frontend`. Never create a new project for this
repo unless the user explicitly says so.

## 1. First-time setup (already done once — do not repeat)

- [x] `vercel link` to `ccs-89d8f543/ccs-frontend`
- [ ] Git repo connected: see section 3
- [ ] Env vars set: see section 2

## 2. Environment variables

Required by this app (see `.env.example`):

| Name | Environments | Notes |
|------|--------------|-------|
| `ADMIN_PASSWORD` | production, preview | password for `/admin` |
| `ADMIN_SESSION_SECRET` | production, preview | session signing secret |
| `DATABASE_URL` | production | pooled Postgres (Neon) string; stores events and selected posts. Required for `/admin` saves to persist on Vercel; see section 7. Use a **separate** database or branch for preview so previews never write production content |
| `FACEBOOK_PAGE_ID` | optional | public ID, safe to set |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | optional | secret — never print it |

Set from terminal (prompts for value):

```bash
vercel env add ADMIN_PASSWORD production preview
vercel env add ADMIN_SESSION_SECRET production preview
```

Verify: `vercel env ls` must list both names under production.

Rules:

- Never echo token values into logs, commit messages, or files in the repo.
- The project previously belonged to a different app (`ccs-frontend`). If
  env vars from that app are still present and are not needed by this app,
  ask the user before removing them.
- Changing env vars does not redeploy automatically; a new deployment is
  needed for them to apply.

## 3. Point the project at this GitHub repo

The Vercel project may currently be connected to a different GitHub repo.
Swapping the connected repo keeps domains, env vars, and deployment history;
it only changes which repo auto-deploys on push.

Steps:

1. Dashboard: CCS team → project `ccs-frontend` → Settings → Git.
2. Disconnect the old repository if one is connected.
3. Connect `ccs-club/ccsweb`, production branch `main`.
4. Check Settings → General → Root Directory is `/` (repo root).
5. CLI alternative: `vercel git connect ccs-club/ccsweb` (disconnect old
   repo first via dashboard if the command refuses).

After connecting, push to `main` triggers a production build. The GitHub
integration needs the Vercel GitHub App to have access to the `ccs-club`
org/repo.

## 4. Deploy from terminal

This repo has large directories that must not be uploaded. A
`.vercelignore` file at the repo root keeps uploads small (an earlier
attempt tried to upload 92 MB because of them):

```gitignore
# .vercelignore
anti-slop
events
gallery
scripts
tests
playwright.config.ts
review.md
```

`events/` and `gallery/` are build inputs (`scripts/build-gallery.mjs`
processes them into `public/gallery/`), not needed on Vercel. `scripts/` is
excluded but `npm run build` calls `scripts/check-gallery.mjs` — if the
build fails on Vercel for that reason, keep only `check-gallery.mjs` in the
upload (remove the `scripts` line, add `scripts/build-gallery.mjs`,
`scripts/gallery-copy.mjs`, `scripts/start-test-server.mjs`).

Keep `.vercelignore` in sync with reality — if a path above stops existing,
drop the line; if a new heavy non-app directory appears, add it. The
uploaded build must always contain: `src/`, `public/`, `data/`,
`package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`,
`eslint.config.mjs`, `.next/` is built server-side, never upload it.

Deploy:

```bash
npm run typecheck     # gate: must pass
vercel                # preview deployment first
```

Inspect the preview URL it prints. Then, only with user confirmation:

```bash
vercel --prod
```

`vercel --prod` from an unclean working tree deploys uncommitted code.
Prefer: commit → push (git integration deploys) or commit → `vercel --prod`.

## 5. Post-deploy verification

```bash
curl -s -o /dev/null -w "%{http_code}\n" <production-url>/        # expect 200
curl -s -o /dev/null -w "%{http_code}\n" <production-url>/events   # expect 200
```

Also open `/` and `/events` in a browser (or ask the user to). `/admin`
saves persist only when `DATABASE_URL` is set — see section 7.

## 6. Domains

Domains are attached to the Vercel project and survive repo swaps.

```bash
vercel domains ls
vercel inspect <deployment-url>   # shows production alias
```

Never run `vercel domains remove` or change DNS records unless the user
explicitly asked. To verify production alias after deploy:
`vercel ls` → newest production deployment → its domain must be the one
the user expects.

## 7. Admin storage: Postgres required on Vercel

Events and selected Facebook posts are stored by `src/lib/document-store.ts`.
With `DATABASE_URL` set they live in a `site_documents` Postgres table, which
persists across deploys and cold starts and stays consistent across serverless
instances. Without it, the app falls back to the JSON files in `data/`, and
Vercel's filesystem is read-only except `/tmp`, so `/admin` saves would be lost.

Set up once:

1. Create a Neon database (Vercel dashboard → Storage → Neon, or neon.tech).
2. Add `DATABASE_URL` (the **pooled** string) to the `production` environment.
   Give `preview` a different database or Neon branch, not the production one.
3. Redeploy; changing env vars does not redeploy by itself.
4. Sign in at `/admin` and save once. The first read of an empty database starts
   from the `data/*.json` files bundled in the deploy, so existing content
   appears with no import step. After the first save the database is the source
   of truth, and later edits to `data/*.json` in the repo have no effect.

Rules:

- Do NOT set `EVENTS_FILE_PATH=/tmp/...` as a permanent fix — data loss.
- Never point `TEST_DATABASE_URL` at the production database; the store tests
  delete every row in `site_documents`.
- Cover images are still committed under `public/events/`. The admin cannot
  upload them, so a new event photo needs a commit and a deploy.

## 8. Guardrails (agent rules)

1. Never deploy to production without explicit user confirmation in the
   current session.
2. Never print, log, or commit secret values (`FACEBOOK_PAGE_ACCESS_TOKEN`,
   `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`).
3. Never create a second Vercel project for this repo — always reuse
   `ccs-frontend`.
4. Never disconnect a Git repo or remove a domain without explicit user
   instruction.
5. Always run typecheck before deploying. If it fails, stop and report.
6. If an upload exceeds ~20 MB, something heavy slipped past
   `.vercelignore` — abort and fix the ignore list, don't just push through.
7. The 92 MB upload from 2026-10-05 aborted at 9.9 MB — that was a
   missing `.vercelignore`. Do not retry without one.
