/* Audit 009 visual sweep. Read-only: measures the running production test
   server at http://127.0.0.1:3100 against the antislop gates. It modifies no
   application source, no design direction, and no production data. Evidence
   lands in anti-slop/evidence-009-2026-10-05/.
 *
 * Companion probes, all read-only and all writing into the same folder:
 *   audit-009-state-recheck.mjs     states whose first selectors were wrong
 *   audit-009-state-recheck2.mjs    carousel keyboard + React #441 trace
 *   audit-009-contrast-extra.mjs    dialog/viewer/empty/admin contrast pairs
 *   audit-009-contrast-extra2.mjs   real class names + smallest type per route
 *   audit-009-rhythm.mjs            vertical rhythm and whitespace structure
 *   audit-009-gallery-posts.mjs     gallery lazy-load, posts clamp, admin sizes
 *   audit-009-keyboard-motion.mjs   arrow keys, motion with/without reduce
 *   audit-009-events-desktop.mjs    events archive geometry at desktop
 *   audit-009-events-repeats.mjs    is the desktop reading real or a timing artefact
 *   audit-009-events-keyboard.mjs   settled desktop keyboard + year filter
 *   audit-009-admin-header.mjs      logged-in admin, 280px header, hero at 280
 *   audit-009-locale-admin.mjs      locale handling, admin panel, posts sections
 *   audit-009-clickthrough.mjs      every control, element by element
 *   audit-009-cta-recheck.mjs       home CTA + admin form recheck
 *   audit-009-unsaved-links.mjs     unsaved-changes guard, every public link
 *   audit-009-narrow-evidence.mjs   captures for the two narrow-heading findings
 *   audit-009-final-checks.mjs      one-screen promise, count consistency
 *   audit-009-home-short.mjs        home at short heights
 *   audit-009-home-320.mjs          the 320x568 scroll capture
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const BASE = "http://127.0.0.1:3100";
const ROUTES = ["/", "/about", "/gallery", "/events", "/posts", "/admin"];
const VIEWPORTS = [
  { name: "280x844", width: 280, height: 844 },
  { name: "312x780", width: 312, height: 780 },
  { name: "360x800", width: 360, height: 800 },
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

/* Range-level text measurement: scrollWidth/clientWidth only catches boxes that
   clip. A range per text node also catches a glyph run painted outside its
   container while overflow is still visible. */
const RANGE_PROBE = () => {
  const doc = document.documentElement;
  const escaping = [];
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" && el.classList.contains("background-wash")) continue;
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1)) {
      let p = el.parentElement;
      let scrollable = false;
      while (p) {
        if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) { scrollable = true; break; }
        p = p.parentElement;
      }
      if (!scrollable && offenders.length < 6) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 60),
          left: Math.round(r.left),
          right: Math.round(r.right),
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    }
    if (escaping.length < 8 && el.childNodes.length > 0) {
      let widestRight = -Infinity;
      let widestLeft = Infinity;
      for (const node of el.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          widestRight = Math.max(widestRight, rect.right);
          widestLeft = Math.min(widestLeft, rect.left);
        }
      }
      if (widestRight === -Infinity) continue;
      const clipped = cs.overflow !== "visible" || cs.overflowX !== "visible";
      if (widestRight > r.right + 1 || widestLeft < r.left - 1) {
        escaping.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 60),
          boxRight: Number(r.right.toFixed(2)),
          textRight: Number(widestRight.toFixed(2)),
          boxLeft: Number(r.left.toFixed(2)),
          textLeft: Number(widestLeft.toFixed(2)),
          clipped,
          text: (el.textContent || "").trim().slice(0, 48),
        });
      }
    }
  }
  const smallTargets = [];
  for (const el of document.querySelectorAll("button, a[href], input, select, textarea, summary, [tabindex]")) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (r.width === 0 && r.height === 0) continue;
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if ((w > 0 && w < 44) || (h > 0 && h < 44)) {
      smallTargets.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 44),
        w, h,
        text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 28),
      });
    }
  }
  const clipped = [];
  for (const el of document.querySelectorAll("h1, h2, h3, p, span, small, dt, dd, li, a")) {
    if (el.classList.contains("sr-only")) continue;
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible") {
      clipped.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 44),
        text: (el.textContent || "").trim().slice(0, 32),
      });
      if (clipped.length > 6) break;
    }
  }
  return {
    overflowX: doc.scrollWidth - window.innerWidth,
    pageHeight: Math.round(doc.scrollHeight),
    offenders,
    escaping,
    smallTargets: smallTargets.slice(0, 12),
    clipped: clipped.slice(0, 6),
  };
};

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
      await page.waitForTimeout(250);
      measurements.push({ route, locale, viewport: vp.name, ...(await page.evaluate(RANGE_PROBE)) });
    }
  }
}

