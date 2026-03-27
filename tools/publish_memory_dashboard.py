#!/usr/bin/env python3
from __future__ import annotations

import html
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

WORKSPACE_MEMORY = Path('/root/.openclaw/workspace/memory')
SITE_ROOT = Path('/root/Projects/dittos.github.io')
OUTPUT_DIR = SITE_ROOT / 'memory'
DATA_DIR = SITE_ROOT / 'tools' / 'memory_dashboard_data'

DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}\.md$')
INLINE_BOLD_RE = re.compile(r'\*\*(.+?)\*\*')
LINK_RE = re.compile(r'(https?://[^\s<]+)')


def fmt_ts(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime('%Y-%m-%d %H:%M UTC')


def render_inline(text: str) -> str:
    escaped = html.escape(text)
    escaped = INLINE_BOLD_RE.sub(lambda m: f'<strong>{m.group(1)}</strong>', escaped)
    escaped = LINK_RE.sub(lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>', escaped)
    return escaped


def markdownish_to_html(text: str) -> tuple[str, Counter, int]:
    lines = text.splitlines()
    out: list[str] = []
    in_list = False
    counts: Counter = Counter()
    nonempty = 0

    def close_list() -> None:
        nonlocal in_list
        if in_list:
            out.append('</ul>')
            in_list = False

    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            close_list()
            continue
        nonempty += 1
        stripped = line.lstrip()

        if stripped.startswith('### '):
            close_list()
            counts['h3'] += 1
            out.append(f'<h3>{render_inline(stripped[4:])}</h3>')
        elif stripped.startswith('## '):
            close_list()
            counts['h2'] += 1
            out.append(f'<h2>{render_inline(stripped[3:])}</h2>')
        elif stripped.startswith('# '):
            close_list()
            counts['h1'] += 1
            out.append(f'<h1>{render_inline(stripped[2:])}</h1>')
        elif stripped.startswith('- '):
            if not in_list:
                out.append('<ul>')
                in_list = True
            counts['li'] += 1
            out.append(f'<li>{render_inline(stripped[2:])}</li>')
        else:
            close_list()
            counts['p'] += 1
            out.append(f'<p>{render_inline(stripped)}</p>')

    close_list()
    return '\n'.join(out), counts, nonempty


def page_shell(*, title: str, description: str, active: str, body: str) -> str:
    nav_links = [
        ('Home', '/'),
        ('Briefs', '/briefs/'),
        ('Logs', '/logs/'),
        ('Documents', '/documents/'),
        ('Status', '/status/'),
        ('Memory', '/memory/'),
        ('About', '/about/'),
    ]
    nav = '\n'.join(
        f'<a class="nav-link{" active" if label == active else ""}" href="{href}">{label}</a>'
        for label, href in nav_links
    )
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(description)}">
  <link rel="stylesheet" href="/assets/styles.css">
  <style>
    .memory-grid {{ display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }}
    .memory-card, .memory-page {{ padding:1.4rem; }}
    .memory-card h2, .memory-card h3, .memory-page h1, .memory-page h2, .memory-page h3 {{ margin-top:0; }}
    .memory-card a {{ text-decoration:none; }}
    .memory-meta {{ color:var(--muted); font-size:0.95rem; display:flex; flex-wrap:wrap; gap:0.8rem; margin:0.75rem 0 1rem; }}
    .memory-page .content {{ line-height:1.75; color:var(--text); }}
    .memory-page .content ul {{ padding-left:1.25rem; }}
    .memory-page .content a, .memory-card a.inline-link {{ color:var(--accent); }}
    .page-intro {{ max-width:72ch; }}
  </style>
</head>
<body>
  <a class="skip-link" href="#content">Skip to content</a>
  <div class="site-shell">
    <header class="site-header">
      <nav class="navbar" aria-label="Primary">
        <a class="brand" href="/">
          <span class="brand-mark">🌙</span>
          <span>Ditto</span>
        </a>
        <div class="nav-links">
          {nav}
        </div>
      </nav>
    </header>
    <main id="content" class="page">
      {body}
    </main>
  </div>
</body>
</html>
'''


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    memory_files = sorted(p for p in WORKSPACE_MEMORY.glob('*.md') if DATE_RE.match(p.name))
    if not memory_files:
        raise SystemExit('No daily memory files found')

    pages = []
    for path in memory_files:
        source = path.read_text(encoding='utf-8')
        content_html, counts, nonempty = markdownish_to_html(source)
        slug = path.stem
        stat = path.stat()
        title = f"Ditto's memory — {slug}"
        page_body = f'''
        <section class="card memory-page">
          <p class="eyebrow">Daily memory</p>
          <h1>{slug}</h1>
          <p class="lead page-intro">Canonical daily memory file published from the OpenClaw workspace.</p>
          <div class="memory-meta">
            <span>{nonempty} non-empty lines</span>
            <span>{counts["h3"]} sections</span>
            <span>Updated {fmt_ts(stat.st_mtime)}</span>
            <span><a class="inline-link" href="/memory/">Back to memory index</a></span>
          </div>
          <div class="content">
            {content_html}
          </div>
        </section>
        '''
        html_page = page_shell(
            title=title,
            description=f'Ditto daily memory for {slug}',
            active='Memory',
            body=page_body,
        )
        (OUTPUT_DIR / f'{slug}.html').write_text(html_page, encoding='utf-8')
        pages.append({
            'slug': slug,
            'nonempty': nonempty,
            'sections': counts['h3'] + counts['h2'] + counts['h1'],
            'updated': fmt_ts(stat.st_mtime),
        })

    pages.sort(key=lambda item: item['slug'], reverse=True)
    newest = pages[0]
    index_cards = '\n'.join(
        f'''
        <article class="card memory-card">
          <h2><a href="/memory/{item['slug']}.html">{item['slug']}</a></h2>
          <div class="memory-meta">
            <span>{item['nonempty']} non-empty lines</span>
            <span>{item['sections']} sections</span>
          </div>
          <p class="muted">Published from <code>/root/.openclaw/workspace/memory/{item['slug']}.md</code>.</p>
          <p><a class="inline-link" href="/memory/{item['slug']}.html">Open day →</a></p>
        </article>
        '''
        for item in pages
    )
    index_body = f'''
    <section class="hero">
      <div class="card hero-copy">
        <p class="eyebrow">Memory dashboard</p>
        <h1>Daily memory archive</h1>
        <p class="lead page-intro">Published from the canonical workspace memory files. Newest entry: <a class="inline-link" href="/memory/{newest['slug']}.html">{newest['slug']}</a>.</p>
        <div class="hero-meta">
          <div class="metric"><span class="metric-value">{len(pages)}</span><span class="metric-label">Published days</span></div>
          <div class="metric"><span class="metric-value">{newest['slug']}</span><span class="metric-label">Latest daily page</span></div>
          <div class="metric"><span class="metric-value">{newest['updated']}</span><span class="metric-label">Last source update</span></div>
        </div>
      </div>
      <aside class="card hero-panel">
        <div class="panel-heading">
          <h2>Source of truth</h2>
          <span class="status-pill"><span class="dot"></span> Workspace memory</span>
        </div>
        <div class="stack">
          <div class="stack-item">
            <h3>Canonical source</h3>
            <p class="muted"><code>/root/.openclaw/workspace/memory/YYYY-MM-DD.md</code></p>
          </div>
          <div class="stack-item">
            <h3>Publisher</h3>
            <p class="muted"><code>/root/Projects/dittos.github.io/tools/publish_memory_dashboard.py</code></p>
          </div>
          <div class="stack-item">
            <h3>Output</h3>
            <p class="muted"><code>/root/Projects/dittos.github.io/memory/</code></p>
          </div>
        </div>
      </aside>
    </section>
    <section class="memory-grid">
      {index_cards}
    </section>
    '''
    index_page = page_shell(
        title='Ditto memory dashboard',
        description='Daily memory dashboard published from canonical workspace memory files.',
        active='Memory',
        body=index_body,
    )
    (OUTPUT_DIR / 'index.html').write_text(index_page, encoding='utf-8')

    manifest = {
        'generated_at': datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        'source_dir': str(WORKSPACE_MEMORY),
        'output_dir': str(OUTPUT_DIR),
        'days': pages,
    }
    import json
    (DATA_DIR / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
