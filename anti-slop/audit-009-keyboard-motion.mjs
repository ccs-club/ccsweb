/* Audit 009 probe 8: three open questions.
   1. Does the events archive track respond to ArrowRight at desktop widths?
      (The first probe recorded no movement at 1366 while a click did move.)
   2. What animates without prefers-reduced-motion, and what does reduced
      motion actually stop? (Earlier runs used a reduced-motion context.)
   3. Confirm the longest-word overflow on /about at 280px is not clipped. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = { eventsKeyboard: [], motion: [], narrowHeading: [] };

const browser = await chromium.launch();

/* ---- 1 + 3 ---- */
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

for (const size of [{ name: "1366x900", w: 1366, h: 900 }, { name: "1024x768", w: 1024, h: 768 }, { name: "768x1024", w: 768, h: 1024 }, { name: "390x844", w: 390, h: 844 }]) {
  await page.setViewportSize({ width: size.w, height: size.h });
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const geo = await page.evaluate(() => {
    const t = document.querySelector(".event-preview-track");
    return t ? {
      clientWidth: Math.round(t.clientWidth),
      scrollWidth: Math.round(t.scrollWidth),
      maxScroll: Math.round(t.scrollWidth - t.clientWidth),
      cardWidth: Math.round(t.firstElementChild?.getBoundingClientRect().width ?? 0),
      position: document.querySelector(".event-archive-position")?.textContent?.trim(),
    } : null;
  });

  const focused = await page.evaluate(() => {
    const t = document.querySelector(".event-preview-track");
    t.focus();
    return document.activeElement === t;
  });

  const before = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1500);
  const afterKey = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1500);
  const afterKey2 = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(1500);
  const afterBack = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
  await page.keyboard.press("End");
  await page.waitForTimeout(1500);
  const afterEnd = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
  const endPosition = await page.evaluate(() => document.querySelector(".event-archive-position")?.textContent?.trim());

  out.eventsKeyboard.push({
    viewport: size.name, ...geo, focusTook: focused,
    scrollBefore: before, afterArrowRight: afterKey, afterSecondArrowRight: afterKey2,
    afterArrowLeft: afterBack, afterEnd, positionAfterEnd: endPosition,
  });
}

/* The posts rail, same keys. */
await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
{
  const geo = await page.evaluate(() => {
    const t = document.querySelector(".facebook-post-track");
    return { clientWidth: Math.round(t.clientWidth), scrollWidth: Math.round(t.scrollWidth), maxScroll: Math.round(t.scrollWidth - t.clientWidth) };
  });
  const before = await page.evaluate(() => { const t = document.querySelector(".facebook-post-track"); t.focus(); return t.scrollLeft; });
  await page.keyboard.press("End");
  await page.waitForTimeout(1500);
  const afterEnd = await page.evaluate(() => document.querySelector(".facebook-post-track").scrollLeft);
  await page.keyboard.press("Home");
  await page.waitForTimeout(1500);
  const afterHome = await page.evaluate(() => document.querySelector(".facebook-post-track").scrollLeft);
  out.eventsKeyboard.push({ viewport: "posts 1366x900", ...geo, before, afterEnd, afterHome });
}

/* Narrow heading: is the /about h1 actually clipped at 280 and 320? */
for (const width of [280, 320]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  out.narrowHeading.push(await page.evaluate((w) => {
    const h1 = document.querySelector("h1");
    const r = h1.getBoundingClientRect();
    const cs = getComputedStyle(h1);
    // Longest single word, measured by wrapping each word in a range.
    const words = (h1.textContent || "").split(/\s+/).filter(Boolean);
    const ranges = [];
    for (const word of words) {
      const node = h1.firstChild;
      if (!node) break;
      const index = (node.textContent || "").indexOf(word);
      if (index === -1) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + word.length);
      const rect = range.getBoundingClientRect();
      ranges.push({ word, width: Number(rect.width.toFixed(2)), right: Number(rect.right.toFixed(2)) });
    }
    ranges.sort((a, b) => b.width - a.width);
    return {
      width: w,
      h1Box: Number(r.width.toFixed(2)),
      h1Right: Number(r.right.toFixed(2)),
      contentBox: cs.width,
      fontSize: cs.fontSize,
      overflowWrap: cs.overflowWrap,
      wordBreak: cs.wordBreak,
      viewport: window.innerWidth,
      docWidth: document.documentElement.scrollWidth,
      longestWords: ranges.slice(0, 3),
      clippedByViewport: ranges.some((x) => x.right > window.innerWidth),
    };
  }, width));
}
await ctx.close();

/* ---- 2. Motion with and without prefers-reduced-motion ---- */
for (const mode of ["no-preference", "reduce"]) {
  const mctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: mode });
  const mpage = await mctx.newPage();
  for (const route of ["/", "/about", "/events", "/gallery", "/posts"]) {
    await mpage.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await mpage.waitForTimeout(500);
    out.motion.push({
      reducedMotion: mode,
      route,
      cssAnimations: await mpage.evaluate(() => {
        const list = [];
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el);
          if (cs.animationName !== "none") list.push({ cls: String(el.className).slice(0, 34), name: cs.animationName, iter: cs.animationIterationCount, duration: cs.animationDuration });
        }
        return list;
      }),
      canvasPresent: await mpage.locator("canvas").count(),
      transitions: await mpage.evaluate(() => {
        const list = [];
        for (const el of document.querySelectorAll("button, a, .facebook-post-card, .event-card, .gallery-tile")) {
          const cs = getComputedStyle(el);
          if (cs.transitionDuration && cs.transitionDuration !== "0s") list.push({ cls: String(el.className).slice(0, 30), duration: cs.transitionDuration, property: cs.transitionProperty.slice(0, 60) });
        }
        return list.slice(0, 6);
      }),
    });
  }
  await mctx.close();
}

await writeFile(path.join(OUT, "keyboard-motion.json"), JSON.stringify(out, null, 2));
console.log("== events keyboard");
for (const r of out.eventsKeyboard) console.log(" ", JSON.stringify(r));
console.log("== narrow about h1");
for (const r of out.narrowHeading) console.log(" ", JSON.stringify(r));
console.log("== motion");
for (const m of out.motion) console.log(" ", m.reducedMotion, m.route, "canvas", m.canvasPresent, "cssAnim", JSON.stringify(m.cssAnimations), "trans", JSON.stringify(m.transitions));
await browser.close();