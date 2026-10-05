import { expect, test } from "@playwright/test";
import { rename, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { dictionaries } from "../../src/app/i18n";

const longMessage = Array.from(
  { length: 32 },
  (_, index) => `Long selected-post detail ${index + 1}.`,
).join("\n");

async function writeStore(store: string, content: string) {
  const temporary = `${store}.${randomUUID()}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, store);
}

const posts = [
  {
    id: "110700467422954_12345678901234001",
    message: longMessage,
    createdTime: "2026-06-04T08:30:00+0000",
    permalinkUrl: "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234001",
  },
  {
    id: "110700467422954_12345678901234002",
    message: "Information update. #ccs-info",
    createdTime: "2026-06-03T08:30:00+0000",
    permalinkUrl: "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234002",
  },
  {
    id: "110700467422954_12345678901234003",
    message: "A regular selected update.",
    createdTime: "2026-06-02T08:30:00+0000",
    permalinkUrl: "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234003",
  },
  {
    id: "110700467422954_12345678901234004",
    message: "Another information update. #CCS-INFO",
    createdTime: "2026-06-01T08:30:00+0000",
    permalinkUrl: "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234004",
  },
];

for (const locale of ["en", "mn"] as const) {
  test(`Facebook posts browse sideways with compact equal-height cards in ${locale}`, async ({ page, isMobile }) => {
    const directory = process.env.CCS_TEST_DIRECTORY;
    if (!directory) throw new Error("Playwright test-store directory is missing.");
    const store = path.join(directory, "facebook-posts.json");
    const original = await readFile(store, "utf8");
    const dictionary = dictionaries[locale].posts;

    try {
      await writeStore(store, `${JSON.stringify(posts)}\n`);
      await page.goto(`/posts?lang=${locale}`);

      const selected = page.locator(".posts-selected-carousel");
      const selectedTrack = selected.locator(".facebook-post-track");
      const information = page.locator(".posts-info-carousel");

      await expect(selected.locator(".facebook-post-card")).toHaveCount(4);
      await expect(selected.locator(".facebook-post-card").first()).toBeVisible();
      await expect(selectedTrack).toHaveAttribute("aria-label", dictionary.browseSelected);
      await expect(selectedTrack).toHaveCSS("overflow-x", "auto");
      await expect(information.locator(".facebook-post-card")).toHaveCount(2);
      await expect(information).toContainText("#ccs-info");
      await expect(information).toContainText("#CCS-INFO");
      await expect(information).not.toContainText("A regular selected update.");
      const infoBand = await page.locator(".posts-info-section").evaluate((section) => (
        getComputedStyle(section, "::before").display
      ));
      expect(infoBand).toBe("none");

      const controls = selected.locator(".facebook-post-carousel-controls button");
      await expect(controls).toHaveCount(2);
      const targetSizes = await controls.evaluateAll((buttons) => buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }));
      targetSizes.forEach(({ width, height }) => {
        expect(width).toBeGreaterThanOrEqual(44);
        expect(height).toBeGreaterThanOrEqual(44);
      });

      const heights = await selected.locator(".facebook-post-card").evaluateAll((cards) => (
        cards.map((card) => card.getBoundingClientRect().height)
      ));
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
      const messageSize = await selected.locator(".facebook-post-message").first().evaluate((message) => ({
        clientHeight: message.clientHeight,
        scrollHeight: message.scrollHeight,
      }));
      expect(messageSize.scrollHeight).toBeGreaterThan(messageSize.clientHeight);

      const next = selected.getByRole("button", { name: dictionary.nextSelected });
      await expect(next).toBeEnabled();
      await next.click();
      await expect.poll(() => selectedTrack.evaluate((track) => track.scrollLeft)).toBeGreaterThan(100);

      await selectedTrack.focus();
      await page.keyboard.press("Home");
      await expect.poll(() => selectedTrack.evaluate((track) => track.scrollLeft)).toBeLessThan(40);
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => selectedTrack.evaluate((track) => track.scrollLeft)).toBeGreaterThan(100);

      if (isMobile) {
        await page.keyboard.press("Home");
        await expect.poll(() => selectedTrack.evaluate((track) => track.scrollLeft)).toBeLessThan(40);
        await selectedTrack.scrollIntoViewIfNeeded();
        const bounds = await selectedTrack.boundingBox();
        if (!bounds) throw new Error("Facebook post track is not visible.");
        const cdp = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width * 0.75;
        const y = bounds.y + bounds.height / 2;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 140, y, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect.poll(() => selectedTrack.evaluate((track) => track.scrollLeft)).toBeGreaterThan(100);
        await cdp.detach();
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    } finally {
      await writeStore(store, original);
    }
  });
}
