/* ==========================================================================
   Shared behaviour for every page: theme, mobile menu, scroll effects,
   journal teaser and the contact form.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme ---------- */
  const themeToggle = $('#theme-toggle');
  const themeColor = $('meta[name="theme-color"]');

  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    if (themeColor) themeColor.setAttribute('content', theme === 'light' ? '#f5f4ef' : '#0b0c0d');
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
  };

  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
    });
  }

  /* ---------- Mobile menu ---------- */
  const menu = $('#nav-menu');
  const menuToggle = $('#nav-toggle');

  const setMenu = (open) => {
    if (!menu || !menuToggle) return;
    menu.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuToggle.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (window.__lenis) window.__lenis[open ? 'stop' : 'start'](); // no wheel scrolling behind the open menu
  };

  if (menu && menuToggle) {
    menuToggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    $$('.nav__link', menu).forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        menuToggle.focus();
      }
    });
    window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  // Content is only hidden (via .reveal-ready) once this script is running, so a script
  // failure or a missing IntersectionObserver can never leave the page blank.
  const revealItems = $$('.reveal');
  if (revealItems.length && !reducedMotion && !window.__motionActive && 'IntersectionObserver' in window) {
    root.classList.add('reveal-ready');

    const pending = revealItems.filter((item) => {
      const rect = item.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) item.classList.add('is-visible');
      return !inView;
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    pending.forEach((item) => revealObserver.observe(item));
  }

  /* ---------- Section signal line: runs once when a section comes into view ---------- */
  const signalSections = $$('.section');
  if (signalSections.length && 'IntersectionObserver' in window) {
    const signalObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-live');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -35% 0px' });
    signalSections.forEach((section) => signalObserver.observe(section));
  }

  /* ---------- Header state and scroll-to-top button ---------- */
  const header = $('#header');
  const scrollUp = $('#scroll-up');
  let ticking = false;

  const onScroll = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    if (scrollUp) scrollUp.classList.toggle('is-visible', window.scrollY > 600);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  if (scrollUp) {
    scrollUp.addEventListener('click', () => {
      if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.2 });
      else window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Journal teaser on the home page: appears only when real entries exist ---------- */
  const latest = $('#journal-latest');
  const journalSection = $('#journal');
  if (latest && journalSection && Array.isArray(window.POSTS)) {
    const published = window.POSTS
      .filter((post) => !post.example)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);

    if (published.length) {
      latest.replaceChildren(...published.map((post) => {
        const row = document.createElement('a');
        row.className = 'journal-row';
        row.href = post.url || `blog.html#/${encodeURIComponent(post.slug)}`;

        const date = document.createElement('time');
        date.className = 'journal-row__date';
        date.dateTime = post.date;
        date.textContent = new Date(`${post.date}T00:00:00Z`)
          .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

        const title = document.createElement('span');
        title.className = 'journal-row__title';
        title.textContent = post.title;

        const tags = document.createElement('span');
        tags.className = 'tag';
        tags.textContent = (post.tags && post.tags[0]) || 'Note';

        row.append(date, title, tags);
        return row;
      }));
      journalSection.hidden = false;
    }
  }

  /* ---------- Contact form (EmailJS, loaded on first use) ---------- */
  const form = $('#contact-form');
  if (form) {
    const EMAILJS = {
      src: 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3.12.1/dist/email.min.js',
      service: 'service_scpurbm',
      template: 'template_fy52q0s',
      publicKey: '8npKr3zMGZb_-CQ00',
    };
    const status = $('#contact-status');
    const submit = $('#contact-submit');

    let emailjsLoaded;
    const loadEmailJS = () => {
      if (window.emailjs) return Promise.resolve();
      if (!emailjsLoaded) {
        emailjsLoaded = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = EMAILJS.src;
          script.onload = resolve;
          script.onerror = () => { emailjsLoaded = null; reject(new Error('EmailJS failed to load')); };
          document.head.append(script);
        });
      }
      return emailjsLoaded;
    };

    const setStatus = (state, message) => {
      status.dataset.state = state;
      status.textContent = message;
    };

    // Start loading as soon as the visitor shows intent, so sending feels instant.
    form.addEventListener('focusin', () => loadEmailJS().catch(() => {}), { once: true });

    const fields = $$('input, textarea', form);
    fields.forEach((field) => field.addEventListener('input', () => field.removeAttribute('aria-invalid')));

    const problem = (field) => {
      if (field.validity.valueMissing) {
        return { 'contact-name': 'Please enter your name.', 'contact-email': 'Please enter your email.', 'contact-project': 'Please tell me a little about your project.' }[field.id];
      }
      if (field.validity.typeMismatch) return 'Please enter a valid email address, for example name@example.com.';
      return '';
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const invalid = fields.filter((field) => !field.checkValidity());
      fields.forEach((field) => {
        if (invalid.includes(field)) field.setAttribute('aria-invalid', 'true');
        else field.removeAttribute('aria-invalid');
      });

      if (invalid.length) {
        setStatus('error', problem(invalid[0]));
        invalid[0].focus();
        return;
      }

      submit.disabled = true;
      setStatus('', 'Sending…');

      try {
        await loadEmailJS();
        await window.emailjs.sendForm(EMAILJS.service, EMAILJS.template, form, EMAILJS.publicKey);
        form.reset();
        setStatus('success', 'Message sent. Thank you!');
      } catch (error) {
        setStatus('error', 'Sorry, the message could not be sent. Please email me directly at abuhamedmored@gmail.com.');
      } finally {
        submit.disabled = false;
      }
    });
  }
})();
