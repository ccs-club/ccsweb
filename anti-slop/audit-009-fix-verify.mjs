/* Audit 009 fix verification: desktop typography must be unchanged by the
   narrow-width caps, and the narrow widths must now fit. Read-only. */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/fixed/", import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const BASE = "http://127.0.0.1:3100";
const out = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

for (const size of [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 1366, h: 900 }, { w: 1120, h: 800 },
  { w: 1024, h: 768 }, { w: 940, h: 900 }, { w: 768, h: 1024 }, { w: 700, h: 900 },
  { w: 641, h: 900 }, { w: 640, h: 900 }, { w: 560, h: 900 }, { w: 480, h: 900 },
  { w: 430, h: 932 }, { w: 414, h: 896 }, { w: 390, h: 844 }, { w: 375, h: 667 },
  { w: 360, h: 800 }, { w: 344, h: 882 }, { w: 320, h: 568 }, { w: 300, h: 844 },
  { w: 280, h: 844 }, { w: 260, h: 844 }, { w: 240, h: 844 },
]) {
  await page.setViewportSize({ width: size.w, height: size.h });
  const row = { viewport: `${size.w}x${size.h}` };
  for (const [route, sel, name] of [
    ["/", ".hero h1", "heroH1"],
    ["/about", ".page-hero h1", "aboutH1"],
    ["/events", ".events-hero h1", "eventsH1"],
    ["/gallery", ".gallery-heading-page h1", "galleryH1"],
    ["/posts", ".posts-hero h1", "postsH1"],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    row[name] = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      let widest = 0;
      let widestText = "";
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const rect of range.getClientRects()) {
          if (rect.width > widest) { widest = rect.width; widestText = n.textContent.trim(); }
        }
      }
      for (const child of el.querySelectorAll("span")) {
        const range = document.createRange();
        range.selectNodeContents(child);
        for (const rect of range.getClientRects()) {
          if (rect.width > widest) { widest = rect.width; widestText = child.textContent.trim(); }
        }
      }
      return {
        size: Number(parseFloat(getComputedStyle(el).fontSize).toFixed(2)),
        box: Number(r.width.toFixed(1)),
        widestWord: Number(widest.toFixed(2)),
        word: widestText.slice(0, 20),
        escapesBox: Number((widest - r.width).toFixed(2)),
        pastViewport: Number(Math.max(0, widest - window.innerWidth).toFixed(2)),
      };
    }, sel);
  }
  row.headerOverlap = await page.evaluate(() => {
    const copy = document.querySelector(".brand-copy");
    if (!copy) return "brand-copy hidden";
    const strong = copy.querySelector("strong");
    const en = document.querySelector(".locale-toggle button");
    if (!strong || getComputedStyle(strong).display === "none") return "wordmark hidden";
    function paint(el) {
      let right = -Infinity;
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
      }
      return right;
    }
    const s = paint(strong);
    const e = paint(en);
    return Number((s - e).toFixed(2));
  });
  row.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  out.push(row);
  console.log(
    row.viewport.padEnd(10),
    "hero", String(row.heroH1?.size).padStart(6), "esc", String(row.heroH1?.escapesBox).padStart(6),
    "| about", String(row.aboutH1?.size).padStart(6), "esc", String(row.aboutH1?.escapesBox).padStart(6),
    "| events", String(row.eventsH1?.size).padStart(6),
    "| gallery", String(row.galleryH1?.size).padStart(6),
    "| posts", String(row.postsH1?.size).padStart(6),
    "| headerOverlap", String(row.headerOverlap).padStart(18),
    "| overflowX", row.overflowX,
  );
}

await writeFile(path.join(OUT, "typography-across-widths.json"), JSON.stringify(out, null, 2));
await browser.close();