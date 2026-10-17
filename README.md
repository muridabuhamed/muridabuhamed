# Murid Abu Hamed - Personal Portfolio Website

The portfolio of **Murid AbuHamed**, a software engineer who builds intelligent applications: React and TypeScript interfaces, Python, Java and PHP backends, and integrations with language models (Google Gemini and local models through Ollama).

## Live site

👉 [muridabuhamed.github.io/muridabuhamed](https://muridabuhamed.github.io/muridabuhamed/)

Plain static HTML, CSS and JavaScript, hosted on GitHub Pages. There is no framework, bundler or build step: every page is a complete HTML file that can be edited by hand.

## Pages

| Page | File | Purpose |
|------|------|---------|
| Home | `index.html` | Introduction, animated neural-network hero, three featured case studies, what I can build |
| Projects | `projects.html` | All 14 projects in three levels: case studies, additional engineering projects, small experiments |
| Case studies | `project-umc.html`, `project-cleverstudy.html`, `project-ollama-chat.html` | Problem, architecture, decisions, code excerpts, status and limitations, written from the source code |
| About | `about.html` | Background, patterns used when integrating LLMs, skills with honest levels |
| Experience | `experience.html` | Roles, education, certifications, references |
| Journal | `blog.html` | Engineering journal, driven by `assets/js/posts.js` |
| Contact | `contact.html` | Channels and a contact form (EmailJS) |
| Not found | `404.html` | Served by GitHub Pages for unknown URLs |

## Features

- Dark charcoal design with a lime accent, and a deliberately designed light theme that remembers the visitor's choice
- Hero visual: a procedurally generated neural "brain" on a canvas, with signals travelling along the connections. It pauses when off-screen, shows a still frame for `prefers-reduced-motion`, and falls back to an image if scripts fail
- Accessible: skip link, landmarks, visible focus states, keyboard-operable menu, sufficient contrast, descriptive alt text
- Self-hosted fonts (Inter, JetBrains Mono) and optimized WebP images; no third-party requests until the contact form is used

## Animation

Motion is handled by [GSAP](https://gsap.com) 3.13 (core, ScrollTrigger and ScrollToPlugin, free under GSAP's [standard license](https://gsap.com/standard-license)) and [Lenis](https://lenis.darkroom.engineering) 1.3 (MIT) for smooth wheel scrolling. Both are hosted locally in `assets/js/vendor/`, so no third-party requests are made. `assets/js/motion.js` holds all of the animation: the hero entrance, blur-in word reveals for headings, staggered reveals, a gentle parallax on the neural visual, eased anchor scrolling through Lenis, a scroll-progress line, fades between pages and a cursor spotlight on cards.

- **Scroll stories**: on large screens the "What I can build" section (home) and the "Featured case studies" section (projects) stay pinned while their three chapters change as you scroll. Any section with the `.scrolly` markup gets the effect (`motion.js`, a scrubbed ScrollTrigger timeline); add `scrolly--wide` for full-width chapters. On phones, short windows and with reduced motion it is the plain list.
- It is skipped completely when the visitor prefers reduced motion, and content stays visible if the scripts fail to load. Touch scrolling stays native.
- To animate a new element, give it the `reveal` class. For something custom, add its selector to `motion.js` and to the `.has-motion` list in `styles.css`, so it starts hidden without a flash.
- Only opacity, transforms and a short blur are animated.
- The word reveal and the spotlight are small vanilla-JavaScript versions of effects in the style of [React Bits](https://reactbits.dev). React Bits itself is a React library and this site deliberately uses no React or build step, so none of its code is included. (React Bits is MIT with the Commons Clause, which permits use inside a website but not selling the components.)

## Project structure

- `*.html` – the pages above
- `assets/css/styles.css` – design system (tokens, components) and all page styles
- `assets/css/blog.css` – journal-specific styles
- `assets/js/motion.js` – GSAP animation layer
- `assets/js/vendor/` – GSAP, ScrollTrigger, ScrollToPlugin and Lenis (locally hosted)
- `assets/js/main.js` – theme, mobile menu, scroll effects, contact form
- `assets/js/neural-brain.js` – the hero animation
- `assets/js/neural-field.js` – the faint ambient network on the contact and journal pages
- `assets/js/posts.js` – journal entries
- `assets/js/blog.js` – journal rendering
- `assets/fonts/`, `assets/img/opt/` – fonts and optimized images (the original PNGs in `assets/img/` are not loaded by any page)
- `tools/sync-shell.py` – optional helper, see below
- `sitemap.xml`, `robots.txt` – search metadata (URLs assume the GitHub Pages address)

## Editing the navigation or footer

The header, footer and a few shared `<head>` tags are identical on every page. They live between marker comments (`<!-- shell:header:start -->` and so on). To change them once and apply the change everywhere:

1. Edit the `NAV`, `header()` or `footer()` definitions in `tools/sync-shell.py`.
2. Run `python tools/sync-shell.py` from the repository root (Python 3, no packages needed).

The helper is only a convenience. The pages themselves never need it to be served.

## Adding a journal entry

1. Open `assets/js/posts.js`.
2. Copy the example entry (or the template in the comment at the top) and paste it at the top of the list.
3. Give it a unique `slug`, a `title`, a `date` (`YYYY-MM-DD`), `tags`, a one or two sentence `summary`, and a `body`.
4. Entries marked `example: true` are documentation only: they stay out of the public list, and you can preview them at `blog.html?examples`. Delete the example once you have real entries.

For a long article that needs tables, diagrams or a table of contents, give it its own page instead (see `journal-rea-flow-clone.html`, which uses the case-study layout plus the article styles at the end of `assets/css/blog.css`). Add an entry to `posts.js` with a `url` pointing to that page and an estimated `minutes`, and no `body`: the journal list and the home page then link straight to the page.

Inside `body`: a blank line starts a new paragraph, `## Heading`, `- list item`, `> quote`, `` `inline code` ``, `**bold**`, `[link](https://...)`, and fenced code blocks with triple backticks. Entries are sorted by date, and the three newest appear on the home page. While no real entries exist, the journal lists `JOURNAL_IDEAS` (also in `posts.js`) instead.

## Adding or changing a skill

Skills on `about.html` sit in five groups: AI and LLM engineering, AI development tools, backend and software architecture, frontend and full-stack development, and testing, monitoring and infrastructure. Each skill is one `<li class="skill">` with a name, a one-sentence note on how it is used, and links to the project that shows it.

To add a skill, copy an existing `<li>` into the right group (move it to recategorise), then set `data-status`. Each skill shows its status as a label on its row. The legend lists only the statuses that are in use, so the Coursework entry appears automatically if a skill is given that status.

| `data-status` | Label | Meaning |
|---------------|-------|---------|
| `used` | Used in projects | Verified in a project on this site. Not for tools that were only installed, tried or followed in a tutorial. |
| `coursework` | Coursework | Used in an academic or training context. |

Rules for this page: list a technology only if a repository, certification or course supports it, say specifically how it is used, and link the evidence. Do not describe a tool as production experience unless it was.

Tools without evidence yet (LangChain, LangGraph, Langfuse or LangSmith, RAG, embeddings and vector databases, agent frameworks, Sentry, CI/CD, GitHub Copilot, and Docker in my own projects) are kept as a ready-to-use commented block at the end of the skills section in `about.html`. To list one, move its `<li>` into a group, fill in the bracketed text, set its status to `used` or `coursework`, and link a project that supports it.

## Adding or changing a project

- Small projects live in `projects.html`. Copy an existing card; keep the description limited to what the repository shows.
- A case study is its own page. Copy `project-ollama-chat.html`, keep the structure (overview, challenge, architecture, decisions, technologies, status and limitations), and link it from `projects.html` and the home page.
- Add a screenshot as WebP in `assets/img/opt/`, with `width`, `height` and `alt`. A project without a screenshot uses the plain stack tile (`project__media--plain`).

## Running locally

Open `index.html` in a browser, or serve the folder so that it behaves like GitHub Pages:

```
python -m http.server 8000
```

then visit http://localhost:8000.

## Publishing

The site is published from the `main` branch with GitHub Pages (Settings → Pages → Deploy from a branch → `main` / root). After committing and pushing to `main`, the new version is live within a minute or two.