/* ---- 2. Home one-screen sweep: heights at fixed desktop width ---- */
const homeHeights = [];
for (const height of [520, 561, 580, 593, 600, 620, 700, 800, 900]) {
  await page.setViewportSize({ width: 1366, height });
  for (const locale of ["en", "mn"]) {
    await page.goto(`${BASE}/${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    homeHeights.push(await page.evaluate((h) => {
      const hero = document.querySelector(".hero");
      const heroRect = hero?.getBoundingClientRect();
      const escaped = [];
      for (const el of document.querySelectorAll(".hero h1, .hero p, .hero li, .hero a, .hero dt, .hero dd")) {
        for (const node of el.childNodes) {
          if (node.nodeType !== 3 || !node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.top < (heroRect?.top ?? 0) - 1 || rect.bottom > (heroRect?.bottom ?? 0) + 1) {
              escaped.push({
                cls: String(el.className || el.tagName).slice(0, 40),
                text: node.textContent.trim().slice(0, 32),
                top: Number(rect.top.toFixed(1)),
                bottom: Number(rect.bottom.toFixed(1)),
              });
            }
          }
        }
      }
      return {
        height: h,
        docScrolls: document.documentElement.scrollHeight > window.innerHeight + 2,
        heroHeight: heroRect ? Math.round(heroRect.height) : null,
        escaped: escaped.slice(0, 6),
      };
    }, height));
  }
}

/* ---- 3. Narrow heading sweep: home + every public route at 240-320px ---- */
const narrow = [];
for (const width of [240, 260, 280, 300, 320]) {
  await page.setViewportSize({ width, height: 844 });
  for (const route of ["/", "/about", "/events", "/gallery", "/posts"]) {
    for (const locale of ["en", "mn"]) {
      await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      const record = await page.evaluate((w) => {
        const out = [];
        for (const el of document.querySelectorAll("h1, h1 span, h2, .button, .locale-toggle a, .footer-social-links a")) {
          const r = el.getBoundingClientRect();
          let right = -Infinity;
          for (const node of el.childNodes) {
            if (node.nodeType !== 3 || !node.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
          }
          if (right === -Infinity) continue;
          if (right > r.right + 1 || r.width + 0.5 > w) {
            out.push({
              tag: el.tagName.toLowerCase(),
              cls: String(el.className).slice(0, 44),
              box: Number(r.width.toFixed(2)),
              textRight: Number(right.toFixed(2)),
              pastViewport: Number(Math.max(0, right - window.innerWidth).toFixed(2)),
              docWidth: document.documentElement.scrollWidth,
              text: (el.textContent || "").trim().slice(0, 34),
            });
          }
          if (out.length > 6) break;
        }
        return { width: w, overflowX: document.documentElement.scrollWidth - window.innerWidth, offenders: out };
      }, width);
      narrow.push({ route, locale, ...record });
    }
  }
}

/* ---- 4. Contrast: every fg/bg pairing that ships ---- */
async function effectiveBackground(selector) {
  return page.evaluate((sel) => {
    function parseColor(str) {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(",").map((s) => s.trim());
      return {
        r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]),
        a: parts[3] === undefined ? 1 : Number(parts[3]),
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
      return out.reverse();
    }
    const el = document.querySelector(sel);
    if (!el) return null;
    let acc = { r: 10, g: 10, b: 10 };
    const chain = [];
    let node = el;
    while (node && node !== document.documentElement) { chain.unshift(node); node = node.parentElement; }
    for (const n of chain) {
      for (const layer of bgLayers(n)) {
        if (layer.a === 0) continue;
        acc = {
          r: layer.r * layer.a + acc.r * (1 - layer.a),
          g: layer.g * layer.a + acc.g * (1 - layer.a),
          b: layer.b * layer.a + acc.b * (1 - layer.a),
        };
      }
    }
    return { r: Math.round(acc.r), g: Math.round(acc.g), b: Math.round(acc.b) };
  }, selector);
}

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
  { route: "/posts", sel: ".posts-hero p" },
  { route: "/posts", sel: ".facebook-post-date" },
  { route: "/posts", sel: ".facebook-post-message" },
  { route: "/posts", sel: ".facebook-post-open" },
  { route: "/posts", sel: ".facebook-post-carousel-position" },
  { route: "/posts", sel: ".posts-section-heading h2" },
  { route: "/posts", sel: ".posts-empty" },
  { route: "/admin", sel: ".admin-event-select small" },
  { route: "/admin", sel: ".section-label span" },
  { route: "/admin", sel: ".footer-heading" },
];

for (const locale of ["en", "mn"]) {
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const sample of CONTRAST_SAMPLES) {
    try {
      await page.goto(`${BASE}${sample.route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(200);
      const el = page.locator(sample.sel).first();
      if ((await el.count()) === 0) {
        contrast.push({ route: sample.route, sel: sample.sel, locale, missing: true });
        continue;
      }
      const fg = await el.evaluate((n) => getComputedStyle(n).color);
      const bg = await effectiveBackground(sample.sel);
      const parse = (s) => {
        const m = s.match(/rgba?\(([^)]+)\)/);
        const p = m[1].split(",").map((x) => Number(x.trim()));
        return { r: p[0], g: p[1], b: p[2] };
      };
      const f = parse(fg);
      const b = bg ?? { r: 10, g: 10, b: 10 };
      const L1 = relLuminance(f.r, f.g, f.b);
      const L2 = relLuminance(b.r, b.g, b.b);
      contrast.push({
        route: sample.route, sel: sample.sel, locale, fg, bg: b,
        ratio: Number(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)),
        fontSize: await el.evaluate((n) => getComputedStyle(n).fontSize),
        fontWeight: await el.evaluate((n) => getComputedStyle(n).fontWeight),
      });
    } catch (e) {
      contrast.push({ route: sample.route, sel: sample.sel, locale, error: String(e).slice(0, 140) });
    }
  }
}

