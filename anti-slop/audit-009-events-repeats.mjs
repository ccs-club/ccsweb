/* Audit 009 probe 10: is the 1366x900 zero-geometry reading on the events
   archive real or a probe artifact? Repeat the same measurement several times
   on fresh loads and on one long-lived page. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = { reloads: [], onePage: [], scrollTop: [] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

async function read(tag) {
  return page.evaluate((t) => {
    const track = document.querySelector(".event-preview-track");
    const archive = document.querySelector(".event-archive");
    const section = document.querySelector(".events-past-section");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), y: Math.round(b.y) };
    };
    return {
      tag: t,
      scrollY: Math.round(window.scrollY),
      docHeight: Math.round(document.documentElement.scrollHeight),
      track: r(track),
      archive: r(archive),
      section: r(section),
      clientWidth: track?.clientWidth ?? null,
      scrollWidth: track?.scrollWidth ?? null,
      position: document.querySelector(".event-archive-position")?.textContent?.trim(),
    };
  }, tag);
}

for (let i = 0; i < 5; i += 1) {
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(150 + i * 400);
  out.reloads.push(await read(`reload-${i}-wait${150 + i * 400}`));
}

await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
for (const wait of [0, 100, 300, 600, 1200]) {
  await page.waitForTimeout(wait === 0 ? 0 : 100);
  out.onePage.push(await read(`settled-${wait}`));
}

/* Does reading geometry while the page is scrolled change the answer? */
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);
out.scrollTop.push(await read("scrolled-to-bottom"));
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
out.scrollTop.push(await read("back-to-top"));

/* Same question on the posts rail and on a route switch. */
await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
out.onePage.push(await read("posts-1366"));
await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
out.onePage.push(await read("events-after-posts-1366"));

await writeFile(path.join(OUT, "events-geometry-repeats.json"), JSON.stringify(out, null, 2));
for (const group of Object.values(out)) for (const r of group) console.log(JSON.stringify(r));
await browser.close();