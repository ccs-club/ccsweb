/* Audit 005 visual sweep. Read-only: measures the running test server at
   http://127.0.0.1:3100 against the antislop gates. No source files are
   modified. Evidence lands in anti-slop/evidence-005-2026-10-04/. */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("../evidence-005-2026-10-04/", import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const BASE = "http://127.0.0.1:3100";
const ROUTES = ["/", "/about", "/gallery", "/events", "/admin"];
const VIEWPORTS = [
  { name: "312x780", width: 312, height: 780 },
  { name: "390x844", width: 390, height: 844 },
  { name: "641x800", width: 641, height: 800 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "940x900", width: 940, height: 900 },
  { name: "1366x900", width: 1366, height: 900 },
];

const measurements = [];
const contrast = [];
const states = [];
const controls = [];
const consoleErrors = [];

function relLuminance(r, g, b) {
  const lin = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

async function effectiveBackground(page, selector) {
  /* Walk up from the element compositing every rgba background and
     background-image colour-stop onto an opaque base. */
  return page.evaluate((sel) => {
    function parseColor(str) {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(",").map((s) => s.trim());
      return {
        r: Number(parts[0]),
        g: Number(parts[1]),
        b: Number(parts[2]),
        a: parts[3] === undefined ? 1 : Number(parts[3]),
      };
    }
    function composite(top, bottom) {
      const a = top.a + bottom.a * (1 - top.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.ownAlpha0 ?? 0)) || top.r,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)),
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)),
        a,
      };
    }
    function bgLayers(el) {
      const cs = getComputedStyle(el);
      const out = [];
      const imgs = cs.backgroundImage === "none" ? [] : cs.backgroundImage.split(/,(?![^(]*\))/);
      for (const img of imgs) {
        const stops = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parseColor(m[0]));
        if (stops.length) out.push(...stops);
      }
      const c = parseColor(cs.backgroundColor);
      if (c) out.push(c);
      return out.reverse(); // first declared paints on top
    }
    const el = document.querySelector(sel);
    if (!el) return null;
    let acc = { r: 10, g: 10, b: 10, a: 1 }; // --bg
    const chain = [];
    let node = el;
    while (node && node !== document.documentElement) {
      chain.unshift(node);
      node = node.parentElement;
    }
    for (const n of chain) {
      const layers = bgLayers(n);
      for (const layer of layers) {
        if (layer.a === 0) continue;
        acc = {
          r: layer.r * layer.a + acc.r * (1 - layer.a),
          g: layer.g * layer.a + acc.g * (1 - layer.a),
          b: layer.b * layer.a + acc.b * (1 - layer.a),
          a: 1,
        };
      }
    }
    return { r: Math.round(acc.r), g: Math.round(acc.g), b: Math.round(acc.b) };
  }, selector);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ reducedMotion: "reduce" });
const page = await ctx.newPage();

page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(`console: ${m.text().slice(0, 200)}`);
});

/* ---- 1. Layout probes across viewports/locales ---- */
for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const route of ROUTES) {
    for (const locale of ["en", "mn"]) {
      await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(200);
      const data = await page.evaluate(() => {
        const doc = document.documentElement;
        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" && el.classList.contains("background-wash")) continue;
          if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1)) {
            let p = el.parentElement;
            let scrollable = false;
            while (p) {
              if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) { scrollable =true; break; }
              p = p.parentElement;
            }
            if (!scrollable && offenders.length < 6) {
              offenders.push({
                tag: el.tagName.toLowerCase(),
                cls: String(el.className).slice(0, 50),
                left: Math.round(r.left),
                right: Math.round(r.right),
              });
            }
          }
        }
        const smallTargets = [];
        for (const el of document.querySelectorAll("button, a[href], input, select, textarea, summary")) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") continue;
          if (r.width === 0 && r.height === 0) continue;
          const w = Math.round(r.width);
          const h = Math.round(r.height);
          if ((w > 0 && w < 40) || (h > 0 && h < 40)) {
            smallTargets.push({
              tag: el.tagName.toLowerCase(),
              cls: String(el.className).slice(0, 40),
              w, h,
              text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24),
            });
          }
        }
        const clipped = [];
        for (const el of document.querySelectorAll("h1, h2, h3, p, span, small, dt, dd, li, a")) {
          if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible") {
            clipped.push({
              tag: el.tagName.toLowerCase(),
              cls: String(el.className).slice(0, 40),
              text: (el.textContent || "").trim().slice(0, 30),
            });
            if (clipped.length > 5) break;
          }
        }
        return {
          overflowX: doc.scrollWidth - window.innerWidth,
          pageHeight: Math.round(doc.scrollHeight),
          offenders: offenders.slice(0, 6),
          smallTargets: smallTargets.slice(0, 10),
          clipped: clipped.slice(0, 6),
        };
      });
      measurements.push({ route, locale, viewport: vp.name, ...data });
    }
  }
}

