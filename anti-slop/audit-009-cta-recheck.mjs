/* Audit 009 probe 15: two click-through results need a second look.
   1. The home primary CTA reported from=/ to=/ : did it navigate at all?
   2. The admin event form input fill timed out: what is the first control? */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = {};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

/* 1. Home CTA */
out.homeCta = [];
for (const locale of ["en", "mn"]) {
  const q = locale === "mn" ? "?lang=mn" : "";
  await page.goto(`${BASE}/${q}`, { waitUntil: "networkidle" });
  const before = { url: page.url(), heading: (await page.locator("h1").first().textContent()).trim().slice(0, 30) };
  const href = await page.locator(".hero-actions .button-primary").getAttribute("href");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 8000 }).catch(() => null),
    page.locator(".hero-actions .button-primary").click(),
  ]);
  await page.waitForTimeout(600);
  out.homeCta.push({
    locale, before, href,
    after: { url: page.url(), heading: (await page.locator("h1").first().textContent()).trim().slice(0, 40), path: new URL(page.url()).pathname },
    landedOnAbout: new URL(page.url()).pathname === "/about",
  });
}

/* 2. Admin form controls */
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);
out.adminBeforeSelection = await page.evaluate(() => ({
  formInputs: [...document.querySelectorAll(".admin-event-form input, .admin-event-form select, .admin-event-form textarea")].map((i) => ({
    tag: i.tagName.toLowerCase(), type: i.type, id: i.id, name: i.name, value: (i.value || "").slice(0, 40),
    disabled: i.disabled, readOnly: i.readOnly,
  })),
  emptyEditor: document.querySelector(".admin-editor")?.textContent?.trim().slice(0, 120) ?? null,
}));
await page.locator(".admin-event-select").first().click();
await page.waitForTimeout(700);
out.adminAfterSelection = await page.evaluate(() => ({
  formInputs: [...document.querySelectorAll(".admin-event-form input, .admin-event-form select, .admin-event-form textarea")].map((i) => ({
    tag: i.tagName.toLowerCase(), type: i.type, id: i.id, name: i.name, value: (i.value || "").slice(0, 40),
    disabled: i.disabled,
  })),
  firstTitle: document.querySelector("#event-title, input[name='title']")?.value ?? null,
  selectedRow: document.querySelector(".admin-event-select.is-selected strong, .admin-event-select[aria-pressed='true'] strong")?.textContent ?? null,
  fieldsetDisabled: document.querySelector(".admin-form-fields")?.disabled ?? null,
}));

/* Type into the title field and confirm the unsaved-changes affordance. */
out.adminEdit = {};
const titleField = page.locator(".admin-event-form input[type='text']").first();
if (await titleField.count()) {
  await titleField.fill("Audit probe title");
  await page.waitForTimeout(400);
  out.adminEdit.afterEdit = {
    value: await titleField.inputValue(),
    statusTexts: await page.locator(".admin-notice, .admin-unsaved, [role='status']").evaluateAll((nodes) => nodes.map((n) => n.textContent.trim().slice(0, 80))),
    saveButtons: await page.locator(".admin-form-actions button").evaluateAll((nodes) => nodes.map((n) => ({ text: n.textContent.trim(), disabled: n.disabled }))),
  };
  /* Try to leave with unsaved changes: the confirm dialog must appear. */
  let dialogSeen = false;
  page.once("dialog", async (d) => { dialogSeen = true; await d.dismiss(); });
  await page.locator(".main-nav a", { hasText: "About" }).first().click().catch(() => null);
  await page.waitForTimeout(800);
  out.adminEdit.leaveWithUnsaved = { dialogSeen, stayedOnAdmin: new URL(page.url()).pathname === "/admin" };
}

await writeFile(path.join(OUT, "cta-admin-recheck.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();