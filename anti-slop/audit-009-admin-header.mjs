/* Audit 009 probe 12: the logged-in admin layout (the main sweep only saw the
   login card), the 280px header and menu, and every text run on the home hero
   at 280px. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = { admin: [], header280: [], hero280: [] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);

for (const size of [{ name: "1366x900", w: 1366, h: 900 }, { name: "768x1024", w: 768, h: 1024 }, { name: "390x844", w: 390, h: 844 }, { name: "280x844", w: 280, h: 844 }]) {
  await page.setViewportSize({ width: size.w, height: size.h });
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  out.admin.push(await page.evaluate((name) => {
    const doc = document.documentElement;
    const escaping = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.classList.contains("sr-only")) continue;
      let hasText = false;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
      if (!hasText) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      let right = -Infinity;
      for (const node of el.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
      }
      if (right === -Infinity) continue;
      if (right > r.right + 1) {
        escaping.push({ cls: String(el.className).slice(0, 40) || el.tagName.toLowerCase(), boxRight: Number(r.right.toFixed(1)), textRight: Number(right.toFixed(2)), overhang: Number((right - r.right).toFixed(2)), text: (el.textContent || "").trim().slice(0, 30) });
      }
      if (escaping.length > 8) break;
    }
    const small = [];
    for (const el of document.querySelectorAll("button, a[href], input, select, textarea, summary, [tabindex]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const w = Math.round(r.width); const h = Math.round(r.height);
      if ((w > 0 && w < 44) || (h > 0 && h < 44)) small.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 36), w, h, text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24) });
    }
    return {
      viewport: name,
      overflowX: doc.scrollWidth - window.innerWidth,
      pageHeight: Math.round(doc.scrollHeight),
      escaping,
      smallTargets: small.slice(0, 12),
      loggedIn: Boolean(document.querySelector(".admin-dashboard")),
      eventRows: document.querySelectorAll(".admin-event-select").length,
    };
  }, size.name));
}
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: path.join(OUT, "admin-logged-in-mn-390x844.png"), fullPage: true });
await page.setViewportSize({ width: 1366, height: 900 });
await page.screenshot({ path: path.join(OUT, "admin-logged-in-1366x900.png"), fullPage: true });

/* 280px header on the public routes: brand, locale toggle, menu control. */
for (const route of ["/", "/about", "/gallery", "/events", "/posts"]) {
  for (const locale of ["en", "mn"]) {
    await page.setViewportSize({ width: 280, height: 844 });
    await page.goto(`${BASE}${route}${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    out.header280.push(await page.evaluate(({ r, l }) => {
      const summary = document.querySelector("details.mobile-nav summary");
      const sr = summary?.getBoundingClientRect();
      const label = document.querySelector(".mobile-menu-label");
      const lr = label?.getBoundingClientRect();
      const toggle = document.querySelector(".locale-toggle")?.getBoundingClientRect();
      const brand = document.querySelector(".brand")?.getBoundingClientRect();
      return {
        route: r, locale: l,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        menuSummary: sr ? `${Math.round(sr.width)}x${Math.round(sr.height)}` : null,
        menuLabel: label?.textContent?.trim() ?? null,
        labelVisible: lr ? lr.width > 0 && getComputedStyle(label).display !== "none" : false,
        labelWidth: lr ? Number(lr.width.toFixed(1)) : null,
        localeToggle: toggle ? `${Math.round(toggle.width)}x${Math.round(toggle.height)}` : null,
        brand: brand ? `${Math.round(brand.width)}x${Math.round(brand.height)}` : null,
      };
    }, { r: route, l: locale }));
  }
}

/* Open the 280px menu and measure its links. */
await page.setViewportSize({ width: 280, height: 844 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator("details.mobile-nav summary").click();
await page.waitForTimeout(300);
out.header280.push(await page.evaluate(() => ({
  route: "/ menu open",
  links: [...document.querySelectorAll(".mobile-nav-panel a")].map((a) => {
    const r = a.getBoundingClientRect();
    return { text: a.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), scrollW: a.scrollWidth };
  }),
  panelOverflow: document.documentElement.scrollWidth - window.innerWidth,
})));
await page.screenshot({ path: path.join(OUT, "home-menu-open-280x844.png") });

/* Every text run on the home hero at 280px, both locales. */
for (const locale of ["en", "mn"]) {
  await page.setViewportSize({ width: 280, height: 844 });
  await page.goto(`${BASE}/${locale === "mn" ? "?lang=mn" : ""}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  out.hero280.push(await page.evaluate((l) => {
    const rows = [];
    for (const el of document.querySelectorAll(".hero h1, .hero h1 span, .hero p, .hero li, .hero a, .hero button, .hero strong, .hero dt, .hero dd")) {
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
        cls: String(el.className || el.tagName).slice(0, 30),
        boxRight: Number(r.right.toFixed(1)),
        textRight: Number(right.toFixed(2)),
        pastViewport: Number(Math.max(0, right - window.innerWidth).toFixed(2)),
        fontSize: getComputedStyle(el).fontSize,
        text: (el.textContent || "").trim().slice(0, 34),
      });
    }
    return { locale: l, viewport: window.innerWidth, heroOverflowHidden: getComputedStyle(document.querySelector(".hero")).overflow, rows };
  }, locale));
}

await writeFile(path.join(OUT, "admin-header-hero.json"), JSON.stringify(out, null, 2));
console.log("== admin");
for (const a of out.admin) console.log(" ", a.viewport, "overflow", a.overflowX, "loggedIn", a.loggedIn, "rows", a.eventRows, "escaping", a.escaping.length, "small", a.smallTargets.length);
for (const a of out.admin) if (a.escaping.length) console.log("    escaping:", JSON.stringify(a.escaping));
for (const a of out.admin) if (a.smallTargets.length) console.log("    small:", JSON.stringify(a.smallTargets));
console.log("== header 280");
for (const h of out.header280) console.log(" ", JSON.stringify(h));
console.log("== hero 280");
for (const h of out.hero280) {
  console.log(" locale", h.locale, "overflow", h.heroOverflowHidden);
  for (const r of h.rows) console.log("   ", JSON.stringify(r));
}
await browser.close();