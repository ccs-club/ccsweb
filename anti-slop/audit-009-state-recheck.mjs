/* Audit 009 follow-up probe: re-measures states whose first selectors were
   wrong, plus the narrow-heading geometry at the reported boundary widths.
   Read-only; writes into the same evidence folder. */
import { chromium } from "playwright-core";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const dir = process.env.CCS_TEST_DIRECTORY;

const results = { states: [], narrowHeading: [], aboutHeading: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

async function record(name, fn) {
  try {
    results.states.push({ state: name, ...(await fn()) });
  } catch (e) {
    results.states.push({ state: name, error: String(e).slice(0, 240) });
  }
}

/* Posts error boundary: PageState renders `.events-state`, so probe the real
   selector and record whether a retry control exists and recovers. */
await record("posts-malformed-store-retry", async () => {
  const store = path.join(dir, "facebook-posts.json");
  const saved = await readFile(store, "utf8");
  await writeFile(store, "{invalid");
  await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
  const heading = (await page.locator(".events-state h1").first().textContent().catch(() => null))?.trim() ?? null;
  const body = (await page.locator(".events-state p").first().textContent().catch(() => null))?.trim() ?? null;
  const role = await page.locator(".events-state").first().getAttribute("role").catch(() => null);
  const buttons = await page.locator(".events-state button").count();
  await writeFile(store, saved);
  await page.locator(".events-state button").first().click().catch(() => null);
  await page.waitForTimeout(1500);
  const cards = await page.locator(".facebook-post-card").count();
  return { heading, body, role, retryButtons: buttons, cardsAfterRetry: cards };
});

/* Events error boundary retry recovery, measured against the real archive
   section selector. */
await record("events-malformed-store-retry", async () => {
  const store = path.join(dir, "events.json");
  const saved = await readFile(store, "utf8");
  await writeFile(store, "{invalid");
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  const heading = (await page.locator(".events-state h1").first().textContent().catch(() => null))?.trim() ?? null;
  const buttons = await page.locator(".events-state button").count();
  await page.locator(".events-state button").first().click().catch(() => null);
  await page.waitForTimeout(2000);
  const previews = await page.locator(".event-preview").count();
  const stateStill = await page.locator(".events-state h1").count();
  await writeFile(store, saved);
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  return { heading, retryButtons: buttons, previewsAfterRetry: previews, errorBoundaryStillShown: stateStill };
});

/* Locale toggle is two buttons inside a group, not links. */
await record("locale-toggle-buttons", async () => {
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  const before = await page.locator(".hero-description, .about-details p, h1").first().textContent();
  const enPressed = await page.locator('.locale-toggle button[aria-pressed="true"]').textContent();
  await page.locator(".locale-toggle button", { hasText: "MN" }).first().click();
  await page.waitForURL(/lang=mn/, { timeout: 6000 }).catch(() => null);
  await page.waitForTimeout(400);
  const url = page.url();
  const mnPressed = await page.locator('.locale-toggle button[aria-pressed="true"]').textContent().catch(() => null);
  const after = await page.locator(".hero-description, .about-details p, h1").first().textContent();
  const sizes = await page.locator(".locale-toggle button").evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { text: n.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) };
    }));
  await page.locator(".locale-toggle button", { hasText: "EN" }).first().click();
  await page.waitForTimeout(800);
  return {
    url, enPressed, mnPressed, copyChanged: before !== after, backToEnglish: !page.url().includes("lang=mn"),
    buttonSizes: sizes,
  };
});

/* Events carousel keyboard and control sizes at mobile. */
await record("events-carousel-keyboard", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const track = page.locator(".event-carousel-track, [aria-label]").first();
  const before = await page.evaluate(() => {
    const t = document.querySelector(".event-carousel-track") || document.querySelector("[tabindex='0']");
    return t ? t.scrollLeft : -1;
  });
  const focusable = await page.evaluate(() => {
    const t = document.querySelector(".event-carousel-track");
    return t ? { tabIndex: t.getAttribute("tabindex"), label: t.getAttribute("aria-label") } : null;
  });
  await page.evaluate(() => document.querySelector(".event-carousel-track")?.focus());
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const t = document.querySelector(".event-carousel-track");
    return t ? t.scrollLeft : -1;
  });
  const controls = await page.locator(".event-carousel-controls button, .year-filter button").evaluateAll((nodes) =>
    nodes.slice(0, 8).map((n) => {
      const r = n.getBoundingClientRect();
      return { cls: String(n.className).slice(0, 30), text: (n.textContent || n.getAttribute("aria-label") || "").trim().slice(0, 18), w: Math.round(r.width), h: Math.round(r.height), disabled: n.disabled };
    }));
  return { trackBefore: before, trackAfterArrow: after, focusable, controls, trackFound: Boolean(track) };
});

/* Narrow heading geometry: home hero line and the about page h1 at the widths
   where the escape was recorded. */
for (const width of [240, 260, 280, 300, 320, 360, 390]) {
  await page.setViewportSize({ width, height: 844 });
  for (const route of ["/", "/about"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const record2 = await page.evaluate((w) => {
      const out = [];
      for (const el of document.querySelectorAll("h1, h1 span, h2")) {
        const r = el.getBoundingClientRect();
        let right = -Infinity;
        let left = Infinity;
        for (const node of el.childNodes) {
          if (node.nodeType !== 3 || !node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) { right = Math.max(right, rect.right); left = Math.min(left, rect.left); }
        }
        if (right === -Infinity) continue;
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 24),
          fontSize: getComputedStyle(el).fontSize,
          boxLeft: Number(r.left.toFixed(1)), boxRight: Number(r.right.toFixed(1)),
          textLeft: Number(left.toFixed(2)), textRight: Number(right.toFixed(2)),
          escapesBox: Number((right - r.right).toFixed(2)),
          escapesViewport: Number(Math.max(0, right - w).toFixed(2)),
          text: (el.textContent || "").trim().slice(0, 30),
        });
      }
      return { width: w, docWidth: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth - window.innerWidth, headings: out };
    }, width);
    (route === "/" ? results.narrowHeading : results.aboutHeading).push(record2);
  }
}

await writeFile(path.join(OUT, "states-recheck.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.states, null, 2));
console.log("--- home headings");
for (const r of results.narrowHeading) console.log(r.width, "overflow", r.overflowX, r.headings.map((h) => `${h.text}|${h.textRight}|fs${h.fontSize}|escBox${h.escapesBox}|escVp${h.escapesViewport}`).join("  "));
console.log("--- about headings");
for (const r of results.aboutHeading) console.log(r.width, "overflow", r.overflowX, r.headings.map((h) => `${h.text}|${h.textRight}|fs${h.fontSize}|escBox${h.escapesBox}|escVp${h.escapesViewport}`).join("  "));
await browser.close();