import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Event } from "../../src/lib/event-types";
import { dictionaries } from "../../src/app/i18n";

for (const locale of ["en", "mn"] as const) {
  test(`past events swipe, paginate, and open details in ${locale}`, async ({ page, isMobile }) => {
    const directory = process.env.CCS_TEST_DIRECTORY;
    if (!directory) throw new Error("Playwright test-store directory is missing.");
    const store = path.join(directory, "events.json");
    const original = await readFile(store, "utf8");
    const base = JSON.parse(original)[0] as Event;
    const fixtures = Array.from({ length: 7 }, (_, index): Event => ({
      ...base,
      id: `carousel-fixture-${index + 1}`,
      revision: 1,
      title: `Carousel event ${index + 1}`,
      titleMn: `Туршилтын арга хэмжээ ${index + 1}`,
      summary: `Full event summary ${index + 1}.`,
      summaryMn: `${index + 1}-р арга хэмжээний бүрэн мэдээлэл.`,
      date: `2025-${String(12 - index).padStart(2, "0")}-10`,
      status: "ended",
      tags: index === 0 ? ["Community"] : [],
      coverImage: index === 0 ? "/events/halloween-special-ctf-2024.webp" : undefined,
    }));
    const dictionary = dictionaries[locale].events;

    try {
      await writeFile(store, JSON.stringify(fixtures));
      await page.goto(`/events?lang=${locale}`);
      const track = page.locator(".event-preview-track");
      const cards = page.locator(".event-preview");
      await expect(cards).toHaveCount(7);
      const halloweenCover = cards.first().locator(".event-cover img");
      await expect(halloweenCover).toHaveAttribute("src", /halloween-special-ctf-2024/);
      await expect.poll(() => halloweenCover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      const width = page.viewportSize()!.width;
      const visibleCount = width >= 1100 ? 3 : width >= 600 ? 2 : 1;
      const positionText = (first: number) => dictionary.previewPosition
        .replace("{range}", visibleCount === 1 ? String(first + 1) : first + visibleCount >= 7 ? `${first + 1}-${7}` : `${first + 1}-${first + visibleCount}`)
        .replace("{total}", "7");
      await expect(page.locator(".event-archive-position")).toHaveText(positionText(0));
      await page.getByRole("button", { name: dictionary.nextPreview }).click();
      await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await expect(page.locator(".event-archive-position")).toHaveText(positionText(1));

      await track.focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator(".event-archive-position")).toHaveText(positionText(2));
      await page.keyboard.press("End");
      await expect(page.locator(".event-archive-position")).toHaveText(positionText(7 - visibleCount));
      await expect(page.getByRole("button", { name: dictionary.nextPreview })).toBeDisabled();
      await page.keyboard.press("Home");
      await expect(page.locator(".event-archive-position")).toHaveText(positionText(0));
      if (isMobile) {
        await track.scrollIntoViewIfNeeded();
        const bounds = await track.boundingBox();
        if (!bounds) throw new Error("Event preview track is not visible.");
        const cdp = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width * 0.75;
        const y = bounds.y + bounds.height / 2;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 140, y, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect(page.locator(".event-archive-position")).not.toHaveText(positionText(0));
        await cdp.detach();
        await page.getByRole("button", { name: dictionary.previousPreview }).click();
        await expect(page.locator(".event-archive-position")).toHaveText(positionText(0));
      }

      await page.locator(".event-preview-open").first().click();
      const dialog = page.locator(".event-details-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(fixtures[0][locale === "en" ? "summary" : "summaryMn"])).toBeVisible();
      await expect(dialog.getByRole("list", { name: dictionary.tagsLabel })).toContainText(
        locale === "en" ? "Community" : "Клубын хамт олон",
      );
      await expect(dialog.getByRole("button", { name: dictionary.closeDetails })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(page.locator(".event-preview-open").first()).toBeFocused();
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);

      await writeFile(store, JSON.stringify(fixtures.slice(0, 1)));
      await page.goto(`/events?lang=${locale}`);
      await expect(page.locator(".event-preview")).toHaveCount(1);
      await expect(page.locator(".event-archive-position")).toHaveText(dictionary.previewPosition.replace("{range}", "1").replace("{total}", "1"));
      await expect(page.locator(".event-archive-controls")).toHaveCount(0);
      await page.locator(".event-preview-open").click();
      await expect(page.locator(".event-details-dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(".event-details-dialog")).not.toBeVisible();
    } finally {
      await writeFile(store, original);
    }
  });
}
