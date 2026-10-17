// Screenshots of every reachable page at phone and desktop width, light and dark.
// Used at the end of each work session to refresh the preview (CLAUDE.md → End of session).
//
//   node scripts/screenshots.mjs <baseUrl> <outDir>
//
// Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to use a preinstalled Chromium.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [baseUrl = 'http://localhost:3000', outDir = 'screenshots'] = process.argv.slice(2);

/** Pages a signed-out visitor can open. Add signed-in pages once a test account exists. */
const pages = [
  { name: 'landing', path: '/', title: 'Trang giới thiệu' },
  { name: 'login', path: '/login', title: 'Đăng nhập' },
  { name: 'login-error', path: '/login?error=callback', title: 'Đăng nhập lỗi' },
  { name: 'not-found', path: '/khong-co-trang-nay', title: 'Không tìm thấy trang', status: 404 },
];
const variants = [
  { name: 'mobile-light', width: 390, height: 844, scheme: 'light' },
  { name: 'mobile-dark', width: 390, height: 844, scheme: 'dark' },
  { name: 'desktop-light', width: 1280, height: 800, scheme: 'light' },
  { name: 'desktop-dark', width: 1280, height: 800, scheme: 'dark' },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const manifest = [];
for (const page of pages) {
  for (const v of variants) {
    const tab = await browser.newPage({
      viewport: { width: v.width, height: v.height },
      colorScheme: v.scheme,
    });
    const errors = [];
    tab.on('pageerror', (e) => errors.push(e.message));
    tab.on('console', (m) => {
      // The browser logs the document's own 404 on purpose-built error pages.
      if (m.type() === 'error' && !(page.status === 404 && m.text().includes('404'))) {
        errors.push(m.text());
      }
    });
    const res = await tab.goto(baseUrl + page.path, { waitUntil: 'networkidle' });
    const overflow = await tab.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    const file = `${page.name}-${v.name}.png`;
    await tab.screenshot({ path: `${outDir}/${file}`, fullPage: true });
    manifest.push({ ...page, variant: v.name, file, status: res?.status(), overflow, errors });
    await tab.close();
  }
}
await browser.close();
writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2));
for (const m of manifest) {
  const problems = [m.overflow > 0 && `tràn ngang ${m.overflow}px`, ...m.errors].filter(Boolean);
  console.log(`${m.status} ${m.path} ${m.variant}${problems.length ? ' ⚠ ' + problems.join('; ') : ''}`);
}
