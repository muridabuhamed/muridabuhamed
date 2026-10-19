/* ==========================================================================
   Engineering journal: renders the entry list and single entries from
   window.POSTS (assets/js/posts.js). Routing uses the URL hash:
     blog.html          -> list of entries
     blog.html#/slug    -> one entry
   Everything is built with DOM methods / textContent, so entry text can
   never inject HTML.
   ========================================================================== */
(() => {
  'use strict';

  const indexView = document.getElementById('journal-index');
  const articleView = document.getElementById('journal-article');
  if (!indexView || !articleView) return;

  const allPosts = (Array.isArray(window.POSTS) ? window.POSTS : [])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  // Entries marked `example: true` are documentation, not articles: they stay out of the
  // public list. Open blog.html?examples to preview them, or link to one directly.
  const showExamples = new URLSearchParams(location.search).has('examples');
  const posts = allPosts.filter((post) => showExamples || !post.example);

  const BASE_TITLE = 'Engineering Journal — Murid AbuHamed';
  let activeTag = 'All';

  /* ---------- helpers ---------- */
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const formatDate = (iso, options) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });

  const readingMinutes = (post) =>
    post.minutes || Math.max(1, Math.ceil(`${post.summary || ''} ${post.body || ''}`.trim().split(/\s+/).length / 200));

  const SAFE_URL = /^(https?:\/\/|\/|\.\/|#|mailto:|[\w-]+\.html)/i;

  /* ---------- tiny, safe markdown-style renderer ---------- */
  const renderInline = (text) => {
    const fragment = document.createDocumentFragment();
    const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) fragment.append(text.slice(last, match.index));
      const [token] = match;

      if (token.startsWith('`')) {
        fragment.append(el('code', '', token.slice(1, -1)));
      } else if (token.startsWith('**')) {
        fragment.append(el('strong', '', token.slice(2, -2)));
      } else {
        const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (SAFE_URL.test(href)) {
          const link = el('a', '', label);
          link.href = href;
          if (/^https?:/i.test(href)) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
          fragment.append(link);
        } else {
          fragment.append(label);
        }
      }
      last = match.index + token.length;
    }
    if (last < text.length) fragment.append(text.slice(last));
    return fragment;
  };

  const renderBody = (source) => {
    const out = document.createDocumentFragment();
    const lines = source.replace(/\r\n/g, '\n').trim().split('\n').map((line) => line.replace(/^ {0,8}/, ''));
    let i = 0;

    const collect = (test, strip) => {
      const items = [];
      while (i < lines.length && test.test(lines[i])) { items.push(lines[i].replace(strip, '')); i += 1; }
      return items;
    };

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) { i += 1; continue; }

      const fence = line.match(/^```(\w*)/);
      if (fence) {
        const code = [];
        i += 1;
        while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i += 1; }
        i += 1;
        const pre = el('pre', 'prose__code');
        const inner = el('code', '', code.join('\n'));
        if (fence[1]) pre.dataset.lang = fence[1];
        pre.append(inner);
        out.append(pre);
        continue;
      }

      const heading = line.match(/^(#{2,3})\s+(.*)/);
      if (heading) {
        out.append(el(heading[1].length === 2 ? 'h2' : 'h3', '', heading[2]));
        i += 1;
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        const list = el('ul');
        collect(/^[-*]\s+/, /^[-*]\s+/).forEach((text) => { const li = el('li'); li.append(renderInline(text)); list.append(li); });
        out.append(list);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        const list = el('ol');
        collect(/^\d+\.\s+/, /^\d+\.\s+/).forEach((text) => { const li = el('li'); li.append(renderInline(text)); list.append(li); });
        out.append(list);
        continue;
      }

      if (/^>\s?/.test(line)) {
        const quote = el('blockquote');
        const p = el('p');
        p.append(renderInline(collect(/^>\s?/, /^>\s?/).join(' ')));
        quote.append(p);
        out.append(quote);
        continue;
      }

      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !/^(```|#{2,3}\s|[-*]\s|\d+\.\s|>)/.test(lines[i])) {
        paragraph.push(lines[i].trim());
        i += 1;
      }
      const p = el('p');
      p.append(renderInline(paragraph.join(' ')));
      out.append(p);
    }
    return out;
  };

  /* ---------- list view ---------- */
  const buildTagBar = () => {
    const bar = document.getElementById('journal-filters');
    const tags = ['All', ...new Set(posts.flatMap((post) => post.tags || []))];
    bar.replaceChildren();
    bar.hidden = tags.length < 3; // filtering is pointless for a single topic

    tags.forEach((tag) => {
      const button = el('button', 'filter', tag);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(tag === activeTag));
      button.addEventListener('click', () => { activeTag = tag; renderList(); });
      bar.append(button);
    });
  };

  const renderList = () => {
    buildTagBar();

    const list = document.getElementById('journal-entries');
    const count = document.getElementById('journal-count');
    const shown = posts.filter((post) => activeTag === 'All' || (post.tags || []).includes(activeTag));

    list.replaceChildren();
    count.textContent = `${shown.length} ${shown.length === 1 ? 'entry' : 'entries'}${activeTag === 'All' ? '' : ` tagged ${activeTag}`}`;

    if (!shown.length) {
      const empty = el('div', 'journal-empty');
      if (posts.length) {
        empty.append(el('strong', '', 'No entries with this tag yet.'), el('span', '', 'Try another tag, or show all entries.'));
        list.append(empty);
      } else {
        // Honest empty state: no entries yet, plus topics that come from real code
        empty.append(
          el('strong', '', 'No entries have been published yet.'),
          el('span', '', 'The journal will document technical decisions from my projects.'),
        );
        const link = el('a', 'text-link', 'See the projects');
        link.href = 'index.html#projects';
        empty.append(link);
        list.append(empty);

        if (Array.isArray(window.JOURNAL_IDEAS) && window.JOURNAL_IDEAS.length) {
          const ideas = el('div', 'journal-ideas');
          const items = el('ul', 'journal-ideas__list');
          window.JOURNAL_IDEAS.forEach((idea) => items.append(el('li', '', idea)));
          ideas.append(el('h2', 'journal-ideas__title', 'Ideas for the first entries'), items);
          list.append(ideas);
        }
      }
      count.textContent = '';
      return;
    }

    // Entries are shown as cards in a grid
    const grid = el('div', 'entry-grid');
    shown.forEach((post, index) => {
      const card = el('a', 'entry-card');
      card.href = post.url || `#/${encodeURIComponent(post.slug)}`;

      if (post.cover) {
        const media = el('div', 'entry-card__media');
        const img = el('img');
        img.src = post.cover;
        img.alt = post.coverAlt || '';
        img.loading = index === 0 ? 'eager' : 'lazy';
        img.decoding = 'async';
        media.append(img);
        card.append(media);
      }

      const body = el('div', 'entry-card__body');
      const meta = el('p', 'entry-card__meta');
      const date = el('time', '', formatDate(post.date, { day: 'numeric', month: 'short', year: 'numeric' }));
      date.dateTime = post.date;
      meta.append(date, ` · ${readingMinutes(post)} min read`);
      body.append(meta, el('h3', 'entry-card__title', post.title));
      if (post.summary) body.append(el('p', 'entry-card__summary', post.summary));

      const tagList = el('ul', 'tags');
      (post.tags || []).forEach((tag) => tagList.append(el('li', 'tag', tag)));
      body.append(tagList);

      card.append(body);
      grid.append(card);
    });
    list.append(grid);
  };

  /* ---------- single entry view ---------- */
  const renderArticle = (post) => {
    const article = el('article', 'entry');

    const back = el('a', 'text-link entry__back', '← All entries');
    back.href = '#/';

    const head = el('header', 'entry__head');
    const meta = el('p', 'entry__meta');
    const date = el('time', '', formatDate(post.date, { day: 'numeric', month: 'long', year: 'numeric' }));
    date.dateTime = post.date;
    meta.append(date, ` · ${readingMinutes(post)} min read`);

    const title = el('h1', 'entry__title', post.title);
    title.tabIndex = -1;
    title.id = 'entry-title';
    head.append(meta, title);
    if (post.summary) head.append(el('p', 'entry__summary', post.summary));

    const tagList = el('ul', 'tags');
    (post.tags || []).forEach((tag) => tagList.append(el('li', 'tag', tag)));
    head.append(tagList);

    article.append(back, head);

    if (post.example) {
      article.append(el('p', 'entry__notice', 'Example entry. Delete it from assets/js/posts.js when you add your own.'));
    }

    const prose = el('div', 'prose');
    prose.append(renderBody(post.body || ''));
    article.append(prose);

    const foot = el('footer', 'entry__foot');
    const backBottom = el('a', 'text-link', '← Back to all entries');
    backBottom.href = '#/';
    foot.append(backBottom);
    article.append(foot);

    articleView.replaceChildren(article);
    return title;
  };

  /* ---------- router ---------- */
  const route = (initial) => {
    const match = location.hash.match(/^#\/(.+)$/);
    const post = match && allPosts.find((item) => item.slug === decodeURIComponent(match[1]));

    if (post && post.url) {
      location.replace(post.url); // the entry lives on its own page
      return;
    }

    if (post) {
      indexView.hidden = true;
      articleView.hidden = false;
      const title = renderArticle(post);
      document.title = `${post.title} — ${BASE_TITLE}`;
      window.scrollTo(0, 0);
      if (!initial) title.focus({ preventScroll: true });
    } else {
      articleView.hidden = true;
      indexView.hidden = false;
      articleView.replaceChildren();
      document.title = BASE_TITLE;
      renderList();
      if (!initial) window.scrollTo(0, 0);
    }
  };

  window.addEventListener('hashchange', () => route(false));
  route(true);
})();
