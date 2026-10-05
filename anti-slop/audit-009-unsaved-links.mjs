/* Audit 009 probe 16: the admin unsaved-changes guard and the editor controls,
   then a look at whether any public control is a dead end. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const out = {};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("#admin-password").fill("test-only-admin-password");
await page.locator(".admin-login-form button").click();
await page.waitForTimeout(1500);
await page.locator(".admin-event-select").first().click();
await page.waitForTimeout(600);

out.selectorCounts = await page.evaluate(() => ({
  form: document.querySelectorAll(".admin-event-form").length,
  textInputs: document.querySelectorAll('.admin-event-form input[type="text"]').length,
  anyInputs: document.querySelectorAll(".admin-event-form input").length,
  titleById: document.querySelectorAll("#event-title").length,
}));

await page.locator("#event-title").fill("Audit probe title");
await page.waitForTimeout(500);
out.afterEdit = await page.evaluate(() => ({
  statusTexts: [...document.querySelectorAll('[role="status"], .admin-notice, .admin-unsaved')].map((n) => n.textContent.trim().slice(0, 100)),
  saveButtons: [...document.querySelectorAll(".admin-form-actions button")].map((n) => ({ text: n.textContent.trim().slice(0, 24), disabled: n.disabled })),
}));

let dialogSeen = false;
let dialogMessage = null;
page.on("dialog", async (d) => { dialogSeen = true; dialogMessage = d.message(); await d.dismiss(); });
await page.locator(".main-nav a").nth(1).click();
await page.waitForTimeout(900);
out.leaveWithUnsaved = { dialogSeen, dialogMessage, path: new URL(page.url()).pathname };

/* Cancel/reset control, if the form offers one. */
out.formActions = await page.evaluate(() => [...document.querySelectorAll(".admin-form-actions button, .admin-form-actions a")].map((n) => ({ tag: n.tagName.toLowerCase(), text: n.textContent.trim().slice(0, 30), disabled: n.disabled ?? null, href: n.getAttribute("href") })));

/* Public dead-end check: every link and button on the public routes, and what
   it resolved to. Accept any leftover confirm so navigation is not blocked. */
page.removeAllListeners("dialog");
page.on("dialog", (d) => d.accept().catch(() => {}));
const dead = [];
for (const route of ["/", "/about", "/gallery", "/events", "/posts"]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const items = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("a[href], button")) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || r.width === 0 || r.height === 0) continue;
      if (el.classList.contains("sr-only")) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim().slice(0, 30),
        href: el.getAttribute("href"),
        ariaLabel: el.getAttribute("aria-label"),
        disabled: "disabled" in el ? el.disabled : null,
      });
    }
    return out;
  });
  for (const item of items) {
    const target = item.href;
    const scheme = target ? (new URL(target, BASE).protocol) : "";
    if (scheme === "tel:" || scheme === "mailto:") {
      dead.push({ route, ...item, resolvedTo: scheme });
      continue;
    }
    const external = target && /^https?:/.test(target);
    const anchor = target && target.startsWith("#");
    let status = null;
    if (external) status = "external";
    else if (anchor) {
      const id = target.slice(1);
      status = (await page.locator(`#${id}`).count()) > 0 ? "anchor-ok" : "anchor-MISSING";
    } else if (target) {
      const resp = await page.request.get(new URL(target, BASE).toString());
      status = resp.status();
    }
    dead.push({ route, ...item, resolvedTo: status });
  }
}
out.publicControls = dead;
out.problems = dead.filter((d) => d.resolvedTo === "anchor-MISSING" || (typeof d.resolvedTo === "number" && d.resolvedTo >= 400));

await writeFile(path.join(OUT, "admin-unsaved-and-links.json"), JSON.stringify(out, null, 2));
console.log("selectorCounts", JSON.stringify(out.selectorCounts));
console.log("afterEdit", JSON.stringify(out.afterEdit));
console.log("leaveWithUnsaved", JSON.stringify(out.leaveWithUnsaved));
console.log("formActions", JSON.stringify(out.formActions));
console.log("public controls:", dead.length, "problems:", out.problems.length);
for (const p of out.problems) console.log("  ", JSON.stringify(p));
await browser.close();