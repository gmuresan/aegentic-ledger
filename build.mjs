// Static-site build for the Forseti ledger.
// Reads the redaction-gated markdown in entries/ (written by the /publish-ledger skill),
// renders it to a styled, deployable HTML site in dist/. No framework — just `marked` + a
// hand-built layout. Cloudflare Pages runs `npm run build` and serves dist/ as the site.
//
// Source of truth stays the markdown: this build is pure presentation. entries/*.md, index.md
// and feed.xml are generated upstream and are never hand-edited.

import {
  readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

const ROOT = process.cwd();
const ENTRIES_DIR = join(ROOT, 'entries');
const DIST = join(ROOT, 'dist');
const DIST_ENTRIES = join(DIST, 'entries');

const SITE = {
  brand: 'Forseti',
  tagline: 'A live, self-custody oversight record',
  description:
    'Forseti is an independent oversight layer for autonomous DeFi agents: it verifies, critiques, ' +
    'and can veto every transaction an agent proposes — before it executes, with the signing key ' +
    'never leaving the operator. Below is the auto-generated, redaction-gated record of that ' +
    'oversight working on Base mainnet. It leads with the safety layer — denials, critic flags, ' +
    'oscillation catches, projected-vs-realized misses — not with yield. Every claim resolves to ' +
    'an on-chain transaction.',
};

// Open external links in a new tab.
const renderer = new marked.Renderer();
const baseLink = renderer.link.bind(renderer);
renderer.link = (href, title, text) => {
  const html = baseLink(href, title, text);
  return /^https?:\/\//.test(String(href))
    ? html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ')
    : html;
};
marked.setOptions({ renderer });

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: raw };
  const meta = {};
  for (const line of raw.slice(3, end).trim().split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return { meta, body: raw.slice(end + 4).replace(/^\s*\n/, '') };
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const layout = ({ title, body }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(SITE.tagline)} — ${SITE.brand}.">
<link rel="alternate" type="application/rss+xml" title="${SITE.brand} ledger" href="/feed.xml">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<main class="wrap">
${body}
</main>
<footer class="wrap">
<p>Auto-generated &middot; redaction-gated &middot; every claim resolves to an on-chain Base transaction. <a href="/feed.xml">RSS</a></p>
</footer>
</body>
</html>`;

function renderIndex(entries) {
  const wallet = entries[0]?.meta.wallet ?? '';
  const rows = entries
    .map((e) => {
      const date = (e.meta.date ?? '').slice(0, 10);
      const title = e.meta.title ?? e.htmlName.replace(/\.html$/, '');
      return `      <li><a class="entry-link" href="/entries/${esc(e.htmlName)}"><time>${esc(date)}</time><span class="t">${esc(title)}</span><span class="arrow">→</span></a></li>`;
    })
    .join('\n');
  const body = `<header class="hero">
  <p class="brand">${SITE.brand}</p>
  <h1>${esc(SITE.tagline)}</h1>
  <p class="lede">${esc(SITE.description)}</p>
  ${
    wallet
      ? `<p class="wallet">Agent wallet · <a target="_blank" rel="noopener noreferrer" href="https://basescan.org/address/${esc(wallet)}"><code>${esc(wallet)}</code></a></p>`
      : ''
  }
</header>
<section class="entries">
  <h2 class="section-label">Entries</h2>
  <ul class="entry-list">
${rows || '      <li class="empty">No entries published yet.</li>'}
  </ul>
</section>`;
  return layout({ title: `${SITE.brand} — ${SITE.tagline}`, body });
}

function renderEntry(e) {
  const date = (e.meta.date ?? '').slice(0, 10);
  // Drop the body's leading "# Public Ledger — slug" H1; the page header carries the title.
  const cleanBody = e.body.replace(/^#\s+.*\n+/, '');
  const body = `<p class="back"><a href="/">← ${SITE.brand}</a></p>
<header class="entry-head">
  <p class="brand small">${SITE.brand}</p>
  <h1>${esc(e.meta.title ?? 'Entry')}</h1>
  <p class="meta"><time>${esc(date)}</time> &middot; agent <code>${esc(e.meta.agent ?? '')}</code></p>
</header>
<article class="ledger">
${marked.parse(cleanBody)}
</article>
<p class="back"><a href="/">← all entries</a></p>`;
  return layout({ title: `${e.meta.title ?? 'Entry'} · ${SITE.brand}`, body });
}

const CSS = `:root{
  --bg:#0a0b0d; --panel:#101316; --line:#1c2127; --line-2:#262c34;
  --text:#e8eaed; --muted:#9aa3ad; --faint:#6b7480;
  --safe:#46d39a; --link:#74a8ff; --warn:#f0a35e;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);
  line-height:1.65;font-size:16px;
  background-image:radial-gradient(1200px 600px at 50% -10%,rgba(70,211,154,.06),transparent 70%);}
.wrap{max-width:720px;margin:0 auto;padding:0 22px}
a{color:var(--link);text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:var(--mono);font-size:.86em;background:var(--panel);border:1px solid var(--line);
  border-radius:5px;padding:.08em .4em;color:#cdd3da;word-break:break-all}
time{font-family:var(--mono);color:var(--faint);font-size:.82em;letter-spacing:.02em}

/* hero */
.hero{padding:74px 0 34px;border-bottom:1px solid var(--line)}
.brand{font-family:var(--mono);text-transform:uppercase;letter-spacing:.42em;
  font-size:.72rem;color:var(--safe);margin:0 0 22px}
.brand.small{margin-bottom:14px;letter-spacing:.34em}
.hero h1{font-size:2.05rem;line-height:1.18;margin:0 0 18px;font-weight:620;letter-spacing:-.015em}
.lede{color:var(--muted);font-size:1.02rem;margin:0 0 22px;max-width:60ch}
.wallet{font-size:.9rem;color:var(--faint);margin:0}
.wallet code{font-size:.8rem}

/* entry list */
.entries{padding:30px 0 10px}
.section-label{font-family:var(--mono);text-transform:uppercase;letter-spacing:.2em;
  font-size:.74rem;color:var(--faint);font-weight:600;margin:0 0 8px}
.entry-list{list-style:none;margin:0;padding:0}
.entry-link{display:flex;align-items:baseline;gap:16px;padding:17px 4px;
  border-bottom:1px solid var(--line);color:var(--text)}
.entry-link:hover{text-decoration:none;background:linear-gradient(90deg,rgba(70,211,154,.05),transparent)}
.entry-link time{flex:0 0 auto;min-width:88px}
.entry-link .t{flex:1 1 auto;font-weight:480}
.entry-link .arrow{color:var(--faint);transition:transform .12s ease}
.entry-link:hover .arrow{color:var(--safe);transform:translateX(3px)}
.empty{color:var(--faint);padding:18px 4px}

/* entry page */
.back{margin:30px 0 0;font-family:var(--mono);font-size:.82rem}
.entry-head{padding:18px 0 8px;border-bottom:1px solid var(--line);margin-bottom:8px}
.entry-head h1{font-size:1.7rem;line-height:1.22;margin:0 0 10px;letter-spacing:-.01em}
.entry-head .meta{color:var(--faint);margin:0;font-size:.9rem}

/* rendered ledger markdown */
.ledger h1{font-size:1.5rem;margin:34px 0 4px}
.ledger h2{font-size:1.15rem;margin:46px 0 6px;padding-top:22px;border-top:1px solid var(--line-2);
  letter-spacing:-.01em}
.ledger h2:first-child{border-top:0;padding-top:0;margin-top:18px}
.ledger h3{font-family:var(--mono);text-transform:uppercase;letter-spacing:.14em;font-size:.76rem;
  color:var(--safe);font-weight:600;margin:26px 0 6px}
.ledger p{margin:.7em 0;color:var(--text)}
.ledger ul{margin:.5em 0;padding-left:1.1em}
.ledger li{margin:.3em 0}
.ledger li strong{color:var(--warn);font-weight:600}
.ledger blockquote{margin:14px 0;padding:2px 0 2px 16px;border-left:2px solid var(--line-2);
  color:var(--muted);font-style:italic}
.ledger blockquote p{color:var(--muted)}
.ledger em{color:var(--faint);font-style:italic}
.ledger hr{border:0;border-top:1px solid var(--line);margin:40px 0}
.ledger a{border-bottom:1px solid transparent}
.ledger a:hover{border-bottom-color:var(--link);text-decoration:none}

/* footer */
footer{margin:70px 0 56px;padding-top:22px;border-top:1px solid var(--line);
  color:var(--faint);font-size:.82rem}
footer p{margin:0}
@media(max-width:540px){
  .hero{padding:48px 0 28px}.hero h1{font-size:1.7rem}
  .entry-link{gap:10px}.entry-link time{min-width:78px}
}`;

// ---- build ----
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST_ENTRIES, { recursive: true });

const files = existsSync(ENTRIES_DIR)
  ? readdirSync(ENTRIES_DIR).filter((f) => f.endsWith('.md')).sort().reverse() // newest-first
  : [];

const entries = files.map((f) => {
  const { meta, body } = parseFrontmatter(readFileSync(join(ENTRIES_DIR, f), 'utf-8'));
  return { file: f, htmlName: f.replace(/\.md$/, '.html'), meta, body };
});

for (const e of entries) writeFileSync(join(DIST_ENTRIES, e.htmlName), renderEntry(e));
writeFileSync(join(DIST, 'index.html'), renderIndex(entries));
writeFileSync(join(DIST, 'styles.css'), CSS);
if (existsSync(join(ROOT, 'feed.xml'))) copyFileSync(join(ROOT, 'feed.xml'), join(DIST, 'feed.xml'));

console.log(`Built ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} → dist/`);
