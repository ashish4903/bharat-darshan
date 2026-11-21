import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, stubExternal } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await stubExternal(page);
});

test("home introduces the guide and lists live states", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Discover India/ })).toBeVisible();
  await expect(page.locator(".state-card").first()).toBeVisible();
  await expect(page.locator(".tile-live .tile")).toHaveCount(
    await page.locator(".state-grid .state-card").count(),
  );
  await expectNoHorizontalScroll(page, expect);
});

test("a state's tabs all render without horizontal scrolling", async ({ page }) => {
  await page.goto("/#/state/goa");
  await expect(page.getByRole("heading", { level: 1, name: /Goa/ })).toBeVisible();
  for (const tab of ["Places", "Food", "Practical", "Map", "Overview"]) {
    await page.getByRole("navigation", { name: "Goa sections" }).getByRole("link", { name: tab }).click();
    await expect(
      page.getByRole("navigation", { name: "Goa sections" }).getByRole("link", { name: tab }),
    ).toHaveAttribute("aria-current", "page");
    await expectNoHorizontalScroll(page, expect);
  }
});

test("place filters are reflected in the address and the results", async ({ page }) => {
  await page.goto("/#/state/goa/places");
  const heading = page.locator("#places-heading");
  const before = await heading.textContent();
  const isNarrow = (page.viewportSize()?.width ?? 1440) <= 1024;
  if (isNarrow) await page.getByRole("button", { name: /Filters/ }).click();
  await page.locator(".filters .chip-category").first().click();
  await expect(page).toHaveURL(/cat=/);
  await expect(heading).not.toHaveText(before ?? "");
  if (isNarrow) await page.getByRole("button", { name: "Close filters" }).first().click();
  await page.locator(".place-card").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Source:/ })).toBeVisible();
});

test("search finds places across states", async ({ page }) => {
  await page.goto("/#/search");
  await page.getByRole("searchbox").fill("fort");
  await expect(page.locator(".search-result").first()).toBeVisible();
  await page.locator(".search-result").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the map tab draws a map", async ({ page }) => {
  await page.goto("/#/state/goa/map");
  await expect(page.locator(".maplibregl-canvas, .map-fallback")).toBeVisible();
});

const PAGES = [
  "/",
  "/#/state/goa",
  "/#/state/goa/places",
  "/#/state/goa/food",
  "/#/state/goa/practical",
  "/#/search?q=temple",
  "/#/about",
  "/#/states",
];

for (const colorScheme of ["light", "dark"]) {
  test(`has no detectable WCAG 2.2 A/AA violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .exclude(".maplibregl-canvas")
        .analyze();
      const summary = results.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.slice(0, 4).map((node) => node.target.join(" ")),
      }));
      expect(summary, `${path} (${colorScheme})`).toEqual([]);
    }
  });
}
