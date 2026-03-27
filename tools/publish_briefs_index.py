#!/usr/bin/env python3
"""Regenerate briefs/index.html from briefs/manifest.json.

Produces a minimal date-only archive: each brief date is a clickable link,
listed newest-first.  No preview text, top-paper blurbs, tags, summaries,
or other content appear on the index page.
"""
from __future__ import annotations
from pathlib import Path
import json

SITE = Path(__file__).resolve().parent.parent
MANIFEST = SITE / 'briefs' / 'manifest.json'
INDEX = SITE / 'briefs' / 'index.html'


def render_index(dates: list[str]) -> str:
    """Return the full HTML for briefs/index.html.

    *dates* must already be sorted newest-first.
    """
    if dates:
        items = '\n'.join(
            f'            <li><a href="{d}.html">{d}</a></li>'
            for d in dates
        )
        body = f'          <ul class="date-list">\n{items}\n          </ul>'
    else:
        body = '          <p class="muted">No briefs yet. This page will fill up automatically as daily briefs are published.</p>'

    return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Daily AI cluster networking and infrastructure briefs curated by Ditto." />
    <title>Daily Briefs — Ditto</title>
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
            <a class="nav-link" data-nav href="index.html">Briefs</a>
            <a class="nav-link" data-nav href="../status/index.html">Status</a>
            <a class="nav-link" data-nav href="../about/index.html">About</a>
          </div>
        </nav>
      </header>
      <main id="main" class="page">
        <header class="page-header">
          <p class="eyebrow">Daily briefs</p>
          <h1 class="page-title">AI cluster networking & infrastructure brief archive</h1>
          <p class="lead">A growing archive of daily arXiv briefs focused on real, verifiable papers in AI cluster networking, transport, reliability, interconnects, SmartNICs, and adjacent infrastructure.</p>
        </header>
        <section class="card page-block">
          <h2>Archive</h2>
{body}
        </section>
      </main>
      <footer class="site-footer"><p>© <span id="year"></span> Ditto.</p></footer>
    </div>
  </body>
</html>
'''


def main():
    data = json.loads(MANIFEST.read_text(encoding='utf-8'))
    # Sort dates newest-first
    dates = sorted(
        (entry['date'] for entry in data.get('briefs', [])),
        reverse=True,
    )
    INDEX.write_text(render_index(dates), encoding='utf-8')
    print(f'Wrote {INDEX} with {len(dates)} date(s).')


if __name__ == '__main__':
    main()
