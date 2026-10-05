/* Audit 009 probe 3: correct selectors for the events archive carousel, the
   events error-boundary retry path with a restored store, and a trace of which
   navigation triggers the minified React #441 console entry. Read-only. */
import { chromium } from "playwright-core";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const dir = process.env.CCS_TEST_DIRECTORY;

const results = { states: [], react441Trace: [] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

let bucket = "startup";
page.on("console", (m) => {
  if (m.type() === "error") results.react441Trace.push({ bucket, text: m.text().slice(0, 120) });
});
page.on("pageerror", (e) => results.react441Trace.push({ bucket, pageerror: e.message.slice(0, 160) }));

async function record(name, fn) {
  bucket = name;
  try {
    results.states.push({ state: name, ...(await fn()) });
  } catch (e) {
    results.states.push({ state: name, error: String(e).slice(0, 240) });
  }
}

/* Events archive carousel, correct selector, desktop then mobile. */
await record("events-carousel", async () => {
  const out = {};
  for (const size of [{ name: "1366x900", w: 1366, h: 900 }, { name: "390x844", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const track = document.querySelector(".event-preview-track");
      if (!track) return { found: false };
      return {
        found: true,
        tabIndex: track.getAttribute("tabindex"),
        label: track.getAttribute("aria-label"),
        scrollable: track.scrollWidth > track.clientWidth + 2,
        clientWidth: Math.round(track.clientWidth),
        scrollWidth: Math.round(track.scrollWidth),
        cardHeights: [...track.querySelectorAll(".event-preview")].map((c) => Math.round(c.getBoundingClientRect().height)),
      };
    });
    await page.evaluate(() => document.querySelector(".event-preview-track")?.focus());
    const before = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(800);
    const afterKey = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
    const controls = await page.locator(".event-archive-controls button").evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { label: n.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height), disabled: n.disabled };
      }));
    const position = (await page.locator(".event-archive-position").first().textContent()).trim();
    await page.locator(".event-archive-controls button").nth(1).click().catch(() => null);
    await page.waitForTimeout(800);
    const afterClick = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
    out[size.name] = { ...info, scrollBefore: before, scrollAfterArrow: afterKey, scrollAfterClick: afterClick, position, controls };
  }
  return out;
});

/* Events error boundary: break the store, restore it, then retry. The store is
   restored BEFORE the click so a working retry can be told apart from a retry
   that cannot recover. */
await record("events-retry-with-restored-store", async () => {
  const store = path.join(dir, "events.json");
  const saved = await readFile(store, "utf8");
  await page.setViewportSize({ width: 1366, height: 900 });
  await writeFile(store, "{invalid");
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  const errorHeading = (await page.locator(".events-state h1").first().textContent()).trim();
  const role = await page.locator(".events-state").first().getAttribute("role");
  await writeFile(store, saved);
  await page.waitForTimeout(200);
  await page.locator(".events-state button").first().click();
  await page.waitForTimeout(2500);
  const previews = await page.locator(".event-preview").count();
  const stillError = await page.locator(".events-state h1").count();
  const headingAfter = (await page.locator("h1").first().textContent().catch(() => null))?.trim() ?? null;
  return { errorHeading, role, previewsAfterRetry: previews, errorBoundaryStillShown: stillError, firstHeadingAfterRetry: headingAfter };
});

/* Same path on /posts, for comparison. */
await record("posts-retry-with-restored-store", async () => {
  const store = path.join(dir, "facebook-posts.json");
  const saved = await readFile(store, "utf8");
  await writeFile(store, "{invalid");
  await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
  const errorHeading = (await page.locator(".events-state h1").first().textContent()).trim();
  await writeFile(store, saved);
  await page.waitForTimeout(200);
  await page.locator(".events-state button").first().click();
  await page.waitForTimeout(2500);
  const cards = await page.locator(".facebook-post-card").count();
  return { errorHeading, cardsAfterRetry: cards, stillError: await page.locator(".events-state h1").count() };
});

/* Which of these ordinary navigations produce a console error at all? */
for (const route of ["/", "/about", "/gallery", "/events", "/posts"]) {
  bucket = `plain-${route}`;
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
}
bucket = "admin-login-failure";
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("wrong-password-123");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(800);
bucket = "admin-login-success";
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);

await writeFile(path.join(OUT, "states-recheck-2.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.states, null, 2));
console.log("--- console trace by bucket");
for (const entry of results.react441Trace) console.log(entry.bucket, "|", entry.text || entry.pageerror);
await browser.close();