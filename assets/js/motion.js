/* ==========================================================================
   Motion layer, built on GSAP (hosted locally in assets/js/vendor).

   What it does
   - Lenis: eased wheel scrolling on top of native scrolling, driven by GSAP's ticker
   - hero entrance timeline and a gentle parallax on the neural visual
   - blur-in word reveals for headings and a cursor spotlight on cards (small vanilla
     versions of effects in the style of React Bits; no React is used)
   - pinned scroll stories (large screens): the home capabilities and the featured
     case studies change chapter as you scroll
   - staggered entrances for page heads, section heads, skills, diagram steps
   - scroll-triggered reveals for anything marked .reveal
   - eased scrolling to in-page anchors, a scroll-progress line, fades between pages
   - a slight magnetic pull on primary buttons (fine pointers only)

   Safety
   - Nothing is hidden unless this script runs: the head script adds .has-motion and
     removes it again after 4 seconds, and this script removes it once every animated
     element has been given its starting state.
   - prefers-reduced-motion: the whole layer is skipped and all content stays visible.
   - Only opacity and transform are animated, and unrevealed content stays in the
     accessibility tree and the tab order (no visibility:hidden).
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const release = () => root.classList.remove('has-motion');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const g = window.gsap;

  if (reduced || !g || !window.ScrollTrigger) {
    release();
    return;
  }

  window.__motionActive = true; // tells main.js not to run its own reveal fallback
  g.registerPlugin(...[window.ScrollTrigger, window.ScrollToPlugin].filter(Boolean));
  g.defaults({ ease: 'power3.out', duration: 0.9 });
  root.style.scrollBehavior = 'auto'; // GSAP owns smooth scrolling, so CSS smoothing must not fight it

  const $ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const hide = (targets, vars = {}) => { if (targets.length) g.set(targets, { opacity: 0, ...vars }); };
  const show = { opacity: 1, y: 0, clearProps: 'transform' };

  /* ---------- Lenis: smooth wheel scrolling, kept in step with ScrollTrigger ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis; // main.js pauses it while the mobile menu is open
    lenis.on('scroll', window.ScrollTrigger.update);
    g.ticker.add((time) => lenis.raf(time * 1000));
    g.ticker.lagSmoothing(0);
  }

  /* ---------- split a heading into word spans, keeping inline tags such as <em> ---------- */
  const splitWords = (element) => {
    const words = [];
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const fragment = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { fragment.append(document.createTextNode(' ')); return; }
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            words.push(span);
            fragment.append(span);
          });
          child.replaceWith(fragment);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(element);
    return words;
  };
  const wordsIn = { opacity: 1, y: 0, filter: 'blur(0px)', clearProps: 'transform,filter' };

  /* ---------- hero entrance and parallax ---------- */
  const hero = $('.hero')[0];
  if (hero) {
    const eyebrow = $('.hero__inner > .eyebrow');
    const title = $('.hero__title');
    const intro = $('.hero__intro');
    const buttons = $('.hero__actions .button');
    const links = $('.hero__links .text-link');
    const neural = $('.neural');

    hide(eyebrow, { y: 16 });
    const titleWords = title.length ? splitWords(title[0]) : [];
    if (titleWords.length) {
      g.set(title, { opacity: 1 });
      hide(titleWords, { y: 28, filter: 'blur(10px)' });
    } else {
      hide(title, { y: 40 });
    }
    hide(intro, { y: 24 });
    hide(buttons, { y: 20 });
    hide(links, { y: 12 });
    hide(neural, { scale: 0.92 });

    g.timeline({ delay: 0.1 })
      .to(eyebrow, { ...show, duration: 0.7 })
      .to(titleWords.length ? titleWords : title, { ...(titleWords.length ? wordsIn : show), stagger: titleWords.length ? 0.07 : 0, duration: 0.9 }, '-=0.45')
      .to(intro, { ...show }, '-=0.65')
      .to(buttons, { ...show, stagger: 0.1, duration: 0.7 }, '-=0.55')
      .to(links, { ...show, stagger: 0.08, duration: 0.6 }, '-=0.45')
      .to(neural, { opacity: 1, scale: 1, duration: 1.6 }, 0.25);

    if (neural.length) {
      g.to(neural, {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });
    }
  }

  /* ---------- page heads on inner pages ---------- */
  const headParts = $('.page-head .container > *:not(.about-head), .page-head .about-head__text > *, .page-head .about__portrait, .journal-head > :not(.neural-field)');
  if (headParts.length) {
    const pageTitle = headParts.find((el) => el.matches('.page-head__title, h1'));
    const pageWords = pageTitle ? splitWords(pageTitle) : [];
    const others = headParts.filter((el) => el !== pageTitle || !pageWords.length);
    hide(others, { y: 24 });
    if (pageWords.length) {
      g.set(pageTitle, { opacity: 1 });
      hide(pageWords, { y: 24, filter: 'blur(8px)' });
    }
    const tl = g.timeline({ delay: 0.1 }).to(others, { ...show, stagger: 0.09 });
    if (pageWords.length) tl.to(pageWords, { ...wordsIn, stagger: 0.06, duration: 0.8 }, 0.1);
  }

  /* ---------- helper: run an animation once when an element scrolls into view ---------- */
  const onceInView = (trigger, start, animate) => {
    window.ScrollTrigger.create({ trigger, start, once: true, onEnter: animate });
  };

  /* ---------- section heads ---------- */
  $('.section__head').forEach((head) => {
    const title = head.querySelector('.section__title');
    const words = title ? splitWords(title) : [];
    const parts = [...head.children].filter((el) => el !== title || !words.length);
    hide(parts, { y: 22 });
    if (words.length) {
      g.set(title, { opacity: 1 });
      hide(words, { y: 22, filter: 'blur(8px)' });
    }
    onceInView(head, 'top 88%', () => {
      const tl = g.timeline().to(parts, { ...show, stagger: 0.09 });
      if (words.length) tl.to(words, { ...wordsIn, stagger: 0.06, duration: 0.8 }, 0.1);
    });
  });

  /* ---------- closing call to action ---------- */
  $('.cta__title').forEach((title) => {
    const words = splitWords(title);
    hide(words, { y: 24, filter: 'blur(8px)' });
    onceInView(title, 'top 88%', () => g.to(words, { ...wordsIn, stagger: 0.05, duration: 0.8 }));
  });

  /* ---------- generic reveals ---------- */
  const reveals = $('.reveal:not(.facts)');
  hide(reveals, { y: 28 });
  window.ScrollTrigger.batch(reveals, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => g.to(batch, { ...show, stagger: 0.1, overwrite: 'auto' }),
  });

  /* ---------- facts strip ---------- */
  const facts = $('.facts');
  if (facts.length) {
    const items = $('.facts__item', facts[0]);
    hide(items, { y: 18 });
    onceInView(facts[0], 'top 92%', () => g.to(items, { ...show, stagger: 0.12, duration: 0.8 }));
  }

  /* ---------- skills: rows appear in sequence inside their group ---------- */
  $('.skill-group').forEach((group) => {
    const items = $('.skill', group);
    hide(items, { y: 14 });
    onceInView(group, 'top 85%', () => g.to(items, { ...show, stagger: 0.05, duration: 0.6, delay: 0.1 }));
  });

  /* ---------- diagrams and case-study sections ---------- */
  $('.flow').forEach((flow) => {
    const steps = $('.flow__step', flow);
    hide(steps, { y: 16 });
    onceInView(flow, 'top 85%', () => g.to(steps, { ...show, stagger: 0.12, duration: 0.7 }));
  });

  $('.article__section').forEach((section) => {
    hide([section], { y: 24 });
    onceInView(section, 'top 88%', () => g.to(section, { ...show }));
  });

  /* ---------- scroll stories: a section pins and changes chapter as you scroll ---------- */
  const mq = g.matchMedia();
  $('.scrolly').forEach((story) => {
    const track = story.querySelector('.scrolly__track');
    const chapters = $('.scrolly__chapters > *', story);
    const rail = $('.scrolly__rail li', story);
    const fill = story.querySelector('.scrolly__bar span');
    const counter = story.querySelector('.scrolly__count');
    const n = chapters.length;

    // large screens only; phones and short windows keep the plain list
    mq.add('(min-width: 900px) and (min-height: 560px)', () => {
      story.classList.add('scrolly-active');

      const setActive = (index) => {
        chapters.forEach((chapter, i) => {
          chapter.style.pointerEvents = i === index ? 'auto' : 'none';
          chapter.querySelectorAll('a').forEach((a) => { a.tabIndex = i === index ? 0 : -1; }); // hidden chapters stay out of the tab order
        });
        rail.forEach((item, i) => {
          item.classList.toggle('is-active', i === index);
          item.classList.toggle('is-done', i < index);
        });
        counter.textContent = `0${index + 1} / 0${n}`;
      };

      g.set(chapters, { opacity: 0, y: 36 });
      g.set(chapters[0], { opacity: 1, y: 0 });
      setActive(0);

      // each chapter holds for most of its slot, then cross-fades into the next
      const timeline = g.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: track,
          start: () => `top top+=${header ? header.offsetHeight : 64}`,
          end: 'bottom bottom',
          scrub: 0.5,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            fill.style.transform = `scaleX(${self.progress})`;
            setActive(Math.min(n - 1, Math.floor(self.progress * n + 0.15)));
          },
        },
      });
      for (let i = 1; i < n; i += 1) {
        timeline.to(chapters[i - 1], { opacity: 0, y: -36, duration: 0.3 }, i - 0.3);
        timeline.to(chapters[i], { opacity: 1, y: 0, duration: 0.3 }, i - 0.3);
      }
      timeline.to({}, { duration: 0.0001 }, n); // pad the timeline so the last chapter holds until the end

      return () => {
        story.classList.remove('scrolly-active');
        chapters.forEach((chapter) => {
          chapter.style.removeProperty('pointer-events');
          chapter.querySelectorAll('a').forEach((a) => a.removeAttribute('tabindex'));
        });
        fill.style.removeProperty('transform');
      };
    });
  });

  /* ---------- scroll-progress line ---------- */
  const progress = $('.scroll-progress')[0];
  if (progress) {
    g.to(progress, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    });
  }

  /* ---------- eased scrolling to in-page anchors ---------- */
  const header = document.getElementById('header');
  const focusTarget = (target) => {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  const scrollToTarget = (target) => {
    const offset = -((header ? header.offsetHeight : 0) + 16);
    if (lenis) {
      lenis.scrollTo(target, { offset, duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: () => focusTarget(target) });
      return true;
    }
    if (!window.ScrollToPlugin) return false;
    g.to(window, {
      duration: 0.9,
      ease: 'power3.inOut',
      scrollTo: { y: target, offsetY: -offset, autoKill: true },
      onComplete: () => focusTarget(target),
    });
    return true;
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const hash = link.getAttribute('href');
    if (hash === '#' || hash.startsWith('#/')) return; // journal routes handle themselves
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target && scrollToTarget(target)) {
      event.preventDefault();
      history.pushState(null, '', hash);
    }
  });

  /* ---------- soft fades between pages ---------- */
  const pageParts = () => $('main, .footer');
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
    if (url.pathname === location.pathname) return; // same page: anchors and journal routes are handled elsewhere
    event.preventDefault();
    const go = () => { location.href = url.href; };
    g.to(pageParts(), { opacity: 0, y: -8, duration: 0.28, ease: 'power2.in', overwrite: true, onComplete: go });
    window.setTimeout(go, 700); // never get stuck if the tween does not finish
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) g.set(pageParts(), { opacity: 1, y: 0, clearProps: 'transform' }); // back/forward cache
  });

  /* ---------- a slight magnetic pull on primary buttons ---------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $('.button--primary').forEach((button) => {
      const moveX = g.quickTo(button, 'x', { duration: 0.4, ease: 'power3' });
      const moveY = g.quickTo(button, 'y', { duration: 0.4, ease: 'power3' });
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        moveX(Math.max(-6, Math.min(6, (event.clientX - rect.left - rect.width / 2) * 0.12)));
        moveY(Math.max(-4, Math.min(4, (event.clientY - rect.top - rect.height / 2) * 0.12)));
      });
      button.addEventListener('pointerleave', () => { moveX(0); moveY(0); });
    });
  }

  /* ---------- cursor spotlight on cards (fine pointers only) ---------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $('.project, .next__link').forEach((card) => {
      card.setAttribute('data-spot', '');
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- measure again once images and fonts have settled ---------- */
  const refresh = () => window.ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  // every animated element now has its starting state as an inline style, so the CSS pre-hide can go
  release();
})();
