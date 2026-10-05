/* Audit 009 probe 14: R-35 click-through of every interactive control on every
   public route, both locales, at desktop and mobile. Each entry records what
   actually happened, so nothing is a PASS by assertion. Read-only. */
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("./evidence-009-2026-10-05/", import.meta.url).pathname;
const BASE = "http://127.0.0.1:3100";
const results = { controls: [], consoleErrors: [] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") results.consoleErrors.push(m.text().slice(0, 120)); });
page.on("dialog", (d) => d.dismiss().catch(() => {}));

async function step(label, fn) {
  try {
    results.controls.push({ label, ...(await fn()) });
  } catch (e) {
    results.controls.push({ label, error: String(e).split("\n")[0].slice(0, 160) });
  }
}

const sizes = [{ name: "desktop", w: 1366, h: 900 }, { name: "mobile", w: 390, h: 844 }];

for (const size of sizes) {
  for (const locale of ["en", "mn"]) {
    const tag = `${size.name}/${locale}`;
    const q = locale === "mn" ? "?lang=mn" : "";
    await page.setViewportSize({ width: size.w, height: size.h });

    /* Home: two CTAs, locale toggle, menu on mobile. */
    await page.goto(`${BASE}/${q}`, { waitUntil: "networkidle" });
    await step(`${tag} home primary CTA`, async () => {
      const before = page.url();
      await page.locator(".hero-actions .button-primary").click();
      await page.waitForLoadState("networkidle");
      return { from: before.replace(BASE, ""), to: page.url().replace(BASE, ""), heading: (await page.locator("h1").first().textContent()).trim().slice(0, 40) };
    });
    await step(`${tag} home quiet CTA opens externally`, async () => {
      await page.goto(`${BASE}/${q}`, { waitUntil: "networkidle" });
      const a = page.locator(".hero-actions .button-quiet");
      return { href: await a.getAttribute("href"), target: await a.getAttribute("target"), rel: await a.getAttribute("rel") };
    });
    await step(`${tag} skip link`, async () => {
      await page.goto(`${BASE}/${q}`, { waitUntil: "networkidle" });
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => ({ cls: String(document.activeElement.className), text: document.activeElement.textContent.trim().slice(0, 30) }));
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      return { focused, hash: new URL(page.url()).hash, mainExists: await page.locator("#main-content").count() };
    });

    /* Nav: every destination resolves and marks itself current. */
    await step(`${tag} navbar destinations`, async () => {
      await page.goto(`${BASE}/${q}`, { waitUntil: "networkidle" });
      const links = await page.locator(".main-nav a").evaluateAll((nodes) => nodes.map((n) => ({ text: n.textContent.trim(), href: n.getAttribute("href"), current: n.getAttribute("aria-current") })));
      const visited = [];
      for (const link of links) {
        const resp = await page.request.get(`${BASE}${link.href}`);
        visited.push({ href: link.href, status: resp.status(), ariaCurrent: link.current });
      }
      return { links, visited };
    });

    if (size.name === "mobile") {
      await step(`${tag} mobile menu navigation`, async () => {
        await page.goto(`${BASE}/${q}`, { waitUntil: "networkidle" });
        await page.locator("details.mobile-nav summary").click();
        await page.waitForTimeout(200);
        const open = await page.evaluate(() => document.querySelector("details.mobile-nav")?.open ?? false);
        const links = await page.locator(".mobile-nav-panel a").evaluateAll((nodes) => nodes.map((n) => ({ text: n.textContent.trim(), href: n.getAttribute("href"), current: n.getAttribute("aria-current") })));
        await page.locator(".mobile-nav-panel a", { hasText: links[1].text }).click();
        await page.waitForLoadState("networkidle");
        return { opened: open, links, navigatedTo: page.url().replace(BASE, "") };
      });
    }

    /* About: in-page anchors, gallery link, programme rows. */
    await step(`${tag} about anchors and rows`, async () => {
      await page.goto(`${BASE}/about${q}`, { waitUntil: "networkidle" });
      const textLink = page.locator(".about-details .text-link");
      await textLink.click();
      await page.waitForTimeout(400);
      const hash = new URL(page.url()).hash;
      const targetExists = await page.locator(hash || "#none").count();
      const rows = await page.locator(".program-card").evaluateAll((nodes) => nodes.map((n) => ({
        tag: n.tagName.toLowerCase(),
        text: n.querySelector("h3")?.textContent?.trim(),
        href: n.getAttribute("href"),
        hasArrow: Boolean(n.querySelector(".program-arrow")),
      })));
      const galleryLink = page.locator(".gallery-more");
      const galleryHref = await galleryLink.getAttribute("href");
      await galleryLink.click();
      await page.waitForLoadState("networkidle");
      return { jumpedTo: hash, targetFound: targetExists, rows, galleryHref, galleryLanded: page.url().replace(BASE, ""), galleryHeading: (await page.locator("h1").first().textContent()).trim().slice(0, 30) };
    });

    /* Gallery: open, arrow through, close by button and by Escape. */
    await step(`${tag} gallery viewer`, async () => {
      await page.goto(`${BASE}/gallery${q}`, { waitUntil: "networkidle" });
      await page.locator(".gallery-tile").first().click();
      await page.waitForTimeout(500);
      const opened = await page.evaluate(() => document.querySelector("dialog.gallery-viewer")?.open ?? false);
      const counter1 = (await page.locator(".gallery-viewer-count").textContent()).trim();
      await page.locator(".gallery-viewer-controls button").nth(1).click();
      await page.waitForTimeout(400);
      const counter2 = (await page.locator(".gallery-viewer-count").textContent()).trim();
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(400);
      const counter3 = (await page.locator(".gallery-viewer-count").textContent()).trim();
      await page.locator(".gallery-viewer-controls button").last().click();
      await page.waitForTimeout(400);
      const closedByButton = await page.evaluate(() => !document.querySelector("dialog.gallery-viewer")?.open);
      await page.locator(".gallery-tile").nth(2).click();
      await page.waitForTimeout(400);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const closedByEscape = await page.evaluate(() => !document.querySelector("dialog.gallery-viewer")?.open);
      const focusReturned = await page.evaluate(() => document.activeElement?.classList.contains("gallery-tile") ?? false);
      const bodyScrollRestored = await page.evaluate(() => document.body.style.overflow === "");
      return { opened, counter1, afterNext: counter2, afterArrowLeft: counter3, closedByButton, closedByEscape, focusReturned, bodyScrollRestored };
    });

    /* Events: year filter, carousel controls, details dialog. */
    await step(`${tag} events year filter and carousel`, async () => {
      await page.goto(`${BASE}/events${q}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => {
        const t = document.querySelector(".event-preview-track");
        return Boolean(t) && t.clientWidth > 0;
      }, null, { timeout: 10000 });
      const allCount = await page.locator(".event-preview").count();
      const yearButtons = await page.locator(".year-grid button").evaluateAll((nodes) => nodes.map((n) => ({ text: n.textContent.trim(), pressed: n.getAttribute("aria-pressed") })));
      await page.locator(".year-grid button").nth(1).click();
      await page.waitForTimeout(700);
      const filtered = await page.locator(".event-preview").count();
      const activeLabel = (await page.locator(".year-grid button.is-active").textContent()).trim();
      await page.locator(".year-grid button").first().click();
      await page.waitForTimeout(700);
      const restored = await page.locator(".event-preview").count();

      const before = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
      await page.locator(".event-archive-controls button").nth(1).click();
      await page.waitForTimeout(1000);
      const afterNext = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);
      const position = (await page.locator(".event-archive-position").textContent()).trim();
      await page.locator(".event-archive-controls button").first().click();
      await page.waitForTimeout(1000);
      const afterPrev = await page.evaluate(() => document.querySelector(".event-preview-track").scrollLeft);

      await page.locator(".event-preview-open").first().click();
      await page.waitForTimeout(500);
      const dialogOpen = await page.evaluate(() => document.querySelector("dialog.event-details-dialog")?.open ?? false);
      const dialogTitle = (await page.locator(".event-details-dialog h3").first().textContent().catch(() => ""))?.trim().slice(0, 40);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const dialogClosed = await page.evaluate(() => !document.querySelector("dialog.event-details-dialog")?.open);
      return { allCount, yearButtons, filtered, activeLabel, restored, before, afterNext, position, afterPrev, dialogOpen, dialogTitle, dialogClosed };
    });

    /* Posts: carousel controls, Facebook link, Information section. */
    await step(`${tag} posts rail`, async () => {
      await page.goto(`${BASE}/posts${q}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const cards = await page.locator(".facebook-post-card").count();
      const position1 = (await page.locator(".posts-selected-carousel .facebook-post-carousel-position").textContent()).trim();
      const prevDisabled = await page.locator(".posts-selected-carousel .facebook-post-carousel-controls button").first().isDisabled();
      await page.locator(".posts-selected-carousel .facebook-post-carousel-controls button").nth(1).click();
      await page.waitForTimeout(900);
      const position2 = (await page.locator(".posts-selected-carousel .facebook-post-carousel-position").textContent()).trim();
      await page.locator(".posts-selected-carousel .facebook-post-carousel-controls button").first().click();
      await page.waitForTimeout(900);
      const position3 = (await page.locator(".posts-selected-carousel .facebook-post-carousel-position").textContent()).trim();
      const fbLink = page.locator(".facebook-post-open").first();
      const images = await page.evaluate(() => [...document.querySelectorAll(".facebook-post-image img")].map((i) => ({ complete: i.complete, w: i.naturalWidth })));
      return {
        cards, position1, prevDisabledAtStart: prevDisabled, afterNext: position2, afterPrev: position3,
        fbHref: await fbLink.getAttribute("href"), fbTarget: await fbLink.getAttribute("target"), fbRel: await fbLink.getAttribute("rel"),
        imagesLoaded: images.filter((i) => i.complete && i.w > 0).length, imagesTotal: images.length,
        infoSections: await page.locator(".posts-info-section").count(),
      };
    });

    /* Footer links. */
    await step(`${tag} footer links`, async () => {
      await page.goto(`${BASE}/about${q}`, { waitUntil: "networkidle" });
      return await page.evaluate(() => ({
        contact: [...document.querySelectorAll(".footer-contact-links a")].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })),
        social: [...document.querySelectorAll(".footer-social-links a")].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), external: a.href.startsWith("http") })),
        map: [...document.querySelectorAll(".site-footer a")].filter((a) => (a.textContent || "").includes("MUST")).map((a) => a.getAttribute("href")),
      }));
    });
  }
}

