/* Audit 009 probe 4: contrast for pairs that only render inside a dialog, the
   posts empty state, the logged-in admin, and the hero facts. Read-only. */
import { chromium } from "playwright-core";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const dir = process.env.CCS_TEST_DIRECTORY;

function relLuminance(r, g, b) {
  const lin = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

async function effectiveBackground(page, selector) {
  return page.evaluate((sel) => {
    function parseColor(str) {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(",").map((s) => s.trim());
      return { r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]), a: parts[3] === undefined ? 1 : Number(parts[3]) };
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

const rows = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

async function sample(route, locale, sel, note) {
  try {
    await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) { rows.push({ route, locale, sel, note, missing: true }); return; }
    const fg = await el.evaluate((n) => getComputedStyle(n).color);
    const bg = await effectiveBackground(page, sel);
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(",").map((x) => Number(x.trim())); return { r: p[0], g: p[1], b: p[2] }; };
    const f = parse(fg);
    const b = bg ?? { r: 10, g: 10, b: 10 };
    const L1 = relLuminance(f.r, f.g, f.b);
    const L2 = relLuminance(b.r, b.g, b.b);
    rows.push({
      route, locale, sel, note, fg, bg: b,
      ratio: Number(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)),
      fontSize: await el.evaluate((n) => getComputedStyle(n).fontSize),
    });
  } catch (e) {
    rows.push({ route, locale, sel, note, error: String(e).slice(0, 140) });
  }
}

/* Hero facts: the markup uses li/strong, not dt/dd. */
for (const locale of ["en", "mn"]) {
  await sample("/", locale, ".hero-facts li", "hero fact line");
  await sample("/", locale, ".hero-facts strong", "hero fact number");
  await sample("/", locale, ".button-primary", "primary button");
}

/* Event details dialog contents. */
for (const locale of ["en", "mn"]) {
  await page.goto(`${BASE}/events${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.locator(".event-preview-open").first().click();
  await page.waitForTimeout(500);
  for (const sel of [".event-summary", ".event-details dt", ".event-details dd", ".event-tags li", ".event-type", ".event-date", ".event-register", ".event-details-dialog h2"]) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) { rows.push({ route: "/events dialog", locale, sel, missing: true }); continue; }
    const fg = await el.evaluate((n) => getComputedStyle(n).color);
    const bg = await effectiveBackground(page, sel);
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(",").map((x) => Number(x.trim())); return { r: p[0], g: p[1], b: p[2] }; };
    const f = parse(fg);
    const b = bg ?? { r: 10, g: 10, b: 10 };
    const L1 = relLuminance(f.r, f.g, f.b);
    const L2 = relLuminance(b.r, b.g, b.b);
    rows.push({ route: "/events dialog", locale, sel, fg, bg: b, ratio: Number(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)), fontSize: await el.evaluate((n) => getComputedStyle(n).fontSize) });
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

/* Gallery viewer. */
for (const locale of ["en", "mn"]) {
  await page.goto(`${BASE}/gallery${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
  await page.locator(".gallery-tile").first().click();
  await page.waitForTimeout(500);
  for (const sel of [".gallery-viewer figcaption", ".gallery-viewer button", ".gallery-viewer-counter"]) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) { rows.push({ route: "/gallery viewer", locale, sel, missing: true }); continue; }
    const fg = await el.evaluate((n) => getComputedStyle(n).color);
    const bg = await effectiveBackground(page, sel);
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(",").map((x) => Number(x.trim())); return { r: p[0], g: p[1], b: p[2] }; };
    const f = parse(fg);
    const b = bg ?? { r: 10, g: 10, b: 10 };
    const L1 = relLuminance(f.r, f.g, f.b);
    const L2 = relLuminance(b.r, b.g, b.b);
    rows.push({ route: "/gallery viewer", locale, sel, fg, bg: b, ratio: Number(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)), fontSize: await el.evaluate((n) => getComputedStyle(n).fontSize) });
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

/* Posts empty state. */
{
  const store = path.join(dir, "facebook-posts.json");
  const saved = await readFile(store, "utf8");
  await writeFile(store, "[]");
  for (const locale of ["en", "mn"]) await sample("/posts", locale, ".posts-empty", "empty selection");
  await writeFile(store, saved);
}

/* Logged-in admin. */
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);
for (const locale of ["en", "mn"]) {
  await page.goto(`${BASE}/admin${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  for (const sel of [".admin-event-select small", ".footer-heading", ".admin-form label", ".admin-event-select h2", ".admin-logout", ".admin-save"]) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) { rows.push({ route: "/admin logged-in", locale, sel, missing: true }); continue; }
    const fg = await el.evaluate((n) => getComputedStyle(n).color);
    const bg = await effectiveBackground(page, sel);
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(",").map((x) => Number(x.trim())); return { r: p[0], g: p[1], b: p[2] }; };
    const f = parse(fg);
    const b = bg ?? { r: 10, g: 10, b: 10 };
    const L1 = relLuminance(f.r, f.g, f.b);
    const L2 = relLuminance(b.r, b.g, b.b);
    rows.push({ route: "/admin logged-in", locale, sel, fg, bg: b, ratio: Number(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)), fontSize: await el.evaluate((n) => getComputedStyle(n).fontSize) });
  }
}

/* Footer and navigation pairs on a public route. */
for (const locale of ["en", "mn"]) {
  await sample("/about", locale, ".footer-heading", "footer heading");
  await sample("/about", locale, ".footer-note", "footer note");
  await sample("/about", locale, ".main-nav a", "nav link");
  await sample("/about", locale, ".main-nav a.is-active", "active nav link");
  await sample("/posts", locale, ".section-label span", "section label");
  await sample("/posts", locale, ".posts-section-heading h2", "section heading");
}

await writeFile(path.join(OUT, "contrast-extra.json"), JSON.stringify(rows, null, 2));
const measured = rows.filter((r) => r.ratio);
measured.sort((a, b) => a.ratio - b.ratio);
console.log(`rows: ${rows.length}, measured: ${measured.length}, missing: ${rows.filter((r) => r.missing).length}`);
for (const r of measured.slice(0, 24)) console.log(" ", r.ratio, r.route, r.locale, r.sel, r.fontSize, r.note || "");
console.log("missing:", rows.filter((r) => r.missing).map((r) => `${r.route} ${r.locale} ${r.sel}`).join(" | "));
await browser.close();