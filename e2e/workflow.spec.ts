import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
test('real UI: upload → question → citation → note → summary → reload → deletion', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Gute Gedanken/ })).toBeVisible();
  await page.getByRole('button', { name: 'Notebook erstellen', exact: true }).first().click();
  await page.getByLabel('Notebook-Titel').fill('Recherche ' + randomUUID().slice(0, 6));
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Notebook erstellen', exact: true })
    .click();
  if (isMobile) await page.getByRole('tab', { name: 'Quellen' }).click();
  await page.getByRole('button', { name: 'Quellen hinzufügen', exact: true }).click();
  await page.getByRole('button', { name: 'Text einfügen', exact: true }).click();
  await page.getByLabel('Titel', { exact: true }).fill('Projektplan');
  await page
    .getByLabel('Dein Text')
    .fill(
      'Projekt Morgenlicht startet am 1. November 2026. Das genehmigte Budget beträgt 5.000 Euro. Mira Keller übernimmt die Leitung.',
    );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Quelle hinzufügen', exact: true })
    .click();
  await expect(page.getByRole('button', { name: /Projektplan Text/ })).toBeVisible();
  if (isMobile) await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.getByLabel('Frage an deine Quellen').fill('Wie hoch ist das Budget?');
  await page.getByRole('button', { name: 'Frage senden', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Als Notiz speichern', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Beleg 1 aus Projektplan/ })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toContainText('5.000 Euro');
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Als Notiz speichern', exact: true }).click();
  if (isMobile) await page.getByRole('tab', { name: 'Studio', exact: true }).click();
  await expect(page.getByRole('button', { name: /Gespeicherte Erkenntnis/ })).toBeVisible();
  await page.getByRole('button', { name: /Quellenüberblick Das Wesentliche/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(
    page.locator('.artifact-card').filter({ hasText: 'Quellenüberblick' }),
  ).toBeVisible();
  await page.reload();
  if (isMobile) await page.getByRole('tab', { name: 'Studio', exact: true }).click();
  await expect(page.getByRole('button', { name: /Gespeicherte Erkenntnis/ })).toBeVisible();
  if (isMobile) await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.getByLabel('Frage an deine Quellen').fill('Wie ist das Wetter morgen?');
  await page.getByRole('button', { name: 'Frage senden' }).click();
  await expect(
    page.getByText('Dazu enthalten die ausgewählten Quellen keine ausreichenden Informationen.', {
      exact: true,
    }),
  ).toBeVisible();
  if (isMobile) await page.getByRole('tab', { name: 'Quellen', exact: true }).click();
  await page.getByLabel('Projektplan auswählen', { exact: true }).uncheck();
  if (isMobile) await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Frage senden' })).toBeDisabled();
  if (isMobile) await page.getByRole('tab', { name: 'Quellen', exact: true }).click();
  await page.getByRole('button', { name: 'Projektplan entfernen', exact: true }).click();
  if (isMobile) await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await expect(page.getByText(/Dieser Inhalt ist nicht mehr verfügbar/).first()).toBeVisible();
});
test('API isolation and CSRF checks apply with manually supplied IDs', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Gute Gedanken/ })).toBeVisible();
  const bootstrap = await (await page.request.get('/api/bootstrap')).json();
  const headers = { origin: 'http://localhost:3100', 'x-csrf-token': bootstrap.csrf };
  const created = await page.request.post('/api/notebooks', {
    headers,
    data: { title: 'Isolation' },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const other = await browser.newContext();
  const isolated = await other.request.get('/api/bootstrap');
  expect(isolated.ok()).toBeTruthy();
  expect((await other.request.get('/api/notebooks/' + id)).status()).toBe(404);
  expect(
    (
      await page.request.delete('/api/notebooks/' + id, {
        headers: { origin: 'http://localhost:3100' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.delete('/api/notebooks/' + id, {
        headers: { origin: 'http://localhost:3100', 'x-csrf-token': 'é'.repeat(64) },
      })
    ).status(),
  ).toBe(403);
  expect((await page.request.delete('/api/notebooks/' + id, { headers })).ok()).toBeTruthy();
  await other.close();
});
test('binary PDF upload and provider failure recover through the real UI', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Gute Gedanken/ })).toBeVisible();
  const bootstrap = await (await page.request.get('/api/bootstrap')).json();
  const headers = { origin: 'http://localhost:3100', 'x-csrf-token': bootstrap.csrf };
  const response = await page.request.post('/api/notebooks', {
    headers,
    data: { title: 'PDF und Fehlerfälle' },
  });
  const { id } = await response.json();
  await page.goto('/?notebook=' + id);
  await expect(page.getByRole('heading', { name: 'PDF und Fehlerfälle' })).toBeVisible();
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Pilot budget: 5000 euros. The project starts in November 2026.');
  if (isMobile) await page.getByRole('tab', { name: 'Quellen', exact: true }).click();
  await page.getByLabel('Quelldatei auswählen').setInputFiles({
    name: 'pilot.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.getByRole('button', { name: /pilot.pdf PDF/ })).toBeVisible();
  if (isMobile) await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.getByLabel('Frage an deine Quellen').fill('PROVIDER_TIMEOUT');
  await page.getByRole('button', { name: 'Frage senden' }).click();
  await expect(
    page.getByText('Die KI hat nicht rechtzeitig geantwortet. Bitte erneut versuchen.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel('Frage an deine Quellen').fill('What is the project budget?');
  await page.getByRole('button', { name: 'Frage senden' }).click();
  await expect(page.getByRole('button', { name: /Beleg 1 aus pilot.pdf/ })).toBeVisible();
  await page.getByRole('button', { name: /Beleg 1 aus pilot.pdf/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Seite 1');
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByLabel('Quelldatei auswählen').setInputFiles({
    name: 'invalid.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('unsupported data'),
  });
  await expect(
    page.getByText('Bitte eine PDF-, TXT- oder Markdown-Datei hochladen.', { exact: true }),
  ).toBeVisible();
});
test('capture representative layouts without claiming real model verification', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Beispiel erkunden/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Projekt Morgenlicht', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toBeEmpty({ timeout: 6000 });
  if (!isMobile) await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `docs/screenshots/workspace-${isMobile ? 'mobile' : 'desktop'}.png`,
    fullPage: true,
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Gute Gedanken/ })).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/home-${isMobile ? 'mobile' : 'desktop'}.png`,
    fullPage: true,
  });
});
