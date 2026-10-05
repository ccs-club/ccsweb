import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dictionaries } from "../../src/app/i18n";

function contrast(foreground: number[], background: number[]) {
  function luminance(rgb: number[]) {
    return rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  }
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const route of ["events", "admin"] as const) {
  for (const locale of ["en", "mn"] as const) {
    test(`${route} error retries server data in ${locale}`, async ({ page }) => {
      const directory = process.env.CCS_TEST_DIRECTORY;
      if (!directory) throw new Error("Playwright test-store directory is missing.");
      const store = path.join(directory, "events.json");
      const saved = await readFile(store, "utf8");
      const t = dictionaries[locale][route];
      if (route === "admin") {
        await page.goto(`/admin?lang=${locale}`);
        await page.locator("#admin-password").fill("test-only-admin-password");
        await page.locator(".admin-login-form button").click();
        await expect(page.locator("#event-title")).toBeVisible();
      }
      try {
        await writeFile(store, "{invalid");
        await page.goto(`/${route}?lang=${locale}`);
        await expect(page.locator(".events-state h1")).toHaveText(t.errorTitle);
        await writeFile(store, saved);
        const request = page.waitForRequest((request) =>
          new URL(request.url()).pathname === `/${route}` && request.resourceType() === "fetch",
        );
        await page.getByRole("button", { name: t.tryAgain, exact: true }).click();
        await request;
        await expect(page.locator(".events-state")).toHaveCount(0);
        if (route === "admin") await expect(page.locator("#event-title")).toBeVisible();
        else await expect(page.locator(".event-card")).toHaveCount(JSON.parse(saved).length);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
      } finally {
        await writeFile(store, saved);
      }
    });
  }
}

