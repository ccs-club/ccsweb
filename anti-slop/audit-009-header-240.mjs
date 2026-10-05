/* Audit 009 probe 22: at 240px the header brand copy paints over the locale
   toggle. Measure the painted glyph bounds against the neighbouring controls,
   and find the exact width where the collision starts. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 240, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const width of [220, 230, 240, 250, 260, 270, 280, 300, 320]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  out.push(await page.evaluate((w) => {
    function paintBounds(el) {
      if (!el) return null;
      let left = Infinity;
      let right = -Infinity;
      for (const node of el.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          left = Math.min(left, rect.left);
          right = Math.max(right, rect.right);
        }
      }
      return left === Infinity ? null : { left: Number(left.toFixed(2)), right: Number(right.toFixed(2)), width: Number((right - left).toFixed(2)) };
    }
    const copy = document.querySelector(".brand-copy");
    const strong = document.querySelector(".brand-copy strong");
    const small = document.querySelector(".brand-copy small");
    const toggle = document.querySelector(".locale-toggle");
    const en = document.querySelector(".locale-toggle button");
    const menu = document.querySelector("details.mobile-nav summary");
    const copyBox = copy.getBoundingClientRect();
    const toggleBox = toggle.getBoundingClientRect();
    const strongPaint = paintBounds(strong);
    const smallPaint = paintBounds(small);
    const enPaint = paintBounds(en);
    const cs = getComputedStyle(copy);
    return {
      width: w,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      copyBox: { w: Number(copyBox.width.toFixed(2)), right: Number(copyBox.right.toFixed(2)) },
      copyDisplay: cs.display,
      copyOverflow: cs.overflow,
      copyFlex: cs.flex,
      copyMinWidth: cs.minWidth,
      strongPaint,
      smallPaint,
      smallVisible: smallPaint ? smallPaint.width > 0 : null,
      toggleBox: { left: Number(toggleBox.left.toFixed(2)), right: Number(toggleBox.right.toFixed(2)) },
      enPaint,
      menuBox: { left: Math.round(menu.getBoundingClientRect().left) },
      collision: strongPaint ? Number((strongPaint.right - enPaint.left).toFixed(2)) : null,
      strongOverlapsEn: strongPaint && enPaint ? strongPaint.right > enPaint.left + 0.5 : null,
      logoBox: (() => { const r = document.querySelector(".brand img").getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right) }; })(),
    };
  }, width));
}

await writeFile(path.join(OUT, "header-240-collision.json"), JSON.stringify(out, null, 2));
for (const r of out) {
  console.log(`w=${r.width} overflowX=${r.overflowX} copyBox.w=${r.copyBox.w} strong=${JSON.stringify(r.strongPaint)} en=${JSON.stringify(r.enPaint)} overlapPx=${r.collision} smallVisible=${r.smallVisible} small=${JSON.stringify(r.smallPaint)}`);
}
await browser.close();