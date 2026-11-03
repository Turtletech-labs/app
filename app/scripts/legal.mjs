// Turns the legal documents in docs/legal/*.md into plain web pages in
// app/public/, so they have public addresses (e.g. /privacy.html) that the app,
// app stores and Google sign-in can link to. The markdown is the source of truth.
//
//   node scripts/legal.mjs           write the pages
//   node scripts/legal.mjs --check   fail if the pages are out of date (used by the tests)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', '..', 'docs', 'legal');
const OUT = join(here, '..', 'public');

export const PAGES = [
  { file: 'privacy', title: 'Privacy policy' },
  { file: 'community-rules', title: 'Community rules' },
  { file: 'terms-of-use', title: 'Terms of use' },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(text) {
  let t = esc(text);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/(^|[\s(])(turtletech\.labs@gmail\.com)/g, '$1<a href="mailto:$2">$2</a>');
  return t;
}

// A small markdown subset: headings, paragraphs, bullet and numbered lists
// (one level of nesting), tables, bold, links and inline code.
export function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; } };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { flush(); i++; continue; }
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }

    if (line.trim().startsWith('|')) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push('<div class="table"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
        + body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }

    if (/^\s*([-*]|\d+\.) /.test(line)) {
      flush();
      const ordered = /^\s*\d+\. /.test(line);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i])) {
        const m = /^(\s*)([-*]|\d+\.) (.*)$/.exec(lines[i]);
        if (m[1].length >= 2 && items.length) items[items.length - 1].sub.push(m[3]);
        else items.push({ text: m[3], sub: [] });
        i++;
      }
      out.push(`<${tag}>` + items.map((it) => `<li>${inline(it.text)}${it.sub.length ? '<ul>' + it.sub.map((x) => `<li>${inline(x)}</li>`).join('') + '</ul>' : ''}</li>`).join('') + `</${tag}>`);
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flush();
  return out.join('\n');
}

const CSS = `
:root{--bg:#F4F2EC;--surface:#fff;--ink:#1B1F4B;--muted:#5A5F73;--line:#E1DED5;--teal:#0F6E70;--tealTint:#DCEDEC}
@media (prefers-color-scheme: dark){:root{--bg:#14161f;--surface:#1c1f2b;--ink:#ecebf5;--muted:#a6a9bb;--line:#2e3243;--teal:#5cc2c4;--tealTint:#1f3a3b}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 16px 64px}
nav{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;margin-bottom:24px}
a{color:var(--teal)}
h1{font-size:30px;line-height:1.2;margin:8px 0 4px}
h2{font-size:21px;margin:36px 0 8px}
h3{font-size:17px;margin:24px 0 4px}
p,li{color:var(--ink)}
li{margin:4px 0}
ul,ol{padding-left:22px}
p:first-of-type{color:var(--muted);font-size:14px}
code{background:var(--tealTint);padding:1px 5px;border-radius:4px;font-size:.92em}
.table{overflow-x:auto;margin:12px 0;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:14.5px;min-width:520px}
th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line)}
th{font-size:12px;letter-spacing:.4px;text-transform:uppercase;color:var(--muted)}
tr:last-child td{border-bottom:0}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
`;

export function renderPage(page, md) {
  const nav = PAGES.map((p) => `<a href="${p.file}.html">${p.title}</a>`).join('');
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${page.title} · Sangam</title>
<style>${CSS}</style>
</head>
<body>
<main>
<nav><a href="/">← Back to Sangam</a>${nav}</nav>
${markdownToHtml(md)}
<footer>Sangam is run by Turtletech Labs. Questions: <a href="mailto:turtletech.labs@gmail.com">turtletech.labs@gmail.com</a></footer>
</main>
</body>
</html>
`;
}

export function build() {
  return PAGES.map((p) => ({ ...p, path: join(OUT, `${p.file}.html`), html: renderPage(p, readFileSync(join(SRC, `${p.file}.md`), 'utf8')) }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pages = build();
  if (process.argv.includes('--check')) {
    const stale = pages.filter((p) => !existsSync(p.path) || readFileSync(p.path, 'utf8') !== p.html);
    if (stale.length) { console.error(`Out of date: ${stale.map((p) => p.file).join(', ')}. Run: node scripts/legal.mjs`); process.exit(1); }
    console.log('Legal pages are up to date.');
  } else {
    mkdirSync(OUT, { recursive: true });
    for (const p of pages) { writeFileSync(p.path, p.html); console.log(`wrote public/${p.file}.html`); }
  }
}
