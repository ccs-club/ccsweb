/* Audit 009 probe 21: what clips the /about heading at 260px, and does the
   header collide at 240px? Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = { aboutClip: [], header240: [] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 280, height: 844 } });
const page = await ctx.newPage();

for (const width of [240, 260, 280, 300, 320]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  out.aboutClip.push(await page.evaluate((w) => {
    const h1 = document.querySelector("h1");
    const chain = [];
    let node = h1;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      chain.push({
        tag: node.tagName.toLowerCase(),
        cls: String(node.className).slice(0, 30),
        overflowX: cs.overflowX,
        width: Number(r.width.toFixed(2)),
        right: Number(r.right.toFixed(2)),
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
      });
      node = node.parentElement;
    }
    let textRight = -Infinity;
    for (const n of h1.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const rect of range.getClientRects()) textRight = Math.max(textRight, rect.right);
    }
    return {
      width: w,
      viewport: window.innerWidth,
      h1TextRight: Number(textRight.toFixed(2)),
      pastViewport: Number((textRight - window.innerWidth).toFixed(2)),
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      chain,
    };
  }, width));
}

/* Header at 240px: does the brand overlap the locale toggle? */
for (const route of ["/", "/about", "/gallery", "/events", "/posts"]) {
  await page.setViewportSize({ width: 240, height: 844 });
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  out.header240.push(await page.evaluate((r) => {
    const brand = document.querySelector(".brand");
    const toggle = document.querySelector(".locale-toggle");
    const menu = document.querySelector("details.mobile-nav summary");
    const b = brand.getBoundingClientRect();
    const t = toggle.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const brandCopy = document.querySelector(".brand-copy")?.getBoundingClientRect();
    return {
      route: r,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      brand: `${Math.round(b.left)}..${Math.round(b.right)}`,
      brandCopy: brandCopy ? `${Math.round(brandCopy.left)}..${Math.round(brandCopy.right)}` : null,
      toggle: `${Math.round(t.left)}..${Math.round(t.right)}`,
      menu: `${Math.round(m.left)}..${Math.round(m.right)}`,
      brandOverlapsToggle: b.right > t.left + 0.5,
      toggleOverlapsMenu: t.right > m.left + 0.5,
      gaps: { brandToToggle: Math.round(t.left - b.right), toggleToMenu: Math.round(m.left - t.right) },
      brandCopyText: document.querySelector(".brand-copy")?.textContent?.trim().slice(0, 40),
      logoVisible: (() => {
        const img = document.querySelector(".brand img");
        if (!img) return null;
        const r = img.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 };
      })(),
    };
  }, route));
}
await page.screenshot({ path: path.join(OUT, "about-header-240x844.png"), clip: { x: 0, y: 0, width: 240, height: 130 } });

await writeFile(path.join(OUT, "clip-source-and-header240.json"), JSON.stringify(out, null, 2));
console.log("== about clip chain");
for (const r of out.aboutClip) {
  console.log(` width ${r.width} textRight ${r.h1TextRight} pastVp ${r.pastViewport} docScroll ${r.docScrollWidth}`);
  for (const c of r.chain) console.log("   ", c.tag, c.cls.padEnd(24), "ovX", c.overflowX.padEnd(8), "w", String(c.width).padStart(7), "right", String(c.right).padStart(7), "pad", c.paddingLeft, c.paddingRight);
}
console.log("== header 240");
for (const h of out.header240) console.log(" ", JSON.stringify(h));
await browser.close();