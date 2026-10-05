/* Audit 009 probe 13: the remaining open questions.
   1. Which language is actually served when a user lands with no ?lang, and
      does the toggle keep the URL and the copy consistent?
   2. The admin Facebook post message: is the 6-7px overhang a real visible
      clip, and does the panel carry an honest state when Page access is not
      configured?
   3. The posts page: the Information section is absent with the real selection.
      Does the heading claim content it does not have?
   Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = { locale: {}, adminPanel: [], postsInfo: {} };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

/* ---- 1. Locale ---- */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
out.locale.defaultLanding = {
  htmlLang: await page.evaluate(() => document.documentElement.lang),
  heroLine1: (await page.locator(".hero h1 span").first().textContent()).trim(),
  pressed: await page.locator('.locale-toggle button[aria-pressed="true"]').textContent(),
  htmlLangMn: null,
};
await page.locator(".locale-toggle button", { hasText: "MN" }).click();
await page.waitForTimeout(800);
out.locale.afterToggle = {
  url: page.url(),
  htmlLang: await page.evaluate(() => document.documentElement.lang),
  heroLine1: (await page.locator(".hero h1 span").first().textContent()).trim(),
  pressed: await page.locator('.locale-toggle button[aria-pressed="true"]').textContent(),
};
await page.goto(`${BASE}/about?lang=mn`, { waitUntil: "networkidle" });
out.locale.explicitMn = {
  htmlLang: await page.evaluate(() => document.documentElement.lang),
  title: await page.title(),
  h1: (await page.locator("h1").first().textContent()).trim(),
  pressed: await page.locator('.locale-toggle button[aria-pressed="true"]').textContent(),
};
await page.goto(`${BASE}/about?lang=en`, { waitUntil: "networkidle" });
out.locale.explicitEn = {
  htmlLang: await page.evaluate(() => document.documentElement.lang),
  h1: (await page.locator("h1").first().textContent()).trim(),
};
await page.goto(`${BASE}/about?lang=xx`, { waitUntil: "networkidle" });
out.locale.unknownValue = {
  htmlLang: await page.evaluate(() => document.documentElement.lang),
  h1: (await page.locator("h1").first().textContent()).trim(),
  pressed: await page.locator('.locale-toggle button[aria-pressed="true"]').textContent(),
};

/* ---- 2. Admin Facebook panel ---- */
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);
out.adminPanel.push(await page.evaluate(() => {
  const message = document.querySelector(".admin-facebook-message");
  const r = message.getBoundingClientRect();
  const cs = getComputedStyle(message);
  return {
    configNote: document.querySelector(".admin-config-note")?.textContent?.trim().slice(0, 160) ?? null,
    refreshDisabled: [...document.querySelectorAll(".admin-facebook button")].map((b) => ({ label: b.getAttribute("aria-label") || b.textContent.trim().slice(0, 30), disabled: b.disabled })),
    panelHeadings: [...document.querySelectorAll(".admin-facebook-panel-heading h3")].map((h) => h.textContent.trim()),
    emptyStates: [...document.querySelectorAll(".admin-empty")].map((e) => e.textContent.trim().slice(0, 120)),
    messageOverflow: cs.overflow,
    messageBox: Number(r.width.toFixed(2)),
    messageScrollWidth: message.scrollWidth,
    messageClientWidth: message.clientWidth,
    selectedCount: document.querySelectorAll(".admin-facebook-selected").length,
  };
}));
await page.screenshot({ path: path.join(OUT, "admin-facebook-panel.png"), fullPage: true });

/* ---- 3. Posts: heading vs content ---- */
await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
out.postsInfo.withRealSelection = await page.evaluate(() => ({
  headings: [...document.querySelectorAll("h2")].map((h) => h.textContent.trim()),
  labels: [...document.querySelectorAll(".section-label span")].map((s) => s.textContent.trim()),
  selectedCards: document.querySelectorAll(".posts-selected-carousel .facebook-post-card").length,
  infoSections: document.querySelectorAll(".posts-info-section").length,
  intro: document.querySelector(".posts-hero p")?.textContent?.trim(),
}));
/* The real selection carries no #ccs-info post, so the section is absent.
   Add one marked post to see the section render, then restore the store. */
{
  const store = path.join(process.env.CCS_TEST_DIRECTORY, "facebook-posts.json");
  const { readFile } = await import("node:fs/promises");
  const saved = await readFile(store, "utf8");
  const posts = JSON.parse(saved);
  posts.push({
    id: "110700467422954_1496391259190099",
    message: "Audit probe #ccs-info marker test",
    createdTime: "2026-10-04T01:00:00+0000",
    permalinkUrl: "https://www.facebook.com/ccs.cybersec.club/posts/1496391259190099",
  });
  const { writeFile: wf } = await import("node:fs/promises");
  await wf(store, JSON.stringify(posts, null, 2));
  await page.goto(`${BASE}/posts`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  out.postsInfo.withMarkedPost = await page.evaluate(() => ({
    headings: [...document.querySelectorAll("h2")].map((h) => h.textContent.trim()),
    infoSections: document.querySelectorAll(".posts-info-section").length,
    infoCards: document.querySelectorAll(".posts-info-carousel .facebook-post-card").length,
    pageHeight: Math.round(document.documentElement.scrollHeight),
  }));
  await page.screenshot({ path: path.join(OUT, "posts-with-info-section.png"), fullPage: true });
  await wf(store, saved);
}

await writeFile(path.join(OUT, "locale-admin-posts.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();