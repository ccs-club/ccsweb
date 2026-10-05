/* Audit 004 layout measurement sweep. Read-only: measures the running test
   server at http://127.0.0.1:3100. No source files are modified. */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("../evidence-004-2026-10-03/", import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const BASE = "http://127.0.0.1:3100";
const ROUTES = ["/", "/about", "/gallery", "/events", "/admin"];
const VIEWPORTS = [
  { name: "312x780", width: 312, height: 780 },
  { name: "390x844", width: 390, height: 844 },
  { name: "641x800", width: 641, height: 800 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "940x900", width: 940, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1180x820", width: 1180, height: 820 },
  { name: "1366x900", width: 1366, height: 900 },
];

// Widths are swept in order so a snap point between two widths is visible as
// an abrupt change in the recorded overflow/height curve.
const HOME_SWEEP = [312, 340, 360, 390, 480, 560, 620, 641, 700, 740, 768, 820, 880, 940, 1024, 1100, 1180, 1280, 1366];

const measurements = [];

async function probe(page, route, locale, vp) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = `${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  const data = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - window.innerWidth;
    // Elements wider than the viewport (the actual offenders, not just the count).
    const offenders = [];
    const margin = 1;
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" && el.classList.contains("background-wash")) continue;
      if (r.width > 0 && (r.right > window.innerWidth + margin || r.left < -margin)) {
        // Ignore elements inside a horizontal scroll container on purpose.
        let p = el.parentElement;
        let scrollable = false;
        while (p) {
          const pcs = getComputedStyle(p);
          if (/(auto|scroll)/.test(pcs.overflowX)) { scrollable = true; break; }
          p = p.parentElement;
        }
        if (!scrollable && offenders.length < 8) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 60),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
        }
      }
    }
    // Clickable targets below 44px (measured on elements that are buttons/links/inputs)
    const smallTargets = [];
    for (const el of document.querySelectorAll("button, a[href], input, select, textarea, summary, [tabindex]")) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (r.width === 0 && r.height === 0) continue;
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if ((w > 0 && w < 40) || (h > 0 && h < 40)) {
        smallTargets.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 50),
          w, h,
          text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30),
        });
      }
    }
    // Text that escapes or overflows its box horizontally
    const clippedText = [];
    for (const el of document.querySelectorAll("h1, h2, h3, p, span, small, dt, dd, li")) {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible") {
        clippedText.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 50),
          text: (el.textContent || "").trim().slice(0, 40),
        });
        if (clippedText.length > 6) break;
      }
    }
    return {
      overflowX,
      pageHeight: Math.round(doc.scrollHeight),
      offenders,
      smallTargets: smallTargets.slice(0, 12),
      clippedText,
    };
  });
  measurements.push({ route, locale, viewport: vp.name, ...data, errors });
  // Screenshot at the two phone sizes and one desktop for each route
  if (["390x844", "768x1024", "1366x900"].includes(vp.name)) {
    await page.screenshot({
      path: path.join(OUT, `shot-${route.replace(/\//g, "_") || "root"}-${locale}-${vp.name}.png`),
      fullPage: vp.name !== "1366x900" || route !== "/",
    });
  }
}

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  for (const route of ROUTES) {
    for (const locale of ["en", "mn"]) {
      await probe(page, route, locale, vp);
    }
  }
  await page.close();
}

// Home one-screen check: does / scroll at each swept width?
const sweep = [];
const page = await browser.newPage();
for (const w of HOME_SWEEP) {
  for (const locale of ["en", "mn"]) {
    await page.setViewportSize({ width: w, height: 700 });
    await page.goto(`${BASE}/${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      scrolls: document.documentElement.scrollHeight > window.innerHeight + 2,
      height: document.documentElement.scrollHeight,
    }));
    sweep.push({ width: w, locale, ...r });
  }
}
await page.close();

await writeFile(path.join(OUT, "measurements.json"), JSON.stringify({ measurements, homeSweep: sweep }, null, 2));
console.log(`done: ${measurements.length} route probes, ${sweep.length} home sweep entries`);
console.log("overflows:", measurements.filter((m) => m.overflowX > 1).length);
console.log("smallTargets entries:", measurements.filter((m) => m.smallTargets.length > 0).length);
console.log("clippedText entries:", measurements.filter((m) => m.clippedText.length > 0).length);
await browser.close();
