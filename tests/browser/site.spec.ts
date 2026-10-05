import { expect, test, type Page } from "@playwright/test";
import type { Event } from "../../src/lib/event-types";
import { dictionaries } from "../../src/app/i18n";
import gallerySpec from "../../src/data/gallery.json";

const password = "test-only-admin-password";
const draft = {
  type: "other",
  title: "Browser regression fixture",
  titleMn: "Туршилтын арга хэмжээ",
  summary: "Test fixture, not public content.",
  summaryMn: "Туршилтын мэдээлэл.",
  date: "2026-10-02",
  status: "upcoming",
  tags: [],
  featured: false,
};

async function authenticate(page: Page) {
  await page.goto("/admin");
  await signIn(page);
}

async function eventRequest(page: Page, method: string, data?: unknown) {
  return page.evaluate(async ({ method, data }) => {
    const response = await fetch("/api/admin/events", {
      method,
      headers: { "Content-Type": "application/json" },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    return { status: response.status, body: await response.json() };
  }, { method, data });
}

async function signIn(page: Page) {
  await page.locator("#admin-password").fill(password);
  await page.locator(".admin-login-form button[type=submit]").click();
  await expect(page.locator("#event-title")).toBeVisible();
}

async function fillDraft(page: Page, title = draft.title) {
  await page.locator("#event-title").fill(title);
  await page.locator("#event-title-mn").fill(draft.titleMn);
  await page.locator("#event-summary").fill(draft.summary);
  await page.locator("#event-summary-mn").fill(draft.summaryMn);
  await page.locator("#event-date").fill(draft.date);
  await page.locator(".admin-optional-fields summary").click();
  await page.locator("#event-tags").fill("test, preserved");
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}

test("public routes render both languages without console errors or overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const route of ["/", "/about", "/gallery", "/events", "/posts"]) {
    for (const lang of ["en", "mn"]) {
      const response = await page.goto(`${route}?lang=${lang}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expectNoOverflow(page);
    }
  }
  expect(errors).toEqual([]);
});

test("locale controls and navigation reach real routes", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "MN", exact: true }).click();
  await expect(page).toHaveURL(/lang=mn/);
  await expect(page.locator("html")).toHaveAttribute("lang", "mn");
  const mobileNav = page.locator(".mobile-nav");
  const useMobileNav = isMobile || await mobileNav.isVisible();
  if (useMobileNav) await mobileNav.locator("summary").click();
  const nav = page.locator(useMobileNav ? ".mobile-nav-panel" : ".main-nav");
  await nav.getByRole("link", { name: "Арга хэмжээ", exact: true }).click();
  await expect(page).toHaveURL(/\/events\?lang=mn/);
  await expect(page.locator("main h1")).toHaveText("Тэмцээн, лекц, дадлага.");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("gallery opens, steps and closes with buttons and keyboard", async ({ page }) => {
  await page.goto("/gallery");
  const tile = page.locator(".gallery-tile").first();
  await tile.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator(".gallery-viewer-count")).toHaveText("1 of 18");
  await page.getByRole("button", { name: "Next photograph", exact: true }).click();
  await expect(page.locator(".gallery-viewer-count")).toHaveText("2 of 18");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".gallery-viewer-count")).toHaveText("1 of 18");
  await page.getByRole("button", { name: "Previous photograph", exact: true }).click();
  await expect(page.locator(".gallery-viewer-count")).toHaveText("18 of 18");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await tile.click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(tile).toBeFocused();
});

test("every gallery caption and alt text renders in both languages", async ({ page }) => {
  for (const locale of ["en", "mn"] as const) {
    await page.goto(`/gallery?lang=${locale}`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const tiles = page.locator(".gallery-tile");
    await expect(tiles).toHaveCount(gallerySpec.plates.length);
    const items = dictionaries[locale].gallery.items;
    await tiles.first().click();
    for (const [index, plate] of gallerySpec.plates.entries()) {
      const item = items[plate.id as keyof typeof items];
      await expect(tiles.nth(index).locator("img")).toHaveAttribute("alt", item.alt);
      await expect(tiles.nth(index).locator(".gallery-tile-caption")).toHaveText(item.caption);
      await expect(page.locator(".gallery-viewer-caption > span").last()).toHaveText(item.caption);
      await expectNoOverflow(page);
      const next = page.getByRole("button", { name: dictionaries[locale].gallery.next, exact: true });
      await next.click();
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
});

test("only admin-curated Facebook snapshots appear on the posts page", async ({ page }) => {
  await page.goto("/");
  const unauthenticated = await page.evaluate(async () => {
    const response = await fetch("/api/admin/facebook-posts");
    return response.status;
  });
  expect(unauthenticated).toBe(401);

  for (const [locale, message] of [
    ["en", "Browser regression fixture for the selected Facebook posts page."],
    ["mn", "Browser regression fixture for the selected Facebook posts page."],
  ] as const) {
    await page.goto(`/posts?lang=${locale}`);
    await expect(page.locator(".facebook-post-card")).toHaveCount(1);
    await expect(page.locator(".facebook-post-message")).toHaveText(message);
    await expect(page.locator(".posts-info-section")).toHaveCount(0);
    await expect(page.getByRole("link", { name: dictionaries[locale].posts.openOnFacebook, exact: true })).toHaveAttribute(
      "href",
      "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234567",
    );
    await expectNoOverflow(page);
  }
});

test("year filters show their matching archive records", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("button", { name: /^2026/ }).click();
  await expect(page.locator(".events-past-section .event-card")).toHaveCount(1);
  await page.getByRole("button", { name: /^All years/ }).click();
  await expect(page.locator(".events-past-section .event-card")).toHaveCount(1);
});

test("login validates input and rejects an incorrect password", async ({ page }) => {
  await page.goto("/admin");
  await page.locator(".admin-login-form button[type=submit]").click();
  expect(await page.locator("#admin-password").evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBeTruthy();
  await page.locator("#admin-password").fill("incorrect-test-password");
  await page.locator(".admin-login-form button[type=submit]").click();
  await expect(page.locator(".admin-error")).toHaveText("Invalid password.");
  await signIn(page);
});

for (const editing of [false, true]) {
  test(`${editing ? "existing" : "new"} draft survives session expiry and reauthentication`, async ({ page, context }) => {
    await authenticate(page);
    await page.goto("/admin");
    if (editing) await page.locator(".admin-event-select").first().click();
    const title = editing ? `${draft.title} edited` : draft.title;
    await fillDraft(page, title);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.clearCookies();
    await page.locator(".admin-event-form button[type=submit]").click();
    await expect(page.locator("#admin-password")).toBeFocused();
    await expect(page.getByRole("status")).toContainText("unsaved draft stays in this tab");
    await expectNoOverflow(page);
    await page.locator(".brand").click();
    // The navigation guard must stay active while the editor is hidden.
    await expect(page).toHaveURL(/\/admin$/);
    await signIn(page);
    await expect(page.locator("#event-title")).toHaveValue(title);
    await expect(page.locator("#event-title-mn")).toHaveValue(draft.titleMn);
    await expect(page.locator("#event-summary")).toHaveValue(draft.summary);
    await expect(page.locator("#event-date")).toHaveValue(draft.date);
    await page.locator(".admin-optional-fields summary").click();
    await expect(page.locator("#event-tags")).toHaveValue("test, preserved");
    await page.locator(".admin-event-form button[type=submit]").click();
    await expect(page.getByRole("status")).toHaveText("Event saved.");
    await expect(page.locator("#event-title")).toHaveValue("");
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });
}

test("Mongolian reauthentication works by keyboard and retains the draft", async ({ page, context }) => {
  await authenticate(page);
  await page.goto("/admin?lang=mn");
  await fillDraft(page);
  await context.clearCookies();
  await page.locator(".admin-event-form button[type=submit]").click();
  await expect(page.locator("#admin-password")).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Хадгалаагүй мэдээлэл энэ цонхонд үлдэнэ");
  await expectNoOverflow(page);
  const input = page.locator("#admin-password");
  await input.fill(password);
  expect(await input.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("#event-title")).toHaveValue(draft.title);
  await expect(page.locator("html")).toHaveAttribute("lang", "mn");
});

test("unauthorized delete and refresh also offer reauthentication without dropping the draft", async ({ page, context }) => {
  await authenticate(page);
  await page.goto("/admin");
  await fillDraft(page);
  await context.clearCookies();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".admin-delete-button").first().click();
  await expect(page.locator("#admin-password")).toBeVisible();
  await signIn(page);
  await expect(page.locator("#event-title")).toHaveValue(draft.title);

  await page.route("**/api/admin/events", async (route) => {
    if (route.request().method() === "POST") await route.fulfill({ status: 409, json: { error: "Test conflict" } });
    else await route.fulfill({ status: 401, json: { error: "Unauthorized." } });
  });
  await page.locator(".admin-event-form button[type=submit]").click();
  await expect(page.locator("#admin-password")).toBeVisible();
  await page.unroute("**/api/admin/events");
  await signIn(page);
  await expect(page.locator("#event-title")).toHaveValue(draft.title);
});

test("stale edits retain the draft and reload only after confirmation", async ({ page }) => {
  await authenticate(page);
  const response = await eventRequest(page, "GET");
  expect(response.status).toBe(200);
  const original: Event = response.body.events[0];
  await page.goto("/admin");
  await page.locator(".admin-event-select").filter({ hasText: original.title }).first().click();
  await page.locator("#event-title").fill("Unsaved conflict test");
  const changed = await eventRequest(page, "PUT", {
    id: original.id, event: { ...original, title: "External test edit" },
  });
  expect(changed.status).toBe(200);
  await page.locator(".admin-event-form button[type=submit]").click();
  await expect(page.locator(".admin-error")).toContainText("changed in another session");
  await expect(page.locator("#event-title")).toHaveValue("Unsaved conflict test");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reload latest", exact: true }).click();
  await expect(page.locator("#event-title")).toHaveValue("External test edit");
  await expect(page.getByRole("status")).toHaveText("Latest version loaded.");
});

test("reset, delete and logout controls perform their actions", async ({ page }) => {
  await authenticate(page);
  const response = await eventRequest(page, "POST", { event: { ...draft, title: "Disposable browser fixture" } });
  expect(response.status).toBe(201);
  await page.goto("/admin");
  const row = page.locator(".admin-event-row").filter({ hasText: "Disposable browser fixture" });
  await row.locator(".admin-event-select").click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#event-title")).toHaveValue("");
  page.once("dialog", (dialog) => dialog.accept());
  await row.locator(".admin-delete-button").click();
  await expect(row).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Event deleted.");
  await page.locator("#event-title").fill("Discard test draft");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".admin-toolbar").getByRole("button", { name: "New event", exact: true }).click();
  await expect(page.locator("#event-title")).toHaveValue("");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#admin-password")).toBeVisible();
  await signIn(page);
  await expect(page.locator("#event-title")).toHaveValue("");
});
