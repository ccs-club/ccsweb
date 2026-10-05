/* Audit 009 probe 7: vertical rhythm and whitespace structure on the public
   routes, the posts hero gap, and the 641px footer link overhang. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = { rhythm: [], footerLink: null, heroContent: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

/* Gap between consecutive top-level sections, and inside each hero. */
for (const route of ["/about", "/events", "/gallery", "/posts"]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  out.rhythm.push(await page.evaluate((r) => {
    const sections = [...document.querySelectorAll("main > *, .public-page > *")];
    const rows = [];
    for (let i = 0; i < sections.length; i += 1) {
      const el = sections[i];
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const next = sections[i + 1];
      const gap = next ? Math.round(next.getBoundingClientRect().top - rect.bottom) : null;
      const lastChild = el.lastElementChild;
      rows.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 34),
        height: Math.round(rect.height),
        padTop: style.paddingTop, padBottom: style.paddingBottom,
        gapToNext: gap,
        lastChildCls: lastChild ? String(lastChild.className).slice(0, 30) : null,
        lastChildBottomOffset: lastChild ? Math.round(rect.bottom - lastChild.getBoundingClientRect().bottom) : null,
      });
    }
    return { route: r, pageHeight: Math.round(document.documentElement.scrollHeight), sections: rows };
  }, route));
}

/* Hero internal structure: how much empty space sits inside each hero block. */
for (const route of ["/", "/about", "/events", "/gallery", "/posts"]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  out.heroContent.push(await page.evaluate((r) => {
    const hero = document.querySelector(".hero, .page-hero, .posts-hero, .events-hero, .gallery-hero");
    if (!hero) return { route: r, hero: null };
    const rect = hero.getBoundingClientRect();
    const kids = [...hero.children].filter((k) => !k.classList.contains("matrix-field") && getComputedStyle(k).position !== "absolute");
    const first = kids[0]?.getBoundingClientRect();
    const last = kids[kids.length - 1]?.getBoundingClientRect();
    return {
      route: r,
      heroClass: String(hero.className),
      heroHeight: Math.round(rect.height),
      contentHeight: first && last ? Math.round(last.bottom - first.top) : null,
      padTop: getComputedStyle(hero).paddingTop,
      padBottom: getComputedStyle(hero).paddingBottom,
      emptyAboveContent: first ? Math.round(first.top - rect.top) : null,
      emptyBelowContent: last ? Math.round(rect.bottom - last.bottom) : null,
      children: kids.map((k) => String(k.className || k.tagName).slice(0, 30)),
    };
  }, route));
}

/* The 641px footer link that measures wider than its own box. */
for (const width of [600, 620, 641, 660, 700, 768]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const record = await page.evaluate((w) => {
    const links = [...document.querySelectorAll(".footer-social-links a")];
    return {
      width: w,
      links: links.map((a) => {
        const r = a.getBoundingClientRect();
        const cs = getComputedStyle(a);
        let right = -Infinity;
        for (const node of a.childNodes) {
          if (node.nodeType !== 3 || !node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
        }
        return {
          text: a.textContent.trim(),
          box: Number(r.width.toFixed(2)),
          scrollWidth: a.scrollWidth,
          clientWidth: a.clientWidth,
          textRight: Number(right.toFixed(2)),
          boxRight: Number(r.right.toFixed(2)),
          overhang: Number((right - r.right).toFixed(2)),
          letterSpacing: cs.letterSpacing,
          fontSize: cs.fontSize,
        };
      }),
    };
  }, width);
  out.footerLink ??= [];
  out.footerLink.push(record);
}

await writeFile(path.join(OUT, "rhythm.json"), JSON.stringify(out, null, 2));
for (const r of out.rhythm) {
  console.log("==", r.route, "page", r.pageHeight);
  for (const s of r.sections) console.log("   ", s.cls.padEnd(28), "h", String(s.height).padStart(5), "pad", s.padTop, s.padBottom, "gapNext", s.gapToNext, "emptyAfterLast", s.lastChildBottomOffset);
}
console.log("== heroes");
for (const h of out.heroContent) console.log("  ", h.route, h.heroClass, "h", h.heroHeight, "content", h.contentHeight, "pad", h.padTop, h.padBottom, "emptyAbove", h.emptyAboveContent, "emptyBelow", h.emptyBelowContent);
console.log("== footer link overhang");
for (const f of out.footerLink ?? []) console.log("  ", f.width, f.links.map((l) => `${l.text}:${l.overhang}(ls ${l.letterSpacing})`).join(" "));
await browser.close();