import { expect, test } from '@playwright/test';

test('home page introduces Dasi and lists subtitle languages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Dasi' })).toBeVisible();

  const languages = page.getByRole('region', { name: 'Ngôn ngữ phụ đề' }).getByRole('listitem');
  await expect(languages).toHaveCount(8);
  await expect(languages.filter({ hasText: 'Tiếng Việt' })).not.toContainText('Beta');
  await expect(languages.filter({ hasText: 'Oʻzbekcha' })).toContainText('Beta');
});

test('fits the viewport without horizontal scrolling', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test('follows the system dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(13, 19, 32)');
});