/* ---- 5. States: dialogs, menus, error/empty paths, carousels ---- */
const dir = process.env.CCS_TEST_DIRECTORY;

async function exercise(name, fn) {
  try {
    states.push({ state: name, ...(await fn()) });
  } catch (e) {
    states.push({ state: name, error: String(e).slice(0, 200) });
  }
}

await page.setViewportSize({ width: 1366, height: 900 });

await exercise("gallery-viewer-escape", async () => {
  await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle" });
  await page.locator(".gallery-tile").first().click();
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => document.querySelector("dialog.gallery-viewer")?.open ?? false);
  const insideFocus = await page.evaluate(() => document.activeElement?.closest("dialog") !== null);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const closed = await page.evaluate(() => !document.querySelector("dialog.gallery-viewer")?.open);
  return { opened, focusMovedInsideDialog: insideFocus, closedOnEscape: closed };
});

await exercise("event-details-escape", async () => {
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.locator(".event-preview-open").first().click();
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => document.querySelector("dialog.event-details-dialog")?.open ?? false);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  return { opened, closedOnEscape: await page.evaluate(() => !document.querySelector("dialog.event-details-dialog")?.open) };
});

await exercise("posts-carousel-controls", async () => {
  await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => document.querySelector(".facebook-post-track")?.scrollLeft ?? -1);
  const prevDisabledAtStart = await page.evaluate(() =>
    document.querySelector(".facebook-post-carousel-controls button")?.disabled ?? null);
  await page.locator(".facebook-post-carousel-controls button").nth(1).click();
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => document.querySelector(".facebook-post-track")?.scrollLeft ?? -1);
  const position = await page.locator(".facebook-post-carousel-position").first().textContent();
  await page.locator(".facebook-post-track").first().focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  const afterKey = await page.evaluate(() => document.querySelector(".facebook-post-track")?.scrollLeft ?? -1);
  return { scrollBefore: before, scrollAfterNext: after, prevDisabledAtStart, position, scrollAfterArrowKey: afterKey };
});

await exercise("posts-empty-state", async () => {
  const store = path.join(dir, "facebook-posts.json");
  const saved = await (await import("node:fs/promises")).readFile(store, "utf8");
  await (await import("node:fs/promises")).writeFile(store, "[]");
  await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
  const empty = (await page.locator(".posts-empty").first().textContent().catch(() => null))?.trim() ?? null;
  await (await import("node:fs/promises")).writeFile(store, saved);
  return { emptyText: empty };
});

await exercise("events-empty-archive", async () => {
  const store = path.join(dir, "events.json");
  const fs = await import("node:fs/promises");
  const saved = await fs.readFile(store, "utf8");
  await fs.writeFile(store, "[]");
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  const text = (await page.locator(".events-state, .events-archive-empty, .events-empty").first().textContent().catch(() => null))?.trim() ?? null;
  const upcoming = await page.locator("h2:has-text('next'), h2:has-text('Upcoming')").count().catch(() => 0);
  await fs.writeFile(store, saved);
  return { emptyText: text, upcomingHeadings: upcoming };
});

await exercise("admin-login-wrong-password", async () => {
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.locator("#admin-password").fill("wrong-password-123");
  await page.locator(".admin-login-form button").click();
  await page.waitForTimeout(700);
  const feedback = (await page.locator(".admin-error").textContent().catch(() => null))?.trim() ?? null;
  return { feedbackShown: Boolean(feedback), feedback };
});

