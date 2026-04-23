import { expect, test } from "@playwright/test";

test("menu → race flow accelerates the car", async ({ page }) => {
  await page.goto("/");

  // Title screen visible first
  await expect(page.locator("[data-screen-name='title']")).toBeVisible();

  // Space x3 to walk through title → track-select → car-select → race
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");

  // Race screen should now be the active one
  await expect(page.locator(".screens")).toHaveAttribute("data-screen", "race");

  // Wait for race to leave grid state (countdown → running). The overlay panel's data-variant should become "countdown" then eventually hidden.
  await page.waitForTimeout(4000);

  // Drive forward for ~3 seconds
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(3000);
  await page.keyboard.up("KeyW");

  // Speed should be > 5 km/h after throttling
  const speedText = await page.locator("#speed-value").textContent();
  expect(speedText).not.toBeNull();
  const kmh = parseInt(speedText ?? "0", 10);
  expect(kmh).toBeGreaterThan(5);
});
