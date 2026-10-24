import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test('Studio tools: cards, scored quiz, mindmap, report, CSV and usage on desktop/mobile', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Beispiel erkunden/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Projekt Morgenlicht', exact: true }),
  ).toBeVisible();
  if (isMobile) await page.getByRole('tab', { name: 'Studio', exact: true }).click();
  await page.getByRole('button', { name: /Lernkarten Wissen aufdecken/ }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Karte 1 von 4', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Antwort aufdecken' }).click();
  await expect(dialog.getByRole('button', { name: /Beleg 1/ }).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Als gelernt markieren' }).click();
  await expect(dialog.getByText('1 gelernt', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Nächste Karte', exact: true }).click();
  await expect(dialog.getByText('Karte 2 von 4', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: /Wissenscheck Drei Fragen/ }).click();
  dialog = page.getByRole('dialog');
  for (let i = 0; i < 3; i++) {
    await dialog.locator('.quiz-option').first().click();
    await expect(dialog.getByText('Richtig!', { exact: true })).toBeVisible();
    if (i < 2) await dialog.getByRole('button', { name: 'Nächste Frage' }).click();
  }
  await expect(dialog.getByText('3 von 3 richtig', { exact: true })).toBeVisible();
  await page.reload();
  if (isMobile) await page.getByRole('tab', { name: 'Studio', exact: true }).click();
  await page.locator('.artifact-card').filter({ hasText: 'Wissenscheck' }).click();
  await expect(
    page.getByRole('dialog').getByText('3 von 3 richtig', { exact: true }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Quiz neu starten' }).click();
  await expect(page.getByRole('dialog').locator('.quiz-option').first()).toBeEnabled();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: /Mindmap Zusammenhänge/ }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.locator('.mind-node')).toHaveCount(4);
  await dialog.locator('.mind-label').first().click();
  await expect(dialog.locator('.mind-node')).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Alle aufklappen' }).click();
  const svgDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'SVG exportieren' }).click();
  const svg = await readFile((await (await svgDownload).path())!, 'utf8');
  expect(svg).toContain('<svg');
  expect(svg).toContain('Quellen:');
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: /Bericht Ein Briefing/ }).click();
  await expect(page.getByRole('dialog').locator('.report-content')).toBeVisible();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: /Datentabelle Fakten ordnen/ }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('table')).toBeVisible();
  const csvDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'CSV exportieren' }).click();
  const csv = await readFile((await (await csvDownload).path())!, 'utf8');
  expect(csv).toContain('Quellen');
  expect(csv).toContain('Projektplan');
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Nutzung und Limits öffnen' }).click();
  await expect(
    page.getByRole('dialog').getByText('Gemessene Tokens heute', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('500');
  const usage = await (await page.request.get('/api/usage')).json();
  expect(usage.today.measured).toBe(500);
  expect(usage.scope).toBe('workspace');
  expect(usage.providerSnapshot).toBeNull();
  const boot = await (await page.request.get('/api/bootstrap')).json();
  expect(
    (
      await page.request.post('/api/usage/owner', {
        headers: {
          origin: 'http://localhost:3100',
          'x-csrf-token': boot.csrf,
          'x-usage-token': randomUUID(),
        },
      })
    ).status(),
  ).toBe(403);
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
