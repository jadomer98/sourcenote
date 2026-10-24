import { test, expect } from '@playwright/test';

test('dark tools retain five readable accent families', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The same color tokens are checked once on desktop.');
  await page.goto('/');
  await page.getByRole('button', { name: /Beispiel erkunden/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Projekt Morgenlicht', exact: true }),
  ).toBeVisible();
  const colors = await page.locator('.studio-tool').evaluateAll((tools) =>
    tools.map((tool) => ({
      foreground: getComputedStyle(tool.querySelector('.tool-icon')!).color,
      label: getComputedStyle(tool.querySelector('strong')!).color,
      background: getComputedStyle(tool).backgroundColor,
    })),
  );
  expect(new Set(colors.map((c) => c.foreground)).size).toBe(5);
  const luminance = (color: string) =>
    color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((c) => {
        const n = c / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      })
      .reduce((n, c, i) => n + c * [0.2126, 0.7152, 0.0722][i], 0);
  for (const color of colors) {
    const a = luminance(color.foreground),
      b = luminance(color.background);
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
    const label = luminance(color.label);
    expect((Math.max(label, b) + 0.05) / (Math.min(label, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});

test('panels resize, focus, close, reopen and persist without losing a draft', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Beispiel erkunden/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Projekt Morgenlicht', exact: true }),
  ).toBeVisible();
  const draft = page.getByLabel('Frage an deine Quellen');
  await draft.fill('Mein Entwurf bleibt beim Ändern der Ansicht erhalten.');
  if (!isMobile) {
    const sources = page.locator('.sources-panel');
    const initial = (await sources.boundingBox())!.width;
    const divider = page.getByRole('separator', {
      name: 'Breite zwischen Quellen und Chat ändern',
    });
    const box = (await divider.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    const resized = (await sources.boundingBox())!.width;
    expect(resized).toBeGreaterThan(initial + 35);
    await page.reload();
    await expect.poll(async () => (await sources.boundingBox())?.width).toBeCloseTo(resized, 0);
    await draft.fill('Mein Entwurf bleibt beim Ändern der Ansicht erhalten.');
    await divider.focus();
    await page.keyboard.press('ArrowLeft');
    expect((await sources.boundingBox())!.width).toBeLessThan(resized - 10);
    await page.getByRole('button', { name: 'Chat fokussieren', exact: true }).click();
    await expect(sources).not.toBeVisible();
    await expect(page.locator('.studio-panel')).not.toBeVisible();
    await expect(draft).toHaveValue(/Mein Entwurf/);
    await page.getByRole('button', { name: 'Mehrere Bereiche zeigen', exact: true }).click();
    await expect(sources).toBeVisible();
  }
  await page.getByRole('button', { name: 'Chat schließen', exact: true }).click();
  await expect(page.locator('.chat-panel')).not.toBeVisible();
  if (isMobile) await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  else await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(draft).toHaveValue(/Mein Entwurf/);
  for (const name of ['Quellen', 'Chat', 'Studio']) {
    if (isMobile) await page.getByRole('tab', { name, exact: true }).click();
    await page.getByRole('button', { name: name + ' schließen', exact: true }).click();
  }
  await expect(page.getByText('Platz für deine Gedanken.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Platz für deine Gedanken.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bereiche wieder öffnen', exact: true }).click();
  await expect(page.locator('.chat-panel')).toBeVisible();
  if (!isMobile)
    await page.getByRole('button', { name: 'Layout zurücksetzen', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('sidebar collapses, resizes and keeps navigation usable', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Gute Gedanken/ })).toBeVisible();
  if (isMobile) {
    await page.getByRole('button', { name: 'Navigation öffnen', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Hauptnavigation' })).toBeVisible();
    await page.getByRole('button', { name: 'Navigationsmenü schließen' }).click();
    await expect(page.getByRole('complementary', { name: 'Hauptnavigation' })).not.toBeVisible();
    return;
  }
  const nav = page.getByRole('complementary', { name: 'Hauptnavigation' });
  await page.getByRole('button', { name: 'Navigation ausklappen', exact: true }).click();
  await page.getByRole('button', { name: 'Navigation einklappen', exact: true }).click();
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(68);
  await nav.getByRole('button', { name: 'Nutzung & Limits', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.reload();
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(68);
  await page.getByRole('button', { name: 'Navigation ausklappen', exact: true }).click();
  const splitter = page.getByRole('separator', { name: 'Navigationsbreite ändern' });
  await splitter.focus();
  await page.keyboard.press('End');
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(340);
  await splitter.press('Home');
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(176);
  await splitter.dblclick();
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(224);
});

test('intermediate desktop widths stay on screen with expanded and compact navigation', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop breakpoint matrix; mobile workflows are tested separately.');
  await page.goto('/');
  await page.getByRole('button', { name: /Beispiel erkunden/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Projekt Morgenlicht', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Navigation ausklappen', exact: true }).click();
  for (const width of [801, 900, 1024, 1280, 1600, 1920]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(page.locator('.chat-panel')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'overflow at ' + width,
    ).toBe(true);
  }
  await page.getByRole('button', { name: 'Navigation einklappen', exact: true }).click();
  await page.setViewportSize({ width: 900, height: 960 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'docs/screenshots/flexible-workspace-compact.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Studio fokussieren' }).click();
  await page.screenshot({ path: 'docs/screenshots/flexible-studio-focused.png', fullPage: true });
});
