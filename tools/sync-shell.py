#!/usr/bin/env python3
"""Keep the shared <head> basics, header and footer identical on every page.

The site is plain static HTML: each page is a complete, hand-editable file and nothing
needs to be built to publish it. This optional helper only exists so that a change to
the navigation or footer is made once, here, instead of in every page.

Usage (from the repository root, Python 3, standard library only):

    python tools/sync-shell.py

Every *.html file in the root is updated between its marker comments:

    <!-- shell:head:start --> ... <!-- shell:head:end -->
    <!-- shell:header:start --> ... <!-- shell:header:end -->
    <!-- shell:footer:start --> ... <!-- shell:footer:end -->
    <!-- shell:scripts:start --> ... <!-- shell:scripts:end -->   (GSAP, Lenis, motion.js, main.js)

The current page is taken from <body data-page="..."> and gets aria-current="page".
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

NAV = [
    ("home", "index.html", "Home"),
    ("projects", "projects.html", "Projects"),
    ("about", "about.html", "About"),
    ("experience", "experience.html", "Experience"),
    ("journal", "blog.html", "Journal"),
    ("contact", "contact.html", "Contact"),
]

SCRIPTS = """\
    <script src="assets/js/vendor/gsap.min.js"></script>
    <script src="assets/js/vendor/ScrollTrigger.min.js"></script>
    <script src="assets/js/vendor/ScrollToPlugin.min.js"></script>
    <script src="assets/js/vendor/lenis.min.js"></script>
    <script src="assets/js/motion.js"></script>
    <script src="assets/js/main.js?v=2"></script>"""

GITHUB = "https://github.com/muridabuhamed"
LINKEDIN = "https://www.linkedin.com/in/murid-abuhamed-48bbb2239/"

HEAD = """\
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#131416">
    <link rel="icon" href="assets/img/favicon.png" type="image/png">
    <link rel="preload" href="assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="assets/fonts/jetbrains-mono-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="assets/css/styles.css?v=3">
    <!-- Dark by default; apply a saved light choice before first paint to avoid a flash -->
    <script>
        (function () {
            var root = document.documentElement, theme;
            try { theme = localStorage.getItem('theme'); } catch (e) {}
            root.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                root.classList.add('has-motion');
                // safety net: never leave content hidden if the animation scripts fail to run
                setTimeout(function () { root.classList.remove('has-motion'); }, 4000);
            }
        })();
    </script>"""

SPRITE = """\
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
        <symbol id="i-arrow-up-right" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></symbol>
        <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
        <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></symbol>
        <symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>
        <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
        <symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></symbol>
        <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 8h16M4 16h16"/></symbol>
        <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>
        <symbol id="i-github" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></symbol>
        <symbol id="i-linkedin" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></symbol>
    </svg>"""


def header(page):
    items = []
    for key, href, label in NAV:
        current = ' aria-current="page"' if key == page else ""
        items.append(f'                    <li><a href="{href}" class="nav__link"{current}>{label}</a></li>')
    nav = "\n".join(items)
    return f"""\
{SPRITE}

    <a href="#main" class="skip-link">Skip to content</a>

    <header class="header" id="header">
        <div class="scroll-progress" aria-hidden="true"></div>
        <nav class="nav container" aria-label="Main">
            <a href="index.html" class="nav__logo" aria-label="Murid AbuHamed, home">murid<span>.</span></a>

            <div class="nav__menu" id="nav-menu">
                <ul class="nav__list">
{nav}
                </ul>
            </div>

            <div class="nav__actions">
                <button class="icon-button theme-toggle" type="button" id="theme-toggle" aria-label="Switch to light theme">
                    <svg class="icon icon--moon" aria-hidden="true"><use href="#i-moon"/></svg>
                    <svg class="icon icon--sun" aria-hidden="true"><use href="#i-sun"/></svg>
                </button>
                <button class="icon-button nav__toggle" type="button" id="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
                    <svg class="icon" aria-hidden="true"><use href="#i-menu"/></svg>
                </button>
            </div>
        </nav>
    </header>"""


def footer():
    links = "\n".join(f'                    <a href="{href}">{label}</a>' for _, href, label in NAV)
    return f"""\
    <footer class="footer">
        <div class="container">
            <div class="footer__row">
                <a href="index.html" class="nav__logo" aria-label="Murid AbuHamed, home">murid<span>.</span></a>
                <nav class="footer__nav" aria-label="Footer">
{links}
                    <a href="{GITHUB}" target="_blank" rel="noopener noreferrer">GitHub</a>
                    <a href="{LINKEDIN}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                </nav>
            </div>
            <p class="footer__copy">&copy; Murid AbuHamed. All rights reserved.</p>
        </div>
    </footer>

    <button class="icon-button scrollup" type="button" id="scroll-up" aria-label="Back to top">
        <svg class="icon" aria-hidden="true"><use href="#i-arrow-up"/></svg>
    </button>"""


def block(name, content):
    return f"<!-- shell:{name}:start -->\n{content}\n    <!-- shell:{name}:end -->"


def sync(path):
    text = path.read_text(encoding="utf-8")
    match = re.search(r'<body[^>]*data-page="([^"]+)"', text)
    page = match.group(1) if match else ""
    changed = text
    for name, content in (("head", HEAD), ("header", header(page)), ("footer", footer()), ("scripts", SCRIPTS)):
        pattern = re.compile(rf"<!-- shell:{name}:start -->.*?<!-- shell:{name}:end -->", re.S)
        if not pattern.search(changed):
            print(f"  {path.name}: no '{name}' markers, skipped")
            continue
        changed = pattern.sub(lambda _m, n=name, c=content: block(n, c), changed, count=1)
    if changed != text:
        path.write_text(changed, encoding="utf-8")
        print(f"  updated {path.name}")
    return changed != text


def main():
    pages = sorted(ROOT.glob("*.html"))
    print(f"Syncing shared markup in {len(pages)} pages")
    for path in pages:
        sync(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