test("public hero headings keep their longest word inside the reading column", async ({ page }) => {
  const heroes = [
    ["/", ".hero h1"],
    ["/about", ".page-hero h1"],
    ["/events", ".events-hero h1"],
    ["/gallery", ".gallery-heading-page h1"],
    ["/posts", ".posts-hero h1"],
  ] as const;
  for (const width of [240, 260, 280, 300, 320, 360, 390, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    for (const locale of ["en", "mn"]) {
      for (const [route, selector] of heroes) {
        await page.goto(`${route}?lang=${locale}`);
        await page.evaluate(() => document.fonts.ready);
        const escaped = await page.locator(selector).evaluate((heading) => {
          const box = heading.getBoundingClientRect();
          const worst = { overflow: 0, word: "" };
          const measure = (text: string) => {
            for (const node of heading.childNodes) {
              if (node.nodeType !== 3) continue;
              const index = (node.textContent || "").indexOf(text);
              if (index === -1) continue;
              const range = document.createRange();
              range.setStart(node, index);
              range.setEnd(node, index + text.length);
              for (const rect of range.getClientRects()) {
                const overflow = Math.max(rect.right - box.right, box.left - rect.left, rect.right - window.innerWidth);
                if (overflow > worst.overflow) Object.assign(worst, { overflow, word: text });
              }
            }
          };
          for (const node of heading.childNodes) {
            if (node.nodeType === 3 && node.textContent?.trim()) measure(node.textContent.trim());
          }
          for (const span of heading.querySelectorAll("span")) measure(span.textContent || "");
          return worst;
        });
        expect(escaped.overflow, `${route} ${locale} ${width}px: "${escaped.word}"`).toBeLessThanOrEqual(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      }
    }
  }
});

test("the header wordmark never overlaps the language control", async ({ page }) => {
  for (const width of [240, 250, 280, 320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const locale of ["en", "mn"]) {
      await page.goto(`/?lang=${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const paint = (element: Element | null) => {
          if (!element) return null;
          let right = -Infinity;
          for (const node of element.childNodes) {
            if (node.nodeType !== 3 || !node.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
          }
          return Number.isFinite(right) ? right : null;
        };
        const wordmark = document.querySelector(".brand-copy strong");
        const language = document.querySelector(".locale-toggle button");
        const wordmarkRight = paint(wordmark);
        const languageRight = paint(language);
        const menu = document.querySelector("details.mobile-nav summary")!.getBoundingClientRect();
        return {
          overlap: wordmarkRight === null || languageRight === null ? null : wordmarkRight - languageRight,
          wordmarkHidden: !wordmark || getComputedStyle(wordmark.parentElement!).display === "none",
          menuRight: menu.right,
          menuHeight: menu.height,
          viewport: window.innerWidth,
        };
      });
      if (geometry.wordmarkHidden) expect(geometry.overlap).toBeNull();
      else expect(geometry.overlap, `${locale} ${width}px`).toBeLessThanOrEqual(0);
      expect(geometry.menuRight, `${locale} ${width}px`).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.menuHeight).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    }
  }
});

test("admin metadata never renders below 12px", async ({ page }) => {
  await page.goto("/admin");
  await page.locator("#admin-password").fill("test-only-admin-password");
  await page.locator(".admin-login-form button").click();
  await expect(page.locator("#event-title")).toBeVisible();
  for (const locale of ["en", "mn"]) {
    await page.goto(`/admin?lang=${locale}`);
    await page.locator(".admin-event-select").first().click();
    await page.locator(".admin-optional-fields summary").click();
    const undersized = await page.evaluate(() => {
      const found: { size: number; className: string; text: string }[] = [];
      for (const element of document.querySelectorAll("main *")) {
        if (element.classList.contains("sr-only")) continue;
        const hasText = [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent?.trim());
        if (!hasText) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const size = parseFloat(getComputedStyle(element).fontSize);
        if (size < 12) found.push({ size, className: element.className, text: (element.textContent || "").trim().slice(0, 24) });
      }
      return found;
    });
    expect(undersized, `${locale}: ${JSON.stringify(undersized)}`).toEqual([]);
  }
});

test("the events hero states the exact archive count", async ({ page }) => {
  for (const locale of ["en", "mn"]) {
    await page.goto(`/events?lang=${locale}`);
    await expect(page.locator(".event-preview-track")).toBeVisible();
    const counts = {
      hero: (await page.locator(".events-stats strong").first().textContent())?.trim(),
      filter: (await page.locator(".year-grid button .year-count").first().textContent())?.trim(),
      cards: await page.locator(".event-preview").count(),
    };
    expect(counts.hero, locale).toBe(String(counts.cards));
    expect(counts.hero, locale).toBe(counts.filter);
    expect(counts.hero, locale).not.toContain("+");
  }
});

test("mobile navigation keeps a visible label at narrow widths", async ({ page }) => {
  for (const [locale, label] of [["en", "Menu"], ["mn", "Цэс"]] as const) {
    for (const width of [280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/?lang=${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const menu = page.locator(".mobile-nav");
      const summary = menu.locator("summary");
      await expect(menu).toBeVisible();
      await expect(summary.locator(".mobile-menu-label")).toBeVisible();
      await expect(summary.locator(".mobile-menu-label")).toHaveText(label);
      const size = await summary.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      await summary.click();
      await expect(menu.locator(".mobile-nav-panel")).toBeVisible();
      await summary.click();
    }
  }
});

test("footer social links reflow before labels clip at 280px", async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 844 });
  for (const locale of ["en", "mn"]) {
    await page.goto(`/posts?lang=${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const links = page.locator(".site-footer:visible .footer-social-links a");
    await expect(links).toHaveCount(5);
    const dimensions = await links.evaluateAll((elements) => elements.map((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      height: element.getBoundingClientRect().height,
    })));
    for (const item of dimensions) {
      expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
      expect(item.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
});

test("home hero compacts before shallow desktop clipping", async ({ page }) => {
  for (const locale of ["en", "mn"]) {
    await page.setViewportSize({ width: 1366, height: 570 });
    await page.goto(`/?lang=${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const escapedText = await page.locator(".hero").evaluate((hero) => {
      const bounds = hero.getBoundingClientRect();
      const escaped: string[] = [];
      const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width > 0 && rect.height > 0 && (rect.top < bounds.top || rect.bottom > bounds.bottom)) {
            escaped.push(node.textContent.trim());
          }
        }
      }
      return escaped;
    });
    expect(escapedText).toEqual([]);
    await expect(page.locator(".hero-description")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBeTruthy();
  }
});

test("home facts are complete statements in both languages", async ({ page }) => {
  for (const [locale, expected] of [
    ["en", ["Founded in 2019.", "38 members in Spring 2025-26.", "120+ CTF competitors."]],
    ["mn", ["2019 онд байгуулагдсан.", "2025-2026 оны хавар 38 гишүүнтэй.", "CTF тэмцээнд 120+ оролцогчтой."]],
  ] as const) {
    await page.setViewportSize({ width: 280, height: 844 });
    await page.goto(`/?lang=${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const facts = page.locator(".hero-facts li");
    await expect(facts).toHaveText(expected);
    expect(await facts.evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth))).toBeTruthy();
  }
});

test("hero facts remain readable over the animated shield", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [[312, 667], [740, 360], [1366, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/?lang=mn");
    await expect(page.locator("html")).toHaveAttribute("lang", "mn");
    await page.evaluate(() => document.fonts.ready);
    const labels = await page.locator(".hero-facts li").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent,
          color: getComputedStyle(element).color.match(/[\d.]+/g)!.map(Number).slice(0, 3),
          x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        };
      }),
    );
    await expect(page.locator(".hero-facts li").first()).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".hero-facts li").first()).toHaveCSS(
      "color",
      await page.locator(".hero-description").evaluate((element) => getComputedStyle(element).color),
    );
    await page.addStyleTag({ content: ".hero-facts li, .hero-facts strong { color: transparent !important; }" });
    await expect(page.locator(".hero-facts li").first()).toHaveCSS("color", "rgba(0, 0, 0, 0)");
    const screenshot = await page.screenshot();
    const settledLabels = await page.locator(".hero-facts li").evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    const image = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const [index, item] of labels.entries()) {
      const label = { ...item, ...settledLabels[index] };
      expect(label.y).toBeGreaterThanOrEqual(64);
      expect(label.y + label.height).toBeLessThanOrEqual(height);
      let worst = 21;
      let worstPixel: number[] = [];
      for (let y = Math.ceil(label.y + 2); y < Math.floor(label.y + label.height - 2); y++) {
        for (let x = Math.ceil(label.x + 2); x < Math.floor(label.x + label.width - 2); x++) {
          const offset = (y * image.info.width + x) * image.info.channels;
          const rgb = [...image.data.subarray(offset, offset + 3)];
          const ratio = contrast(label.color, rgb);
          if (ratio < worst) {
            worst = ratio;
            worstPixel = [x, y, ...rgb];
          }
        }
      }
      if (worst < 4.5) await testInfo.attach(`facts-background-${width}`, { body: screenshot, contentType: "image/png" });
      expect(worst, `${width}px: ${label.text}, foreground ${label.color}, pixel ${worstPixel}, image ${image.info.width}x${image.info.height}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("inactive archive counts meet AA contrast", async ({ page }) => {
  for (const locale of ["en", "mn"]) {
    await page.goto(`/events?lang=${locale}`);
    const pairs = await page.locator(".year-grid button:not(.is-active) .year-count").evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        const foreground = style.color.match(/[\d.]+/g)!.map(Number).slice(0, 3);
        const background = getComputedStyle(element.closest("button")!).backgroundColor.match(/[\d.]+/g)!.map(Number).slice(0, 3);
        const opacity = Number(style.opacity);
        return { foreground: foreground.map((value, index) => value * opacity + background[index] * (1 - opacity)), background };
      }),
    );
    expect(pairs.length).toBeGreaterThan(0);
    for (const pair of pairs) expect(contrast(pair.foreground, pair.background)).toBeGreaterThanOrEqual(4.5);
  }
});

test("the lead photograph keeps its full row without empty tile space", async ({ page }) => {
  const viewport = page.viewportSize()!;
  for (const width of [viewport.width, 941, 1024]) {
    await page.setViewportSize({ width, height: viewport.height });
    for (const route of ["about", "gallery"]) {
      for (const locale of ["en", "mn"]) {
        await page.goto(`/${route}?lang=${locale}`);
        await page.evaluate(() => document.fonts.ready);
        const geometry = await page.locator(".gallery-cell-lead").evaluate((lead) => {
          const tile = lead.querySelector(".gallery-tile")!;
          return {
            leadWidth: lead.getBoundingClientRect().width,
            gridWidth: lead.parentElement!.getBoundingClientRect().width,
            unusedHeight: tile.getBoundingClientRect().height
              - tile.querySelector("img")!.getBoundingClientRect().height
              - tile.querySelector(".gallery-tile-caption")!.getBoundingClientRect().height,
          };
        });
        expect(Math.abs(geometry.leadWidth - geometry.gridWidth)).toBeLessThan(1);
        expect(geometry.unusedHeight).toBeLessThanOrEqual(2.1);
        if (width > 640 && route === "gallery") {
          const supporting = await page.locator(".gallery-cell:not(.gallery-cell-lead)").evaluateAll((cells) =>
            cells.slice(0, 2).map((cell) => cell.getBoundingClientRect().top),
          );
          expect(Math.abs(supporting[0] - supporting[1])).toBeLessThan(1);
        }
      }
    }
  }
});

test("narrow programme descriptions use the full reading column", async ({ page }) => {
  for (const width of [312, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const locale of ["en", "mn"]) {
      await page.goto(`/about?lang=${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const cards = await page.locator(".program-card").evaluateAll((elements) => elements.map((card) => {
        const copy = card.querySelector(".program-copy")!.getBoundingClientRect();
        const arrow = card.querySelector(".program-arrow")?.getBoundingClientRect();
        const heading = card.querySelector("h3")!;
        return {
          width: copy.width,
          unusedWidth: card.getBoundingClientRect().width - copy.width,
          arrowBottom: arrow?.bottom,
          copyTop: copy.top,
          headingHeight: heading.getBoundingClientRect().height,
          headingLineHeight: parseFloat(getComputedStyle(heading).lineHeight),
        };
      }));
      for (const card of cards) {
        expect(card.width).toBeGreaterThanOrEqual(220);
        expect(card.unusedWidth).toBeLessThanOrEqual(42);
        expect(card.headingHeight).toBeLessThanOrEqual(card.headingLineHeight + 1);
        if (card.arrowBottom !== undefined) expect(card.arrowBottom).toBeLessThanOrEqual(card.copyTop);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  }
});

test("admin controls have 44px targets and dark native form controls", async ({ page }) => {
  await page.goto("/admin");
  await page.locator("#admin-password").fill("test-only-admin-password");
  await page.locator(".admin-login-form button").click();
  await expect(page.locator("#event-title")).toBeVisible();
  await expect(page.locator(".admin-facebook-post")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Refresh published posts", exact: true })).toBeDisabled();
  for (const locale of ["en", "mn"]) {
    await page.goto(`/admin?lang=${locale}`);
    await page.locator(".admin-event-select").first().click();
    await page.locator(".admin-optional-fields summary").click();
    const targets = await page.locator("main button:visible, main input:visible:not([type=checkbox]), main select:visible, main textarea:visible, main summary:visible, .checkbox-field").evaluateAll((elements) =>
      elements.map((element) => ({
        name: element.id || element.className,
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
    );
    for (const target of targets) {
      expect(target.width, target.name).toBeGreaterThanOrEqual(44);
      expect(target.height, target.name).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator("#event-date")).toHaveCSS("color-scheme", "dark");
    await expect(page.locator("#event-end-date")).toHaveCSS("color-scheme", "dark");
    await page.locator("#event-date").focus();
    await expect(page.locator("#event-date")).toHaveCSS("outline-style", "solid");
  }
});

test("About keeps a single-photo preview and its compact content budget", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const locale of ["en", "mn"] as const) {
    await page.goto(`/about?lang=${locale}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".gallery-tile")).toHaveCount(1);
    await expect(page.locator(".gallery-tile img")).toHaveAttribute("alt", dictionaries[locale].gallery.items["mnsec-2026"].alt);
    await expect(page.locator(".gallery-total")).toHaveText(dictionaries[locale].gallery.subset.replace("{shown}", "1").replace("{total}", "18"));
    await page.locator(".gallery-tile").click();
    await expect(page.locator(".gallery-viewer")).toBeVisible();
    await expect(page.locator(".gallery-viewer-controls button")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator(".gallery-viewer")).not.toBeVisible();
    await expect(page.locator(".program-card")).toHaveCount(3);
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
    expect(dimensions.width).toBe(1366);
    expect(dimensions.height).toBeLessThanOrEqual(3100);
  }
});

test("public pages use charcoal layers and static shield headers", async ({ page }) => {
  for (const route of ["about", "gallery", "events", "posts"] as const) {
    for (const locale of ["en", "mn"] as const) {
      await page.goto(`/${route}?lang=${locale}`);
      const root = page.locator(".public-page");
      await expect(root).toHaveCSS("--surface", "#161616");
      if (route === "about") {
        await expect(page.locator(".about-details p").first()).toHaveCSS("font-size", "16px");
        await expect(page.locator(".join-inner h2")).toHaveAttribute(
          "aria-label",
          `${dictionaries[locale].join.titleLine1} ${dictionaries[locale].join.titleAccent}`,
        );
        await expect(page.locator(".join-inner > p")).toHaveText(dictionaries[locale].join.body);
      } else if (route === "gallery") {
        await expect(page.locator(".gallery-heading-page > p")).toHaveCSS("font-size", "17px");
        await expect(page.locator(".gallery-tile-caption").first()).toHaveCSS("font-size", "13px");
      } else if (route === "events") {
        await expect(page.locator(".events-hero > p")).toHaveCSS("font-size", "17px");
        await expect(page.locator(".year-grid button").first()).toHaveCSS("font-size", "13px");
        await expect(page.locator(".event-preview-open").first()).toHaveCSS("font-size", "13.5px");
      } else {
        await expect(page.locator(".posts-hero > p")).toHaveCSS("font-size", "17px");
        await expect(page.locator(".facebook-post-message").first()).toHaveCSS("font-size", "13px");
      }
      await expect(root).toHaveCSS("--surface-2", "#202020");
      await expect(root).toHaveCSS("--fg-4", "#949494");
      const header = page.locator(".page-hero, .events-hero, .posts-hero, .gallery-heading-page");
      const motif = await header.evaluate((element) => {
        const style = getComputedStyle(element, "::after");
        return { mask: style.maskImage, opacity: style.opacity, animation: style.animationName, pointerEvents: style.pointerEvents };
      });
      expect(motif.mask).toContain("ccs-logo.png");
      expect(motif.mask).toContain("repeating-linear-gradient");
      expect(motif.opacity).toBe("0.5");
      expect(motif.animation).toBe("none");
      expect(motif.pointerEvents).toBe("none");
      const screenshot = await page.screenshot({ fullPage: true });
      expect((await sharp(screenshot).metadata()).width).toBe(page.viewportSize()!.width);
      for (const background of [[16, 16, 16], [22, 22, 22], [32, 32, 32], [38, 38, 38]]) {
        expect(contrast([148, 148, 148], background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast([112, 112, 112], background)).toBeGreaterThanOrEqual(3);
      }
      if (route === "events") {
        const filter = page.locator(".year-grid button").last();
        await filter.click();
        await expect(filter).toHaveAttribute("aria-pressed", "true");
        await expect(filter).toHaveCSS("background-color", "rgb(38, 38, 38)");
        await expect(filter).toHaveCSS("border-bottom-color", "rgb(0, 201, 80)");
        await expect(page.locator(".event-card").first()).toHaveCSS("background-color", "rgb(22, 22, 22)");
      } else if (route === "posts") {
        await expect(page.locator(".facebook-post-card").first()).toHaveCSS("background-color", "rgb(22, 22, 22)");
        const bandState = await page.evaluate(() => {
          const section = document.querySelector(".posts-section");
          if (!section) throw new Error("Selected posts section is missing.");
          return getComputedStyle(section, "::before").display;
        });
        expect(bandState).toBe("none");
      } else {
        await expect(page.locator(".gallery-tile").first()).toHaveCSS("background-color", "rgb(32, 32, 32)");
      }
    }
  }
  for (const route of ["/", "/admin"]) {
    await page.goto(route);
    await expect(page.locator(".public-page")).toHaveCount(0);
    await expect(page.locator("html")).toHaveCSS("--surface", "#141414");
  }
});
