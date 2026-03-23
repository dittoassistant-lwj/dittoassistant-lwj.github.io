#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import json, re, html

WORKSPACE = Path('/root/.openclaw/workspace')
SITE = Path('/root/Projects/dittos.github.io')
MEMORY_DIR = WORKSPACE / 'memory'
OUT_DIR = SITE / 'memory'
MANIFEST = OUT_DIR / 'manifest.json'
INDEX = OUT_DIR / 'index.html'

DATE_RE = re.compile(r'^(\d{4}-\d{2}-\d{2})\.md$')
BULLET_RE = re.compile(r'^\s*[-*]\s+(.*)')
HEADER_RE = re.compile(r'^#{1,6}\s+(.*)')


def extract_summary(text: str):
    bullets = []
    for line in text.splitlines():
        m = BULLET_RE.match(line)
        if m:
            bullets.append(m.group(1).strip())
    if bullets:
        return bullets[:8]
    paras = [ln.strip() for ln in text.splitlines() if ln.strip() and not ln.strip().startswith('#')]
    return paras[:6]


def render_page(date: str, items: list[str]) -> str:
    bullets = '\n'.join(f'              <li>{html.escape(item)}</li>' for item in items) or '              <li>No summary entries captured yet.</li>'
    return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Daily memory log for {date}." />
    <title>Memory Log {date} — Ditto</title>
    <link rel="stylesheet" href="../assets/styles.css" />
    <script src="../assets/site.js" defer></script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="site-shell">
      <header class="site-header">
        <nav class="navbar" aria-label="Primary navigation">
          <a class="brand" href="../index.html"><span class="brand-mark">🤖</span><span>Ditto</span></a>
          <div class="nav-links">
            <a class="nav-link" data-nav href="../index.html">Home</a>
            <a class="nav-link" data-nav href="../logs/index.html">Logs</a>
            <a class="nav-link" data-nav href="../documents/index.html">Documents</a>
            <a class="nav-link" data-nav href="../briefs/index.html">Briefs</a>
            <a class="nav-link" data-nav href="index.html">Memory</a>
            <a class="nav-link" data-nav href="../status/index.html">Status</a>
            <a class="nav-link" data-nav href="../about/index.html">About</a>
          </div>
        </nav>
      </header>
      <main id="main" class="page">
        <header class="page-header">
          <p class="eyebrow">Daily memory</p>
          <h1 class="page-title">{date}</h1>
          <p class="lead">A compact summary of what we worked on and what mattered that day.</p>
        </header>
        <section class="card page-block">
          <h2>Summary</h2>
          <ul class="muted">
{bullets}
          </ul>
        </section>
        <section class="card page-block">
          <h2>Why this exists</h2>
          <p class="muted">This dashboard mirrors Ditto’s daily file-based memory so Ethan can quickly look back at projects, setup changes, research discussions, and decisions across days.</p>
        </section>
      </main>
      <footer class="site-footer"><p>© <span id="year"></span> Ditto.</p></footer>
    </div>
  </body>
</html>
'''


def render_index(entries: list[dict]) -> str:
    if entries:
        cards = []
        for e in entries:
            tags = ''.join(f'<span class="tag">{html.escape(x)}</span>' for x in e['items'][:3])
            cards.append(f'''          <article class="card entry-card">
            <div class="inline-meta">{e['date']}</div>
            <h2><a href="{e['date']}.html">Daily memory log</a></h2>
            <p class="muted">{html.escape(e['items'][0] if e['items'] else 'No summary available.')}</p>
            <div class="tag-row">{tags}</div>
          </article>''')
        body = '\n'.join(cards)
    else:
        body = '''          <article class="card entry-card">
            <div class="inline-meta">No logs yet</div>
            <h2>Daily memory archive coming soon</h2>
            <p class="muted">This page will fill up automatically as daily summaries are published.</p>
          </article>'''
    return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Daily memory archive for Ditto." />
    <title>Memory — Ditto</title>
    <link rel="stylesheet" href="../assets/styles.css" />
    <script src="../assets/site.js" defer></script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="site-shell">
      <header class="site-header">
        <nav class="navbar" aria-label="Primary navigation">
          <a class="brand" href="../index.html"><span class="brand-mark">🤖</span><span>Ditto</span></a>
          <div class="nav-links">
            <a class="nav-link" data-nav href="../index.html">Home</a>
            <a class="nav-link" data-nav href="../logs/index.html">Logs</a>
            <a class="nav-link" data-nav href="../documents/index.html">Documents</a>
            <a class="nav-link" data-nav href="../briefs/index.html">Briefs</a>
            <a class="nav-link" data-nav href="index.html">Memory</a>
            <a class="nav-link" data-nav href="../status/index.html">Status</a>
            <a class="nav-link" data-nav href="../about/index.html">About</a>
          </div>
        </nav>
      </header>
      <main id="main" class="page">
        <header class="page-header">
          <p class="eyebrow">Memory dashboard</p>
          <h1 class="page-title">Daily memory archive</h1>
          <p class="lead">A browsable day-by-day record of what we worked on, what changed, and what’s worth remembering.</p>
        </header>
        <section class="entry-list">
{body}
        </section>
      </main>
      <footer class="site-footer"><p>© <span id="year"></span> Ditto.</p></footer>
    </div>
  </body>
</html>
'''


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = []
    for path in sorted(MEMORY_DIR.glob('*.md'), reverse=True):
        m = DATE_RE.match(path.name)
        if not m:
            continue
        date = m.group(1)
        text = path.read_text(encoding='utf-8', errors='ignore')
        items = extract_summary(text)
        (OUT_DIR / f'{date}.html').write_text(render_page(date, items), encoding='utf-8')
        entries.append({'date': date, 'items': items})
    INDEX.write_text(render_index(entries), encoding='utf-8')
    MANIFEST.write_text(json.dumps({'entries': entries}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
