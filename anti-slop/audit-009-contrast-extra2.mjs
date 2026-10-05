/* Audit 009 probe 5: contrast for the remaining dialog/viewer/admin pairs with
   the real class names, plus the smallest rendered type size on every route.
   Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";

function relLuminance(r, g, b) {
  const lin = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

const rows = [];
const typeSizes = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

async function measure(label, sels) {
  for (const sel of sels) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) { rows.push({ label, sel, missing: true }); continue; }
    const fg = await el.evaluate((n) => getComputedStyle(n).color);
    const bg = await el.evaluate((n) => {
      function parseColor(str) {
        const m = str.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(",").map((s) => s.trim());
        return { r: Number(p[0]), g: Number(p[1]), b: Number(p[2]), a: p[3] === undefined ? 1 : Number(p[3]) };
      }
      const chain = [];
      let node = n;
      while (node && node !== document.documentElement) { chain.unshift(node); node = node.parentElement; }
      let acc = { r: 10, g: 10, b: 10 };
      for (const c of chain) {
        const cs = getComputedStyle(c);
        const layers = [];
        const imgs = cs.backgroundImage === "none" ? [] : cs.backgroundImage.split(/,(?![^(]*\))/);
        for (const img of imgs) {
          const stops = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parseColor(m[0]));
          if (stops.length) layers.push(...stops);
        }
        const bc = parseColor(cs.backgroundColor);
        if (bc) layers.push(bc);
        for (const layer of layers.reverse()) {
          if (layer.a === 0) continue;
          acc = {
            r: layer.r * layer.a + acc.r * (1 - layer.a),
            g: layer.g * layer.a + acc.g * (1 - layer.a),
            b: layer.b * layer.a + acc.b * (1 - layer.a),
          };
        }
      }
      return { r: Math.round(acc.r), g: Math.round(acc.g), b: Math.round(acc.b) };
    });
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(",").map((x) => Number(x.trim())); return { r: p[0], g: p[1], b: p[2] }; };
    const f = parse(fg);
    const L1 = relLuminance(f.r, f.g, f.b);
    const L2 = relLuminance(bg.r, bg.g, bg.b);
    rows.push({
      label, sel, fg, bg,
      ratio: Number(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)),
      fontSize: await el.evaluate((n) => getComputedStyle(n).fontSize),
    });
  }
}

/* Gallery viewer, real class names. */
for (const locale of ["en", "mn"]) {
  await page.goto(`${BASE}/gallery${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
  await page.locator(".gallery-tile").first().click();
  await page.waitForTimeout(500);
  await measure(`/gallery viewer ${locale}`, [".gallery-viewer-caption", ".gallery-viewer-count", ".gallery-viewer-button", ".gallery-viewer-close, .gallery-viewer-controls button"]);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

/* Events dialog, real class names. */
for (const locale of ["en", "mn"]) {
  await page.goto(`${BASE}/events${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
  await page.locator(".event-preview-open").first().click();
  await page.waitForTimeout(500);
  await measure(`/events dialog ${locale}`, [".event-details-dialog h3, .event-details-dialog h2", ".event-register", ".event-details-dialog button"]);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

/* Admin, logged in, real class names. */
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);
for (const locale of ["en", "mn"]) {
  await page.goto(`${BASE}/admin${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await measure(`/admin logged-in ${locale}`, [
    ".admin-event-select small", ".admin-event-type", ".admin-empty", ".admin-config-note",
    ".admin-notice", ".admin-list-heading", ".admin-delete-button", ".admin-facebook-info-hint",
    ".admin-toolbar button", ".admin-form-heading", "label",
  ]);
}

/* Smallest rendered text on every route, both locales, desktop and mobile. */
for (const vp of [{ name: "1366x900", w: 1366, h: 900 }, { name: "390x844", w: 390, h: 844 }]) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  for (const route of ["/", "/about", "/gallery", "/events", "/posts"]) {
    for (const locale of ["en", "mn"]) {
      await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      const smallest = await page.evaluate(() => {
        const found = [];
        for (const el of document.querySelectorAll("body *")) {
          if (!el.childNodes.length) continue;
          let hasText = false;
          for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
          if (!hasText) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          if (el.classList.contains("sr-only")) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          found.push({
            size: parseFloat(cs.fontSize),
            cls: String(el.className).slice(0, 34) || el.tagName.toLowerCase(),
            text: (el.textContent || "").trim().slice(0, 24),
          });
        }
        found.sort((a, b) => a.size - b.size);
        return found.slice(0, 6);
      });
      typeSizes.push({ route, locale, viewport: vp.name, smallest });
    }
  }
}

await writeFile(path.join(OUT, "contrast-extra2.json"), JSON.stringify(rows, null, 2));
await writeFile(path.join(OUT, "type-sizes.json"), JSON.stringify(typeSizes, null, 2));

const measured = rows.filter((r) => r.ratio).sort((a, b) => a.ratio - b.ratio);
console.log(`measured ${measured.length}, missing ${rows.filter((r) => r.missing).length}`);
for (const r of measured.slice(0, 18)) console.log(" ", r.ratio, r.label, r.sel, r.fontSize);
console.log("--- smallest type");
for (const t of typeSizes) console.log(t.route, t.locale, t.viewport, t.smallest.map((s) => `${s.size}${s.cls}:${s.text.slice(0, 12)}`).join(" | "));
await browser.close();