/* Admin: login failure, login success, form edit, delete guard. */
await page.setViewportSize({ width: 1366, height: 900 });
await step("desktop/en admin login failure then success", async () => {
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.locator("#admin-password").fill("wrong-password-123");
  await page.locator(".admin-login-form button").click();
  await page.waitForTimeout(700);
  const failure = (await page.locator(".admin-error").textContent().catch(() => ""))?.trim();
  await page.locator("#admin-password").fill("test-only-admin-password");
  await page.locator(".admin-login-form button").click();
  await page.waitForTimeout(1500);
  const loggedIn = await page.locator(".admin-dashboard").count();
  const logout = await page.locator(".admin-toolbar button").evaluateAll((nodes) => nodes.map((n) => n.textContent.trim()));
  return { failureFeedback: failure, loggedIn: Boolean(loggedIn), toolbarButtons: logout };
});

await step("desktop/en admin event form roundtrip", async () => {
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.locator("#admin-password").fill("test-only-admin-password");
  await page.locator(".admin-login-form button").click();
  await page.waitForTimeout(1500);
  const rows = await page.locator(".admin-event-select").count();
  await page.locator(".admin-event-select").first().click();
  await page.waitForTimeout(500);
  const titleValue = await page.locator(".admin-event-form input").first().inputValue().catch(() => null);
  const unsavedNotice = await page.locator(".admin-unsaved, [role='status']").first().textContent().catch(() => null);
  return { rows, openedTitle: titleValue, notice: unsavedNotice };
});

await writeFile(path.join(OUT, "click-through.json"), JSON.stringify(results, null, 2));
for (const c of results.controls) console.log(`${c.error ? "ERROR" : "ok   "} ${c.label}`, c.error ? c.error : JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k]) => k !== "label"))).slice(0, 320));
console.log("console errors:", results.consoleErrors);
await browser.close();