/* Audit 009 probe 11: events archive keyboard at 1366 once layout has settled.
   The earlier zero-geometry reading was a load-timing artifact. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = { results: [] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

async function settle() {
  await page.waitForFunction(() => {
    const t = document.querySelector(".event-preview-track");
    return Boolean(t) && t.clientWidth > 0;
  }, null, { timeout: 10000 });
  await page.waitForTimeout(300);
}

for (const size of [{ name: "1366x900", w: 1366, h: 900 }, { name: "1440x900", w: 1440, h: 900 }, { name: "1280x800", w: 1280, h: 800 }, { name: "940x900", w: 940, h: 900 }]) {
  await page.setViewportSize({ width: size.w, height: size.h });
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await settle();

  const geo = await page.evaluate(() => {
    const t = document.querySelector(".event-preview-track");
    return { clientWidth: t.clientWidth, scrollWidth: t.scrollWidth, maxScroll: t.scrollWidth - t.clientWidth, position: document.querySelector(".event-archive-position").textContent.trim() };
  });
  const focusTook = await page.evaluate(() => { const t = document.querySelector(".event-preview-track"); t.focus(); return document.activeElement === t; });
  const outline = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`; });
  const before = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1200);
  const afterRight = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
  const posRight = await page.evaluate(() => document.querySelector(".event-archive-position").textContent.trim());
  await page.keyboard.press("End");
  await page.waitForTimeout(1500);
  const afterEnd = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
  const posEnd = await page.evaluate(() => document.querySelector(".event-archive-position").textContent.trim());
  await page.keyboard.press("Home");
  await page.waitForTimeout(1200);
  const afterHome = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);

  out.results.push({ viewport: size.name, ...geo, focusTook, focusOutline: outline, before, afterRight, posRight, afterEnd, posEnd, afterHome });

  /* Year filter: does it rebuild the rail and keep keyboard reachability? */
  await page.locator(".year-grid button", { hasText: "2024" }).first().click();
  await page.waitForTimeout(900);
  out.results.push({
    viewport: `${size.name} year-2024`,
    cards: await page.locator(".event-preview").count(),
    position: (await page.locator(".event-archive-position").first().textContent()).trim(),
    prevDisabled: await page.locator(".event-archive-controls button").first().isDisabled(),
  });
  await page.locator(".year-grid button", { hasText: "All years" }).first().click();
  await page.waitForTimeout(700);
}

await writeFile(path.join(OUT, "events-keyboard-desktop.json"), JSON.stringify(out, null, 2));
for (const r of out.results) console.log(JSON.stringify(r));
await browser.close();