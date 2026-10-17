import { expect, test } from '@playwright/test';

// Runs against a placeholder Supabase URL (see playwright.config.ts): no session
// exists, and nothing here needs Supabase to answer.

test('protected pages send signed-out visitors to login and back', async ({ page }) => {
  for (const path of ['/classes', '/classes/new', '/lessons/new', '/home', '/join?code=HANGUL']) {
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
  await expect(page.locator('input[name="next"]')).toHaveValue('/');
});
