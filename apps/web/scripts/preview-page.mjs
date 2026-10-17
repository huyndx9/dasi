// Builds the session preview page from scripts/screenshots.mjs output.
//
//   node scripts/preview-page.mjs <screenshotsDir> <notes.json> <out.html>
//
// notes.json: { "commit": "abc1234", "date": "17/10/2026", "summary": ["…"],
//               "pending": ["…"], "links": [{ "label": "…", "url": "https://…" }] }
// Images are embedded as data URIs so the page is a single file.
import { readFileSync, writeFileSync } from 'node:fs';

const [dir, notesPath, out] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'));
const notes = JSON.parse(readFileSync(notesPath, 'utf8'));
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const img = (file) => `data:image/png;base64,${readFileSync(`${dir}/${file}`).toString('base64')}`;
const variantLabel = {
  'mobile-light': 'Điện thoại · sáng',
  'mobile-dark': 'Điện thoại · tối',
  'desktop-light': 'Máy tính · sáng',
  'desktop-dark': 'Máy tính · tối',
};

const byPage = new Map();
for (const shot of manifest) {
  if (!byPage.has(shot.path)) byPage.set(shot.path, { ...shot, shots: [] });
  byPage.get(shot.path).shots.push(shot);
}

const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
const problems = manifest.filter((m) => m.overflow > 0 || m.errors.length);

const sections = [...byPage.values()]
  .map(
    (p) => `<section class="page">
  <header><h2>${esc(p.title)}</h2><code>${esc(p.path)}</code></header>
  <div class="shots">${p.shots
    .map(
      (s) => `<figure class="${s.variant.startsWith('mobile') ? 'phone' : 'desk'}">
      <img src="${img(s.file)}" alt="${esc(p.title)}, ${esc(variantLabel[s.variant])}" loading="lazy">
      <figcaption>${esc(variantLabel[s.variant])}</figcaption></figure>`,
    )
    .join('')}</div>
</section>`,
  )
  .join('\n');

const html = `<title>Dasi Preview</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&amp;family=IBM+Plex+Mono:wght@500&amp;display=swap">
<style>
/* Layout: one column; each app page shows phone shots side by side, desktop shots below. */
:root {
  --bg: #f3f6fb; --surface: #fff; --sunk: #eaeff7; --line: #dce3ee;
  --fg: #16223b; --muted: #5b6884; --faint: #8a95ad;
  --learn: #0f9471; --learn-soft: #ddf3ec; --warn: #b86e00; --warn-soft: #fff1d6;
  --ff-ui: "Be Vietnam Pro", system-ui, sans-serif; --ff-mono: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0d1320; --surface: #151d2e; --sunk: #1c2639; --line: #2a3550;
  --fg: #e7ecf5; --muted: #a1acc3; --faint: #717d98;
  --learn: #3cc79e; --learn-soft: #12352c; --warn: #f0b44c; --warn-soft: #3a2d12; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0d1320; --surface: #151d2e; --sunk: #1c2639; --line: #2a3550;
  --fg: #e7ecf5; --muted: #a1acc3; --faint: #717d98;
  --learn: #3cc79e; --learn-soft: #12352c; --warn: #f0b44c; --warn-soft: #3a2d12; color-scheme: dark }
* { box-sizing: border-box }
body { background: var(--bg); color: var(--fg); font: 400 15px/1.55 var(--ff-ui); margin: 0 }
main { max-width: 1100px; margin: 0 auto; padding-block: 32px 64px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: flex; flex-direction: column; gap: 24px }
h1 { font-size: 28px; font-weight: 800; margin: 0; text-wrap: balance }
h2 { font-size: 18px; margin: 0 }
code, .meta { font-family: var(--ff-mono); font-size: 12.5px; color: var(--muted) }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px 20px }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px }
.cols h2 { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--faint) }
ul { margin: 8px 0 0; padding-left: 18px } li + li { margin-top: 4px }
.ok { background: var(--learn-soft); color: var(--learn) } .warn { background: var(--warn-soft); color: var(--warn) }
.status { border-radius: 8px; padding: 10px 14px; font-weight: 600; font-size: 14px }
a { color: inherit }
.page header { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 12px }
.shots { display: grid; grid-template-columns: repeat(2, minmax(0, 220px)) ; gap: 14px; align-items: start }
.shots .desk { grid-column: 1 / -1 }
@media (min-width: 900px) { .shots { grid-template-columns: 200px 200px minmax(0, 1fr) } .shots .desk { grid-column: 3; } .shots .desk + .desk { grid-row: 2 } }
figure { margin: 0; display: flex; flex-direction: column; gap: 6px; min-width: 0 }
figure img { width: 100%; max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 8px; display: block }
figcaption { font-size: 12px; color: var(--muted) }
</style>
<main>
  <header>
    <h1>Dasi · bản xem trước</h1>
    <p class="meta">commit ${esc(notes.commit)} · ${esc(notes.date)}</p>
  </header>
  <p class="status ${problems.length ? 'warn' : 'ok'}">${
    problems.length
      ? `${problems.length} ảnh có vấn đề: ${esc(problems.map((p) => `${p.path} ${p.variant}`).join(', '))}`
      : `${manifest.length} ảnh chụp, không lỗi trình duyệt, không tràn ngang ở 390px`
  }</p>
  <div class="cols">
    <section class="card"><h2>Phiên này đã làm</h2>${list(notes.summary)}</section>
    <section class="card"><h2>Chưa xem được / cần bạn làm</h2>${list(notes.pending)}</section>
  </div>
  ${notes.links?.length ? `<section class="card"><h2>Liên kết</h2><ul>${notes.links.map((l) => `<li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`).join('')}</ul></section>` : ''}
  ${sections}
</main>
`;
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB`);
