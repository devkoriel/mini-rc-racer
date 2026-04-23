import { expect, test } from "@playwright/test";

test("sustained frame time under 20ms p99 over 3 seconds in race", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("[data-screen-name='title']");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.waitForTimeout(4000); // let countdown finish

  const samples: number[] = await page.evaluate(() => {
    return new Promise<number[]>((resolve) => {
      const out: number[] = [];
      let previous = performance.now();
      let frames = 0;
      const tick = (now: number) => {
        if (frames > 0) out.push(now - previous);
        previous = now;
        frames += 1;
        if (frames >= 180) resolve(out);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });

  samples.sort((a, b) => a - b);
  const p99 = samples[Math.floor(samples.length * 0.99)];
  const p50 = samples[Math.floor(samples.length * 0.5)];
  console.log(
    `[perf] p50=${p50.toFixed(2)}ms p99=${p99.toFixed(2)}ms frames=${samples.length}`
  );
  expect(p99).toBeLessThan(20);
});
