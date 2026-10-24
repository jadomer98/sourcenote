import { test, expect } from '@playwright/test';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

test('original PDF rendering, highlight, page/zoom controls and text fallback', async ({
  page,
  browser,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Gute Gedanken/ })).toBeVisible();
  const boot = await (await page.request.get('/api/bootstrap')).json();
  const response = await page.request.post('/api/notebooks', {
    headers: { origin: 'http://localhost:3100', 'x-csrf-token': boot.csrf },
    data: { title: 'Original-PDF-Test' },
  });
  const { id } = await response.json();
  await page.goto('/?notebook=' + id);
  await expect(page.getByRole('heading', { name: 'Original-PDF-Test', exact: true })).toBeVisible();
  const pdf = await PDFDocument.create();
  const first = pdf.addPage([600, 700]);
  first.drawRectangle({ x: 0, y: 570, width: 600, height: 130, color: rgb(0.1, 0.22, 0.38) });
  first.drawText('PROJECT ORION', { x: 40, y: 620, size: 27, color: rgb(1, 1, 1) });
  first.drawText('The approved budget is 5000 euros.', { x: 40, y: 500, size: 17 });
  first.drawText('Mira leads the project from November 2026.', { x: 40, y: 450, size: 14 });
  const second = pdf.addPage([600, 700]);
  second.drawText('Second page: next steps and milestones.', { x: 40, y: 600 });
  second.setRotation(degrees(90));
  if (isMobile) await page.getByRole('tab', { name: 'Quellen', exact: true }).click();
  await page.getByLabel('Quelldatei auswählen').setInputFiles({
    name: 'orion.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.getByRole('button', { name: /orion.pdf PDF/ })).toBeVisible();
  if (isMobile) await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.getByLabel('Frage an deine Quellen').fill('What is the budget?');
  await page.getByRole('button', { name: 'Frage senden' }).click();
  await page.getByRole('button', { name: /Beleg 1 aus orion.pdf/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.pdf-page')).toHaveAttribute('data-ready', 'true');
  await expect(dialog.locator('.pdf-evidence-highlight').first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Textauszug', exact: true })).toBeInViewport();
  await expect(dialog.locator('.pdf-status')).toContainText('Zitierte Textstelle');
  expect(
    await dialog.locator('canvas').evaluate((el) => (el as HTMLCanvasElement).width),
  ).toBeGreaterThan(500);
  await page.screenshot({
    path: `docs/screenshots/pdf-highlight-${isMobile ? 'mobile' : 'desktop'}.png`,
    fullPage: true,
  });
  const before = (await dialog.locator('.pdf-page').boundingBox())!.width;
  await dialog.getByRole('button', { name: 'PDF vergrößern', exact: true }).click();
  await expect
    .poll(async () => (await dialog.locator('.pdf-page').boundingBox())!.width)
    .toBeGreaterThan(before);
  await dialog.getByLabel('PDF-Seite', { exact: true }).selectOption('2');
  await expect(dialog.locator('.pdf-page')).toHaveAttribute('aria-label', 'Original-PDF, Seite 2');
  await expect(dialog.locator('.pdf-text-layer')).toContainText('Second page');
  await expect(dialog.locator('.pdf-page')).toHaveAttribute('data-ready', 'true');
  const renderedPage = (await dialog.locator('.pdf-page').boundingBox())!;
  const rotatedText = (await dialog
    .locator('.pdf-text-layer > span')
    .filter({ hasText: 'Second page' })
    .boundingBox())!;
  expect(rotatedText.x).toBeGreaterThanOrEqual(renderedPage.x - 2);
  expect(rotatedText.y).toBeGreaterThanOrEqual(renderedPage.y - 2);
  expect(rotatedText.x + rotatedText.width).toBeLessThanOrEqual(
    renderedPage.x + renderedPage.width + 2,
  );
  expect(rotatedText.y + rotatedText.height).toBeLessThanOrEqual(
    renderedPage.y + renderedPage.height + 2,
  );
  await expect(dialog.locator('.pdf-evidence-highlight')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Zum Beleg', exact: true }).click();
  await expect(dialog.locator('.pdf-evidence-highlight').first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Textauszug', exact: true }).click();
  await expect(dialog.locator('.source-excerpt')).toContainText('5000 euros');
  const original = await dialog
    .getByRole('link', { name: 'Original herunterladen' })
    .getAttribute('href');
  const other = await browser.newContext();
  await other.request.get('/api/bootstrap');
  expect(
    (
      await other.request.get('http://localhost:3100' + original!.replace('/download', '/file'))
    ).status(),
  ).toBe(404);
  await other.close();
  await page.route('**/sources/*/file', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await dialog.getByRole('button', { name: 'Original-PDF', exact: true }).click();
  await expect(dialog.locator('.pdf-status')).toContainText('Textauszug');
  await dialog.getByRole('button', { name: 'Textauszug', exact: true }).click();
  await expect(dialog.locator('.source-excerpt')).toContainText('5000 euros');
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
  expect(errors).toEqual([]);
});

test('provider cooldown preserves the question and never automatically resubmits', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Beispiel erkunden/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Projekt Morgenlicht', exact: true }),
  ).toBeVisible();
  let attempts = 0;
  await page.route('**/generate', async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '2' },
        body: JSON.stringify({
          code: 'PROVIDER_LIMIT',
          error: 'Groq meldet ein kostenloses Tokenlimit.',
          retryAfter: 2,
        }),
      });
    else await route.continue();
  });
  const input = page.getByLabel('Frage an deine Quellen');
  await input.fill('Wie hoch ist das Budget?');
  await page.getByRole('button', { name: 'Frage senden', exact: true }).click();
  await expect(input).toHaveValue('Wie hoch ist das Budget?');
  await expect(page.locator('.retry-countdown')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Frage senden', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Frage senden', exact: true })).toBeEnabled({
    timeout: 6000,
  });
  expect(attempts).toBe(1);
  await page.getByRole('button', { name: 'Frage senden', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Als Notiz speichern', exact: true }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});
