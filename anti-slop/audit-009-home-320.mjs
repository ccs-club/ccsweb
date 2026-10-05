/* Audit 009 probe 20: capture the 320x568 home case and confirm nothing is
   clipped when the page scrolls 26px. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = {};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
out.atTop = await page.evaluate(() => ({
  scrollY: window.scrollY,
  docHeight: document.documentElement.scrollHeight,
  heroBottom: Math.round(document.querySelector(".hero").getBoundingClientRect().bottom),
  factsBottom: Math.round(document.querySelector(".hero-facts").getBoundingClientRect().bottom),
  headerHeight: Math.round(document.querySelector(".site-header").getBoundingClientRect().height),
}));
await page.screenshot({ path: path.join(OUT, "home-en-320x568-top.png") });
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(400);
out.atBottom = await page.evaluate(() => ({
  scrollY: window.scrollY,
  factsBottom: Math.round(document.querySelector(".hero-facts").getBoundingClientRect().bottom),
  lastFactText: document.querySelector(".hero-facts li:last-child")?.textContent?.trim(),
  lastFactVisible: (() => {
    const el = document.querySelector(".hero-facts li:last-child");
    const r = el.getBoundingClientRect();
    return r.bottom <= window.innerHeight + 1 && r.top >= 0;
  })(),
}));
await page.screenshot({ path: path.join(OUT, "home-en-320x568-bottom.png") });

await writeFile(path.join(OUT, "home-320x568.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();