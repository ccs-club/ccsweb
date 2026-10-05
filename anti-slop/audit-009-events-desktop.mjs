/* Audit 009 probe 9: the desktop events archive reports zero geometry for the
   track while its controls still scroll. Find out what the element actually is
   at 1366x900. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = {};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

for (const size of [{ w: 1366, h: 900 }, { w: 1101, h: 900 }, { w: 1100, h: 900 }, { w: 1024, h: 768 }]) {
  await page.setViewportSize({ width: size.w, height: size.h });
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  out[`${size.w}x${size.h}`] = await page.evaluate(() => {
    const track = document.querySelector(".event-preview-track");
    if (!track) return { missing: true };
    const cs = getComputedStyle(track);
    const r = track.getBoundingClientRect();
    const items = [...track.children].map((c) => {
      const cr = c.getBoundingClientRect();
      return { w: Math.round(cr.width), h: Math.round(cr.height), display: getComputedStyle(c).display };
    });
    return {
      tag: track.tagName,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      clientWidth: track.clientWidth,
      scrollWidth: track.scrollWidth,
      display: cs.display,
      overflowX: cs.overflowX,
      flexBasis: getComputedStyle(track.firstElementChild).flexBasis,
      gridTemplateColumns: cs.gridTemplateColumns,
      items,
      position: document.querySelector(".event-archive-position")?.textContent?.trim(),
      archiveRect: (() => {
        const a = document.querySelector(".event-archive");
        if (!a) return null;
        const ar = a.getBoundingClientRect();
        return { w: Math.round(ar.width), h: Math.round(ar.height) };
      })(),
    };
  });
}

/* Does clicking next actually move the viewport at 1366? Screenshot proof. */
await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "events-1366-before-click.png") });
const before = await page.evaluate(() => {
  const t = document.querySelector(".event-preview-track");
  return { scrollLeft: t.scrollLeft, position: document.querySelector(".event-archive-position").textContent.trim() };
});
await page.locator(".event-archive-controls button").nth(1).click();
await page.waitForTimeout(1200);
const after = await page.evaluate(() => {
  const t = document.querySelector(".event-preview-track");
  const cards = [...document.querySelectorAll(".event-preview h3")].map((h) => {
    const r = h.getBoundingClientRect();
    return { text: h.textContent.trim().slice(0, 22), x: Math.round(r.x), visible: r.x > -50 && r.x < window.innerWidth };
  });
  return { scrollLeft: t.scrollLeft, position: document.querySelector(".event-archive-position").textContent.trim(), cards };
});
await page.screenshot({ path: path.join(OUT, "events-1366-after-click.png") });
out.desktopClick = { before, after };

await writeFile(path.join(OUT, "events-desktop-geometry.json"), JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out)) {
  if (k === "desktopClick") continue;
  console.log("==", k, JSON.stringify(v));
}
console.log("desktopClick", JSON.stringify(out.desktopClick, null, 1));
await browser.close();