/* ---- 2. Contrast: every fg/bg pairing that ships (desktop + 390) ---- */
const CONTRAST_SAMPLES = [
  { route: "/", sel: ".hero-description" },
  { route: "/", sel: ".hero-facts dt" },
  { route: "/", sel: ".hero-facts dd" },
  { route: "/", sel: ".hero-actions .button-quiet" },
  { route: "/about", sel: ".about-details p" },
  { route: "/about", sel: ".stat span" },
  { route: "/about", sel: ".program-type" },
  { route: "/about", sel: ".program-number" },
  { route: "/about", sel: ".program-copy p" },
  { route: "/about", sel: ".gallery-tile-caption" },
  { route: "/about", sel: ".join-coming-soon" },
  { route: "/about", sel: ".footer-contact-links a" },
  { route: "/about", sel: ".footer-social-links a" },
  { route: "/events", sel: ".events-hero p" },
  { route: "/events", sel: ".events-stats span" },
  { route: "/events", sel: ".event-summary" },
  { route: "/events", sel: ".event-details dt" },
  { route: "/events", sel: ".event-tags li" },
  { route: "/events", sel: ".event-date" },
  { route: "/events", sel: ".event-archive-position" },
  { route: "/events", sel: ".year-count" },
  { route: "/gallery", sel: ".gallery-heading p" },
  { route: "/gallery", sel: ".gallery-total" },
  { route: "/gallery", sel: ".gallery-tile-caption" },
  { route: "/admin", sel: ".admin-event-select small" },
  { route: "/admin", sel: ".section-label span" },
  { route: "/admin", sel: ".footer-heading" },
];

