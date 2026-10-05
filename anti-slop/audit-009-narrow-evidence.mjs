/* Audit 009 probe 17: capture evidence for the two narrow-heading findings at
   the widths where they fail, both locales. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 280, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const [route, name] of [["/", "home"], ["/about", "about"]]) {
  for (const [locale, lname] of [["en", "en"], ["mn", "mn"]]) {
    for (const width of [280, 260, 240]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const record = await page.evaluate((w) => {
        const rows = [];
        for (const el of document.querySelectorAll("h1, h1 span")) {
          const r = el.getBoundingClientRect();
          let right = -Infinity;
          for (const node of el.childNodes) {
            if (node.nodeType !== 3 || !node.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
          }
          if (right === -Infinity) continue;
          rows.push({
            text: (el.textContent || "").trim().slice(0, 34),
            boxRight: Number(r.right.toFixed(2)),
            textRight: Number(right.toFixed(2)),
            pastViewport: Number(Math.max(0, right - window.innerWidth).toFixed(2)),
            pastBox: Number((right - r.right).toFixed(2)),
            fontSize: getComputedStyle(el).fontSize,
          });
        }
        const section = document.querySelector(".hero, .page-hero");
        return {
          width: w,
          docWidth: document.documentElement.scrollWidth,
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          sectionOverflow: section ? getComputedStyle(section).overflow : null,
          rows: rows.filter((x) => x.pastBox > 1),
        };
      }, width);
      out.push({ route, name, locale, lname, ...record });
      if ([280, 240].includes(width)) {
        await page.screenshot({
          path: path.join(OUT, `narrow-${name}-${lname}-${width}x844.png`),
          clip: { x: 0, y: 0, width, height: Math.min(700, 844) },
        });
      }
    }
  }
}

await writeFile(path.join(OUT, "narrow-heading-evidence.json"), JSON.stringify(out, null, 2));
for (const r of out) {
  console.log(r.route, r.lname, r.width, "overflowX", r.overflowX, "sectionOverflow", r.sectionOverflow);
  for (const row of r.rows) console.log("    ", JSON.stringify(row));
}
await browser.close();