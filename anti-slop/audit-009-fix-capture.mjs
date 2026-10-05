/* Audit 009 fix evidence: capture the three narrowed findings at the widths
   where they failed, plus the admin list and the events hero. Read-only. */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/fixed/", import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const BASE = "http://127.0.0.1:3100";
const out = { headings: [], header: [], admin: null, eventsHero: null };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 280, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const [route, name] of [["/", "home"], ["/about", "about"]]) {
  for (const width of [240, 260, 280, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    out.headings.push(await page.evaluate(({ r, w }) => {
      const heading = document.querySelector("h1");
      const box = heading.getBoundingClientRect();
      let worst = { overflow: 0, word: "" };
      for (const node of heading.childNodes) {
        if (node.nodeType !== 3 || !node.textContent?.trim()) continue;
        const text = node.textContent.trim();
        const range = document.createRange();
        range.setStart(node, 0);
        range.setEnd(node, node.textContent.length);
        for (const rect of range.getClientRects()) {
          const overflow = Math.max(rect.right - box.right, rect.right - window.innerWidth);
          if (overflow > worst.overflow) Object.assign(worst, { overflow, word: text });
        }
      }
      return {
        route: r, width: w,
        fontSize: parseFloat(getComputedStyle(heading).fontSize).toFixed(2),
        box: Number(box.width.toFixed(2)),
        overflow: Number(worst.overflow.toFixed(2)),
        word: worst.word,
        docWidth: document.documentElement.scrollWidth,
      };
    }, { r: route, w: width }));
    await page.screenshot({ path: path.join(OUT, `fixed-${name}-en-${width}x844.png`), clip: { x: 0, y: 0, width, height: 420 } });
  }
}

for (const width of [240, 250, 280]) {
  await page.setViewportSize({ width, height: 200 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  out.header.push(await page.evaluate((w) => {
    const copy = document.querySelector(".brand-copy");
    const paint = (element) => {
      if (!element) return null;
      let right = -Infinity;
      for (const node of element.childNodes) {
        if (node.nodeType !== 3 || !node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
      }
      return Number.isFinite(right) ? Number(right.toFixed(2)) : null;
    };
    const wordmark = paint(document.querySelector(".brand-copy strong"));
    const language = paint(document.querySelector(".locale-toggle button"));
    return {
      width: w,
      wordmarkHidden: !copy || getComputedStyle(copy).display === "none",
      wordmarkRight: wordmark,
      languageLeft: language === null ? null : Number((language - 14).toFixed(2)),
      overlap: wordmark === null || language === null ? null : Number((wordmark - language).toFixed(2)),
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    };
  }, width));
  await page.screenshot({ path: path.join(OUT, `fixed-header-en-${width}x200.png`), clip: { x: 0, y: 0, width, height: 64 } });
}

await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const t = document.querySelector(".event-preview-track");
  return Boolean(t) && t.clientWidth > 0;
}, null, { timeout: 10000 });
out.eventsHero = await page.evaluate(() => ({
  heroStats: [...document.querySelectorAll(".events-stats strong")].map((s) => s.textContent.trim()),
  filterCount: document.querySelector(".year-grid button .year-count")?.textContent?.trim(),
  cards: document.querySelectorAll(".event-preview").length,
}));
await page.screenshot({ path: path.join(OUT, "fixed-events-hero-1366x900.png"), clip: { x: 0, y: 0, width: 1366, height: 700 } });

await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);
await page.locator(".admin-event-select").first().click();
await page.waitForTimeout(500);
out.admin = await page.evaluate(() => {
  const sizes = new Set();
  for (const element of document.querySelectorAll("main *")) {
    const hasText = [...element.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
    if (!hasText) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    sizes.add(parseFloat(getComputedStyle(element).fontSize));
  }
  return { smallestAdminFontSize: Math.min(...sizes), distinctSizes: [...sizes].sort((a, b) => a - b) };
});
await page.screenshot({ path: path.join(OUT, "fixed-admin-list-1366x900.png"), clip: { x: 0, y: 0, width: 700, height: 900 } });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "fixed-admin-list-390x844.png"), fullPage: false });

await writeFile(path.join(OUT, "fixed-measurements.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();