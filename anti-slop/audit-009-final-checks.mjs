/* Audit 009 probe 18: last checks before the report.
   - Does / still hold its one-screen promise at small viewports?
   - Are the hero facts real, and is the events hero count consistent with the
     archive filter count on the same screen?
   - Gallery viewer at 280px: dialog fit and control sizes. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = { homeOneScreen: [], countConsistency: null, galleryViewer: null };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

for (const size of [
  { w: 280, h: 844 }, { w: 320, h: 568 }, { w: 360, h: 640 }, { w: 390, h: 667 },
  { w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 940, h: 500 }, { w: 1366, h: 570 },
  { w: 1366, h: 600 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 },
]) {
  for (const locale of ["en", "mn"]) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.goto(`${BASE}/${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    out.homeOneScreen.push(await page.evaluate(({ s, locale }) => {
      const doc = document.documentElement;
      const hero = document.querySelector(".hero");
      const r = hero?.getBoundingClientRect();
      const escaped = [];
      for (const el of document.querySelectorAll(".hero h1, .hero h1 span, .hero p, .hero li, .hero a")) {
        for (const node of el.childNodes) {
          if (node.nodeType !== 3 || !node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (r && (rect.bottom > r.bottom + 1 || rect.top < r.top - 1)) {
              escaped.push({ text: node.textContent.trim().slice(0, 28), top: Number(rect.top.toFixed(1)), bottom: Number(rect.bottom.toFixed(1)) });
            }
          }
        }
      }
      return {
        viewport: `${s.w}x${s.h}`, locale,
        docHeight: doc.scrollHeight,
        scrolls: doc.scrollHeight > window.innerHeight + 2,
        heroHeight: r ? Math.round(r.height) : null,
        heroOverflow: hero ? getComputedStyle(hero).overflow : null,
        descriptionHidden: !document.querySelector(".hero-description") || getComputedStyle(document.querySelector(".hero-description")).display === "none",
        escapedText: escaped.slice(0, 4),
      };
    }, { s: size, locale }));
  }
}

/* Events: hero figure against the filter count on the same screen. */
await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const t = document.querySelector(".event-preview-track");
  return Boolean(t) && t.clientWidth > 0;
}, null, { timeout: 10000 });
out.countConsistency = await page.evaluate(() => ({
  heroStats: [...document.querySelectorAll(".events-stats strong")].map((s) => s.textContent.trim()),
  allYearsFilterCount: document.querySelector(".year-grid button .year-count")?.textContent?.trim(),
  cardCount: document.querySelectorAll(".event-preview").length,
  archivePosition: document.querySelector(".event-archive-position")?.textContent?.trim(),
}));
await page.goto(`${BASE}/events?lang=mn`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
out.countConsistency.mn = await page.evaluate(() => ({
  heroStats: [...document.querySelectorAll(".events-stats strong")].map((s) => s.textContent.trim()),
  allYearsFilterCount: document.querySelector(".year-grid button .year-count")?.textContent?.trim(),
  cardCount: document.querySelectorAll(".event-preview").length,
}));

/* Gallery viewer at 280px. */
await page.setViewportSize({ width: 280, height: 844 });
await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle" });
await page.locator(".gallery-tile").first().click();
await page.waitForTimeout(600);
out.galleryViewer = await page.evaluate(() => {
  const dialog = document.querySelector("dialog.gallery-viewer");
  const r = dialog.getBoundingClientRect();
  return {
    open: dialog.open,
    rect: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    fitsWidth: r.width <= window.innerWidth,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    controls: [...document.querySelectorAll(".gallery-viewer-button")].map((b) => {
      const br = b.getBoundingClientRect();
      return { label: b.getAttribute("aria-label"), w: Math.round(br.width), h: Math.round(br.height) };
    }),
    counter: document.querySelector(".gallery-viewer-count")?.textContent?.trim(),
    caption: document.querySelector(".gallery-viewer-caption span:last-child")?.textContent?.trim().slice(0, 60),
  };
});
await page.screenshot({ path: path.join(OUT, "gallery-viewer-280x844.png") });

await writeFile(path.join(OUT, "final-checks.json"), JSON.stringify(out, null, 2));
console.log("== home one-screen");
for (const h of out.homeOneScreen) {
  if (h.scrolls || h.escapedText.length) console.log("  ISSUE", JSON.stringify(h));
}
console.log("  entries:", out.homeOneScreen.length, "with issues:", out.homeOneScreen.filter((h) => h.scrolls || h.escapedText.length).length);
console.log("== counts", JSON.stringify(out.countConsistency));
console.log("== gallery viewer", JSON.stringify(out.galleryViewer));
await browser.close();