import { test, expect } from '@playwright/test';

test('dark workspace gives documents and chat the viewport while tools stay reachable', async ({
  page,
  isMobile,
}) => {
  if (!isMobile) await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: /Beispiel erkunden/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Projekt Morgenlicht', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(16, 16, 16)',
  );
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
    'dark',
  );
  if (!isMobile) {
    await expect(page.getByRole('complementary', { name: 'Hauptnavigation' })).not.toBeVisible();
    expect((await page.locator('.sources-panel').boundingBox())!.height).toBeGreaterThan(600);
    expect((await page.locator('.chat-scroll').boundingBox())!.height).toBeGreaterThan(420);
    expect(await page.locator('.answer-block').count()).toBe(0);
  }
  const composer = page.locator('.composer');
  expect((await composer.boundingBox())!.height).toBeLessThanOrEqual(80);
  const draft = page.getByLabel('Frage an deine Quellen');
  await draft.fill('Eine Frage\nmit mehreren Zeilen\nund weiterem Kontext\nfür meine Dokumente.');
  expect((await composer.boundingBox())!.height).toBeLessThan(155);
  await draft.fill('Wie hoch ist das genehmigte Budget?');
  await page.getByRole('button', { name: 'Frage senden', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Als Notiz speichern', exact: true }),
  ).toBeVisible();
  const font = await page
    .locator('.answer-block')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(font).toBeGreaterThanOrEqual(15);
  if (isMobile) await page.getByRole('tab', { name: 'Studio', exact: true }).click();
  for (const title of ['Bericht', 'Mindmap', 'Datentabelle', 'Lernkarten']) {
    await page
      .locator('.studio-tools-grid')
      .getByRole('button', { name: new RegExp('^' + title + ' ') })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click();
  }
  await expect(page.locator('.artifact-card')).toHaveCount(4);
  const toolsBefore = (await page.locator('.studio-tools-area').boundingBox())!;
  expect(toolsBefore.height).toBeLessThan(260);
  await page.locator('.studio-scroll').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect((await page.locator('.studio-tools-area').boundingBox())!.y).toBe(toolsBefore.y);
  await expect(
    page.locator('.studio-tools-grid').getByRole('button', { name: /^Wissenscheck / }),
  ).toBeInViewport();
  await page.screenshot({
    path: `docs/screenshots/dark-workspace-${isMobile ? 'mobile' : 'laptop'}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Notebook umbenennen' }).click();
  await expect(page.getByRole('dialog')).toContainText('Notebook umbenennen');
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
