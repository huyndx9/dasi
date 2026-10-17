import { expect, test } from '@playwright/test';

// Runs against a placeholder Supabase URL (see playwright.config.ts): no session
// exists, and nothing here needs Supabase to answer.

test('protected pages send signed-out visitors to login and back', async ({ page }) => {
  for (const path of [
    '/classes',
    '/classes/new',
    '/lessons/new',
    '/lessons/6f1c1f7e-3a0b-4c55-9d43-1f0a0f3f2b10',
    '/lessons/6f1c1f7e-3a0b-4c55-9d43-1f0a0f3f2b10/live',
    '/live/6f1c1f7e-3a0b-4c55-9d43-1f0a0f3f2b10',
    '/home',
    '/join?code=HANGUL',
    '/settings',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
  }
  await expect(page.getByRole('heading', { name: 'Đăng nhập để bắt đầu' })).toBeVisible();
});

test('Google sign-in starts the Supabase OAuth flow with the return path', async ({ page }) => {
  await page.goto('/login?next=%2Fjoin%3Fcode%3DHANGUL');
  const authorize = page.waitForRequest((r) => r.url().includes('/auth/v1/authorize'));
  await page.getByRole('button', { name: 'Tiếp tục với Google' }).click();

  const url = new URL((await authorize).url());
  expect(url.searchParams.get('provider')).toBe('google');
  const redirectTo = new URL(url.searchParams.get('redirect_to')!);
  expect(redirectTo.pathname).toBe('/auth/callback');
  expect(redirectTo.searchParams.get('next')).toBe('/join?code=HANGUL');
});

test('a failed OAuth callback explains what happened', async ({ page }) => {
  await page.goto('/auth/callback');
  await expect(page).toHaveURL('/login?error=callback');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Đăng nhập không thành công' }),
  ).toBeVisible();
});

test('an external next parameter is ignored', async ({ page }) => {
  await page.goto('/login?next=https%3A%2F%2Fevil.example');
  const nextInputs = page.locator('input[name="next"]');
  await expect(nextInputs).toHaveCount(2); // trial and Google forms
  for (const input of await nextInputs.all()) await expect(input).toHaveValue('/');
});

test('test builds offer a trial sign-in and explain when it is not enabled', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Tên hiển thị').fill('Cô Kim');
  await page.getByRole('button', { name: 'Vào thử' }).click();
  // The placeholder Supabase project does not answer, as when anonymous sign-ins are off.
  await expect(page).toHaveURL('/login?error=guest');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Allow anonymous sign-ins' }),
  ).toBeVisible();
});
