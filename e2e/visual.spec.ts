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

test("track select screen", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForSelector("[data-screen-name='title']");
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot("track-select.png", {
    maxDiffPixelRatio: 0.05,
  });
});

test("car select screen", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForSelector("[data-screen-name='title']");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot("car-select.png", {
    maxDiffPixelRatio: 0.05,
  });
});

test("paused overlay appears during race", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForSelector("[data-screen-name='title']");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.waitForTimeout(4000);
  await page.keyboard.press("KeyP");
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot("paused.png", { maxDiffPixelRatio: 0.1 });
});
