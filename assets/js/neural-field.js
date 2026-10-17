/* ==========================================================================
   Ambient neural field: a few slowly drifting nodes that link up when close,
   with an occasional signal travelling along a link. Used sparingly behind
   selected sections (contact, journal). Any element with [data-neural-field]
   becomes a field.

   Same rules as the hero: only animates while on screen, a single still frame
   for prefers-reduced-motion, no work per frame beyond one canvas redraw.
   ========================================================================== */
(() => {
  'use strict';

  const hosts = [...document.querySelectorAll('[data-neural-field]')];
  if (!hosts.length) return;

  const TAU = Math.PI * 2;
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const mulberry32 = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const readRGB = (style, name) => style.getPropertyValue(name).trim().split(/\s+/).map(Number);

  const makeGlow = ([r, g, b]) => {
    const sprite = document.createElement('canvas');
    sprite.width = 48;
    sprite.height = 48;
    const c = sprite.getContext('2d');
    const gradient = c.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
    gradient.addColorStop(0.4, `rgba(${r},${g},${b},0.25)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = gradient;
    c.fillRect(0, 0, 48, 48);
    return sprite;
  };

  const createField = (host, index) => {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    host.append(canvas);

    const rand = mulberry32(31 + index * 17);
    let w = 0; let h = 0;
    let nodes = [];
    let palette;
    const pulses = [];
    const LINK = coarse ? 110 : 130;

    const buildPalette = () => {
      const style = getComputedStyle(document.documentElement);
      const edge = readRGB(style, '--neural-edge');
      const node = readRGB(style, '--neural-node');
      const lime = readRGB(style, '--neural-a');
      const blue = readRGB(style, '--neural-b');
      const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
      palette = {
        edge: [rgba(edge, 0.07), rgba(edge, 0.13), rgba(edge, 0.2)],
        node: rgba(node, 0.5),
        glow: [makeGlow(lime), makeGlow(blue)],
      };
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round(Math.min(coarse ? 22 : 40, Math.max(14, (w * h) / 15000)));
      nodes = Array.from({ length: count }, () => ({
        x: rand() * w,
        y: rand() * h,
        vx: (rand() - 0.5) * 12,
        vy: (rand() - 0.5) * 12,
        r: 1 + rand() * 1.4,
      }));
      pulses.length = 0;
      return true;
    };

    const step = (dt) => {
      for (const n of nodes) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      // an occasional signal along a random link
      if (pulses.length < 3 && Math.random() < dt * 1.1) {
        const a = nodes[(Math.random() * nodes.length) | 0];
        const near = nodes.filter((b) => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < LINK);
        if (near.length) {
          pulses.push({ a, b: near[(Math.random() * near.length) | 0], t: 0, color: Math.random() < 0.65 ? 0 : 1 });
        }
      }
      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const p = pulses[i];
        p.t += dt * 0.7;
        if (p.t >= 1) pulses.splice(i, 1);
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const paths = [[], [], []];
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]; const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > LINK) continue;
          paths[Math.min(2, (((1 - d / LINK) * 3) | 0))].push(a, b);
        }
      }
      paths.forEach((pairs, band) => {
        ctx.beginPath();
        ctx.strokeStyle = palette.edge[band];
        ctx.lineWidth = 0.7;
        for (let k = 0; k < pairs.length; k += 2) {
          ctx.moveTo(pairs[k].x, pairs[k].y);
          ctx.lineTo(pairs[k + 1].x, pairs[k + 1].y);
        }
        ctx.stroke();
      });

      ctx.fillStyle = palette.node;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, TAU);
        ctx.fill();
      }
      for (const p of pulses) {
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.globalAlpha = Math.sin(p.t * Math.PI);
        ctx.drawImage(palette.glow[p.color], x - 12, y - 12, 24, 24);
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0; let running = false; let last = 0; let visible = false;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      step(dt);
      draw();
    };
    const start = () => {
      if (running || reduceQuery.matches || !w) return;
      running = true; last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const settle = () => {
      if (!resize()) return;
      if (reduceQuery.matches) {
        // one still frame with a couple of signals mid-flight
        for (let k = 0; k < 2; k += 1) {
          const a = nodes[k * 5 % nodes.length];
          const b = nodes.find((n) => n !== a && Math.hypot(a.x - n.x, a.y - n.y) < LINK);
          if (b) pulses.push({ a, b, t: 0.5, color: k });
        }
        draw();
      } else if (!running) {
        draw();
      }
      host.classList.add('is-live');
    };

    buildPalette();
    new ResizeObserver(settle).observe(host);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) start(); else stop();
    }).observe(host);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else if (visible) start();
    });
    reduceQuery.addEventListener('change', () => {
      if (reduceQuery.matches) { stop(); settle(); } else if (visible) start();
    });
    new MutationObserver(() => { buildPalette(); if (!running) draw(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  };

  hosts.forEach(createField);
})();
