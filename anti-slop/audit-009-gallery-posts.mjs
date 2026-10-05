/* Audit 009 probe 6: gallery tile image loading at mobile (are the empty tiles
   a lazy-load artifact of a full-page capture or real missing images?), plus
   the posts text clamp and card heights, and the exact admin type sizes. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = {};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

/* Gallery: scroll the whole page so lazy images are requested, then measure. */
await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  const step = window.innerHeight / 2;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1500);
out.galleryMobile = await page.evaluate(() => {
  return [...document.querySelectorAll(".gallery-grid img")].map((img) => ({
    alt: (img.alt || "").slice(0, 30),
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    rendered: `${Math.round(img.getBoundingClientRect().width)}x${Math.round(img.getBoundingClientRect().height)}`,
    loading: img.loading,
  }));
});
out.galleryMissingTiles = await page.locator(".gallery-tile-missing").count();

/* Same at desktop for comparison. */
await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  const step = window.innerHeight / 2;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1500);
out.galleryDesktop = await page.evaluate(() => {
  return [...document.querySelectorAll(".gallery-grid img")].map((img) => ({
    complete: img.complete, naturalWidth: img.naturalWidth,
    rendered: `${Math.round(img.getBoundingClientRect().width)}x${Math.round(img.getBoundingClientRect().height)}`,
  }));
});

/* Posts: clamp and card geometry. */
for (const size of [{ name: "1366x900", w: 1366, h: 900 }, { name: "390x844", w: 390, h: 844 }]) {
  await page.setViewportSize({ width: size.w, height: size.h });
  await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  out[`posts${size.name}`] = await page.evaluate(() => ({
    cards: [...document.querySelectorAll(".facebook-post-card")].map((c) => {
      const r = c.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }),
    messages: [...document.querySelectorAll(".facebook-post-message")].map((m) => {
      const cs = getComputedStyle(m);
      return {
        clamp: cs.webkitLineClamp,
        overflow: cs.overflow,
        lines: Math.round(m.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
        chars: (m.textContent || "").length,
      };
    }),
    infoSections: document.querySelectorAll(".posts-info-section").length,
    heroGap: (() => {
      const intro = document.querySelector(".posts-hero p");
      const heading = document.querySelector(".posts-section-heading");
      if (!intro || !heading) return null;
      return Math.round(heading.getBoundingClientRect().top - intro.getBoundingClientRect().bottom);
    })(),
  }));
}

/* Admin type sizes, measured on the real rendered elements. */
await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);
out.adminTypeSizes = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll(".admin-shell *, .admin-dashboard *")) {
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
    if (!hasText) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    out.push({
      size: parseFloat(cs.fontSize),
      cls: String(el.className).slice(0, 36) || el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 22),
    });
  }
  return out.sort((a, b) => a.size - b.size).slice(0, 14);
});

await writeFile(path.join(OUT, "gallery-posts-admin.json"), JSON.stringify(out, null, 2));
console.log("galleryMobile imgs:", out.galleryMobile.length, "not loaded:", out.galleryMobile.filter((i) => !i.complete || i.naturalWidth === 0).length);
console.log("missing tiles:", out.galleryMissingTiles);
console.log("galleryDesktop imgs:", out.galleryDesktop.length, "not loaded:", out.galleryDesktop.filter((i) => !i.complete || i.naturalWidth === 0).length);
console.log("--- posts");
console.log(JSON.stringify(out.posts1366x900, null, 1));
console.log(JSON.stringify(out.posts390x844, null, 1));
console.log("--- admin smallest");
for (const t of out.adminTypeSizes) console.log(" ", t.size, t.cls, t.text);
await browser.close();