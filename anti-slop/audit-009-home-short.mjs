/* Audit 009 probe 19: the home one-screen promise at short viewports. What
   exactly exceeds the viewport at 320x568 and which widths between 560 and 900
   are affected? Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

for (const size of [
  { w: 320, h: 480 }, { w: 320, h: 520 }, { w: 320, h: 540 }, { w: 320, h: 560 },
  { w: 320, h: 568 }, { w: 320, h: 580 }, { w: 320, h: 600 }, { w: 320, h: 640 },
  { w: 360, h: 560 }, { w: 360, h: 600 }, { w: 390, h: 600 }, { w: 390, h: 640 },
  { w: 412, h: 600 }, { w: 412, h: 640 }, { w: 430, h: 600 },
]) {
  for (const locale of ["en", "mn"]) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.goto(`${BASE}/${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    out.push(await page.evaluate(({ s, locale }) => {
      const doc = document.documentElement;
      const hero = document.querySelector(".hero");
      const r = hero.getBoundingClientRect();
      const escaped = [];
      for (const el of document.querySelectorAll(".hero *")) {
        const er = el.getBoundingClientRect();
        if (er.width === 0) continue;
        for (const node of el.childNodes) {
          if (node.nodeType !== 3 || !node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.bottom > r.bottom + 1) escaped.push({ text: node.textContent.trim().slice(0, 26), bottom: Number(rect.bottom.toFixed(1)) });
          }
        }
      }
      const cs = getComputedStyle(hero);
      return {
        viewport: `${s.w}x${s.h}`,
        locale,
        docHeight: doc.scrollHeight,
        overflowPx: doc.scrollHeight - window.innerHeight,
        scrolls: doc.scrollHeight > window.innerHeight + 2,
        heroHeight: Math.round(r.height),
        heroPadding: `${cs.paddingTop} ${cs.paddingBottom}`,
        headerHeight: Math.round(document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0),
        mainHeight: Math.round(document.querySelector("#main-content")?.getBoundingClientRect().height ?? 0),
        shellHeight: Math.round(document.querySelector(".site-shell")?.getBoundingClientRect().height ?? 0),
        escaped: escaped.slice(0, 3),
      };
    }, { s: size, locale }));
  }
}

await writeFile(path.join(OUT, "home-short-height.json"), JSON.stringify(out, null, 2));
for (const r of out) console.log(r.viewport, r.locale, "docH", String(r.docHeight).padStart(5), "overflow", String(r.overflowPx).padStart(4), "hero", r.heroHeight, "header", r.headerHeight, "main", r.mainHeight, "escaped", JSON.stringify(r.escaped));
await browser.close();