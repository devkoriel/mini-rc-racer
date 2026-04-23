import { expect, test } from "@playwright/test";

test("title screen screenshot matches baseline", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForSelector("[data-screen-name='title']");
  // Let fonts + any fade animations settle
  await page.waitForTimeout(1500);
  await expect(page).toHaveScreenshot("title.png", { maxDiffPixelRatio: 0.05 });
});

test("grid overlay screenshot (first frame of race)", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForSelector("[data-screen-name='title']");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.waitForTimeout(2000);
  await expect(page).toHaveScreenshot("grid.png", { maxDiffPixelRatio: 0.1 });
});