await exercise("mobile-menu-toggle", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const summary = page.locator("details.mobile-nav summary");
  const size = await summary.evaluate((n) => {
    const r = n.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), label: n.textContent.trim() };
  });
  await summary.click();
  await page.waitForTimeout(250);
  const open = await page.evaluate(() => document.querySelector("details.mobile-nav")?.open ?? false);
  const linkSize = await page.locator(".mobile-nav-panel a").first().evaluate((n) => {
    const r = n.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  await summary.click();
  await page.waitForTimeout(250);
  return { summary: size, opened: open, firstLink: linkSize, closed: await page.evaluate(() => !document.querySelector("details.mobile-nav")?.open) };
});

await exercise("admin-logged-in-layout", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.locator("#admin-password").fill("test-only-admin-password");
  await page.locator(".admin-login-form button").click();
  await page.waitForTimeout(1500);
  const loggedIn = await page.locator(".admin-shell, .admin-event-select").count();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  return { loggedInRegions: loggedIn, overflowX: overflow };
});

/* ---- 6. Controls: link resolution, keyboard focus, motion ---- */
const linkCheck = [];
for (const route of ROUTES) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && !h.startsWith("http") && !h.startsWith("mailto") && !h.startsWith("tel")));
  for (const href of [...new Set(hrefs)]) {
    const resp = await page.request.get(`${BASE}${href.split("#")[0]}`);
    linkCheck.push({ route, href, status: resp.status() });
  }
}
controls.push({ check: "internal-links", results: linkCheck });

const focusWalk = [];
for (const route of ROUTES) {
  for (const locale of ["en", "mn"]) {
    await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
    const stops = [];
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press("Tab");
      stops.push(await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 32),
          text: (el.textContent || "").trim().slice(0, 22),
          outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
          visible: r.width > 0 && r.height > 0,
        };
      }));
    }
    focusWalk.push({ route, locale, stops });
  }
}
controls.push({ check: "keyboard-focus", results: focusWalk });

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
controls.push({ check: "infinite-animations-home", results: animations });

/* ---- 7. Content honesty: numbers, dead copy, dead controls ---- */
await page.setViewportSize({ width: 1366, height: 900 });
const honesty = [];
for (const route of ["/", "/about", "/events", "/gallery", "/posts"]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const text = await page.locator("body").innerText();
  const digits = [...new Set(text.match(/\b\d[\d,.%+]*\+?\b/g) || [])];
  const buzz = text.match(/\b(AI Powered|Revolutionary|Next Generation|Seamless|Cutting[- ]Edge|Get Started|Learn More|Try Now)\b/gi) || [];
  honesty.push({ route, numbers: digits, buzzwords: buzz, emDashes: (text.match(/—/g) || []).length });
}
controls.push({ check: "content-honesty", results: honesty });

/* ---- 8. Screenshots ---- */
for (const vp of [{ name: "280x844", width: 280, height: 844 }, { name: "390x844", width: 390, height: 844 }, { name: "1366x900", width: 1366, height: 900 }]) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const route of ROUTES) {
    for (const locale of ["en", "mn"]) {
      await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(OUT, `shot-${route.replace(/\//g, "_") || "root"}-${locale}-${vp.name}.png`),
        fullPage: !(route === "/" && vp.name === "1366x900"),
      });
    }
  }
}
await page.setViewportSize({ width: 1366, height: 570 });
for (const locale of ["en", "mn"]) {
  await page.goto(`${BASE}/${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `shot-home-${locale}-1366x570.png`) });
}

await writeFile(path.join(OUT, "measurements.json"), JSON.stringify({ measurements, homeHeights, narrow }, null, 2));
await writeFile(path.join(OUT, "contrast.json"), JSON.stringify({ contrast }, null, 2));
await writeFile(path.join(OUT, "states.json"), JSON.stringify({ states, consoleErrors }, null, 2));
await writeFile(path.join(OUT, "controls.json"), JSON.stringify(controls, null, 2));

console.log(`layout probes: ${measurements.length}`);
console.log(`overflow >1px: ${measurements.filter((m) => m.overflowX > 1).length}`);
console.log(`range-escape probes: ${measurements.filter((m) => m.escaping.length > 0).length}`);
console.log(`small targets (<44): ${measurements.filter((m) => m.smallTargets.length > 0).length}`);
console.log(`clipped text: ${measurements.filter((m) => m.clipped.length > 0).length}`);
console.log(`contrast pairs: ${contrast.length}, below 4.5: ${contrast.filter((c) => c.ratio && c.ratio < 4.5).length}, missing: ${contrast.filter((c) => c.missing).length}`);
console.log(`home height entries with escaped text: ${homeHeights.filter((h) => h.escaped.length > 0).length}`);
console.log(`narrow probes: ${narrow.length}, with offenders: ${narrow.filter((n) => n.offenders.length > 0).length}`);
console.log(`console errors: ${consoleErrors.length}`);
await browser.close();