for (const locale of ["en", "mn"]) {
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const sample of CONTRAST_SAMPLES) {
    try {
      await page.goto(`${BASE}${sample.route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(150);
      const el = page.locator(sample.sel).first();
      if ((await el.count()) === 0) {
        contrast.push({ route: sample.route, sel: sample.sel, locale, missing: true });
        continue;
      }
      const fg = await el.evaluate((n) => getComputedStyle(n).color);
      const bg = await effectiveBackground(page, sample.sel);
      const parse = (s) => {
        const m = s.match(/rgba?\(([^)]+)\)/);
        const p = m[1].split(",").map((x) => Number(x.trim()));
        return { r: p[0], g: p[1], b: p[2] };
      };
      const f = parse(fg);
      const b = bg ?? { r: 10, g: 10, b: 10 };
      const L1 = relLuminance(f.r, f.g, f.b);
      const L2 = relLuminance(b.r, b.g, b.b);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      contrast.push({
        route: sample.route,
        sel: sample.sel,
        locale,
        fg,
        bg: b,
        ratio: Number(ratio.toFixed(2)),
        fontSize: await el.evaluate((n) => getComputedStyle(n).fontSize),
        fontWeight: await el.evaluate((n) => getComputedStyle(n).fontWeight),
      });
    } catch (e) {
      contrast.push({ route: sample.route, sel: sample.sel, locale, error: String(e).slice(0, 120) });
    }
  }
}

/* ---- 3. UI states: gallery + events empty/malformed, login failure ---- */
await page.setViewportSize({ width: 1366, height: 900 });
const dir = process.env.CCS_TEST_DIRECTORY;

// 3a. malformed store -> events + admin error state (R-27)
for (const route of ["events", "admin"]) {
  const store = path.join(dir, "events.json");
  const saved = await (await import("node:fs/promises")).readFile(store, "utf8");
  await writeFile(store, "{invalid");
  await page.goto(`${BASE}/${route}`, { waitUntil: "networkidle" });
  const errText = await page.locator(".events-state h1, .admin-login-card h1").first().textContent().catch(() => null);
  states.push({ state: `${route}-malformed-store`, heading: errText });
  await writeFile(store, saved);
}

// 3b. empty gallery (no plates) can't be staged without a rebuild; instead:
// viewer open/close/Escape (R-26, R-32)
await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle" });
await page.locator(".gallery-tile").first().click();
await page.waitForTimeout(300);
const dialogOpen = await page.evaluate(() => document.querySelector("dialog.gallery-viewer")?.open ?? false);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
const dialogClosed = await page.evaluate(() => !document.querySelector("dialog.gallery-viewer")?.open);
states.push({ state: "gallery-viewer-escape", opened: dialogOpen, closedOnEscape: dialogClosed });

// events details dialog
await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
await page.locator(".event-preview-open").first().click();
await page.waitForTimeout(300);
const evOpen = await page.evaluate(() => document.querySelector("dialog.event-details-dialog")?.open ?? false);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
states.push({ state: "event-details-escape", opened: evOpen, closedOnEscape: await page.evaluate(() => !document.querySelector("dialog.event-details-dialog")?.open) });

// 3c. admin login failure (visible feedback, R-26)
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("wrong-password-123");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(600);
const loginError = await page.locator(".admin-error").textContent().catch(() => null);
states.push({ state: "admin-login-wrong-password", feedbackShown: Boolean(loginError && loginError.trim()) });

// 3d. mobile menu toggle
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const menu = page.locator("details.mobile-nav");
await menu.locator("summary").click();
await page.waitForTimeout(200);
const menuOpen = await page.evaluate(() => document.querySelector("details.mobile-nav")?.open ?? false);
await menu.locator("summary").click();
await page.waitForTimeout(200);
states.push({ state: "mobile-menu-toggle", opened: menuOpen, closed: await page.evaluate(() => !document.querySelector("details.mobile-nav")?.open) });

/* ---- 4. Controls: every link target resolves, every button acts ---- */
await page.setViewportSize({ width: 1366, height: 900 });
const linkCheck = [];
for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && !h.startsWith("http") && !h.startsWith("mailto") && !h.startsWith("tel")),
  );
  for (const href of [...new Set(hrefs)]) {
    const resp = await page.request.get(`${BASE}${href.split("#")[0]}`);
    linkCheck.push({ route, href, status: resp.status() });
  }
}
controls.push({ check: "internal-links", results: linkCheck });

// keyboard walk: focus visible on first tabs per page
const focusWalk = [];
for (const route of ["/", "/events", "/gallery", "/admin"]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab"); // skip link
  const skipVisible = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return el.className.includes("skip-link") && (cs.outlineStyle !== "none" || cs.position === "fixed");
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const scrolled = await page.evaluate(() => window.scrollY > 0 || location.hash === "#main-content");
  focusWalk.push({ route, skipLinkFocused: skipVisible, activated: true });
  // second tab should land on a real control with outline
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement);
    return { outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, tag: document.activeElement.tagName };
  });
  focusWalk.push({ route, secondFocus: outline });
}
controls.push({ check: "keyboard-focus", results: focusWalk });

/* ---- 5. Motion audit (MOTION dial = 1) ---- */
await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const animations = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.animationName !== "none" && cs.animationIterationCount !== "1") {
      out.push({ cls: String(el.className).slice(0, 40), anim: cs.animationName, iter: cs.animationIterationCount });
    }
  }
  return out;
});
controls.push({ check: "infinite-animations", results: animations });

/* ---- Screenshots: one per route per locale at 3 sizes ---- */
for (const vp of [{ name: "390x844", width: 390, height: 844 }, { name: "1366x900", width: 1366, height: 900 }]) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const route of ROUTES) {
    for (const locale of ["en", "mn"]) {
      await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      await page.screenshot({
        path: path.join(OUT, `shot-${route.replace(/\//g, "_") || "root"}-${locale}-${vp.name}.png`),
        fullPage: route !== "/",
      });
    }
  }
}

await writeFile(path.join(OUT, "measurements.json"), JSON.stringify({ measurements }, null, 2));
await writeFile(path.join(OUT, "contrast.json"), JSON.stringify({ contrast }, null, 2));
await writeFile(path.join(OUT, "states.json"), JSON.stringify({ states, consoleErrors }, null, 2));
await writeFile(path.join(OUT, "controls.json"), JSON.stringify(controls, null, 2));

console.log(`layout probes: ${measurements.length}`);
console.log(`overflow probes >1px: ${measurements.filter((m) => m.overflowX > 1).length}`);
console.log(`small targets: ${measurements.filter((m) => m.smallTargets.length > 0).length}`);
console.log(`clipped text: ${measurements.filter((m) => m.clipped.length > 0).length}`);
console.log(`contrast pairs: ${contrast.length}, below 4.5: ${contrast.filter((c) => c.ratio && c.ratio < 4.5).length}`);
console.log(`console errors: ${consoleErrors.length}`);
await browser.close();
