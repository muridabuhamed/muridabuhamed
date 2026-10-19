/* ==========================================================================
   Hero visual: an animated, procedurally generated neural "brain".

   - A point cloud is sampled inside a brain-shaped volume (hemispheres, temporal
     lobes, cerebellum, brain stem) and wired to its nearest neighbours.
   - Signals travel along the connections; each arrival lights a node and can
     trigger further signals, like activity spreading through a network.
   - The model turns slowly and tilts towards the pointer on desktop.

   Performance: one canvas, no per-frame DOM work, no shadowBlur (glows are
   pre-rendered sprites), edges drawn in three batched paths. The loop only runs
   while the visual is on screen, and prefers-reduced-motion gets a single still frame.
   ========================================================================== */
(() => {
  'use strict';

  const host = document.querySelector('[data-neural-brain]');
  const canvas = host && host.querySelector('canvas');
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  const TAU = Math.PI * 2;
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrowQuery = window.matchMedia('(max-width: 640px)');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const hero = host.closest('.hero') || host;

  /* ---------- brain-shaped volume ---------- */
  // [centre x, y, z, radius x, y, z]; +x is the front of the brain
  const SHAPE = [
    [0.12, 0.2, 0.3, 1.02, 0.68, 0.5], // left hemisphere (frontal, parietal, occipital)
    [0.12, 0.2, -0.3, 1.02, 0.68, 0.5], // right hemisphere
    [0.3, -0.46, 0.36, 0.55, 0.22, 0.3], // temporal lobes
    [0.3, -0.46, -0.36, 0.55, 0.22, 0.3],
    [-0.68, -0.52, 0.0, 0.4, 0.25, 0.44], // cerebellum
    [-0.16, -0.88, 0.0, 0.14, 0.36, 0.14], // brain stem
  ];

  // The lateral fissure: a groove on both sides running from front-low to back-high
  const FISSURE_A = [0.74, -0.2];
  const FISSURE_B = [-0.22, 0.14];
  const nearFissure = (x, y, z) => {
    if (Math.abs(z) < 0.3) return false;
    const abx = FISSURE_B[0] - FISSURE_A[0]; const aby = FISSURE_B[1] - FISSURE_A[1];
    const t = Math.max(0, Math.min(1, ((x - FISSURE_A[0]) * abx + (y - FISSURE_A[1]) * aby) / (abx * abx + aby * aby)));
    const dx = x - (FISSURE_A[0] + abx * t); const dy = y - (FISSURE_A[1] + aby * t);
    return dx * dx + dy * dy < 0.075 * 0.075;
  };

  // < 1 inside the volume; a ripple on the surface hints at the folds of the cortex
  const depthOf = (x, y, z) => {
    if (nearFissure(x, y, z)) return 2;
    let best = Infinity;
    for (const [cx, cy, cz, rx, ry, rz] of SHAPE) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const dz = (z - cz) / rz;
      const q = dx * dx + dy * dy + dz * dz;
      if (q < best) best = q;
    }
    const ripple = 1 + 0.1 * Math.sin(9 * x + 2.3) * Math.sin(8 * y - 1.1) + 0.06 * Math.sin(10 * z + 4 * x);
    return Math.sqrt(best) / ripple;
  };

  const mulberry32 = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------- graph ---------- */
  let N = 0;
  let X; let Y; let Z; let TYPE; let ACT; let SX; let SY; let SD;
  let edges = [];
  let adjacency = [];
  let buckets;
  const pulses = [];

  const buildGraph = (target) => {
    const rand = mulberry32(11);
    const minD2 = 0.12 * 0.12;
    const pts = [];
    for (let tries = 0; pts.length < target && tries < 60000; tries += 1) {
      const x = -1.2 + rand() * 2.5;
      const y = -1.1 + rand() * 2.1;
      const z = -0.9 + rand() * 1.8;
      const s = depthOf(x, y, z);
      if (s >= 1) continue;
      if (rand() > (s > 0.8 ? 0.97 : 0.06)) continue; // a defined outline, a few inner nodes
      let free = true;
      for (const p of pts) {
        const dx = p[0] - x; const dy = p[1] - y; const dz = p[2] - z;
        if (dx * dx + dy * dy + dz * dz < minD2) { free = false; break; }
      }
      if (free) pts.push([x, y, z]);
    }

    N = pts.length;
    X = new Float32Array(N); Y = new Float32Array(N); Z = new Float32Array(N);
    TYPE = new Uint8Array(N); ACT = new Float32Array(N);
    SX = new Float32Array(N); SY = new Float32Array(N); SD = new Float32Array(N);
    pts.forEach((p, i) => {
      X[i] = p[0]; Y[i] = p[1]; Z[i] = p[2];
      const r = rand();
      TYPE[i] = r < 0.16 ? 1 : r < 0.3 ? 2 : 0; // neutral, lime, blue
    });

    const seen = new Set();
    edges = [];
    adjacency = Array.from({ length: N }, () => []);
    for (let i = 0; i < N; i += 1) {
      const near = [];
      for (let j = 0; j < N; j += 1) {
        if (j === i) continue;
        const dx = X[i] - X[j]; const dy = Y[i] - Y[j]; const dz = Z[i] - Z[j];
        near.push([dx * dx + dy * dy + dz * dz, j]);
      }
      near.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < 3 && k < near.length; k += 1) {
        const [d2, j] = near[k];
        if (d2 > 0.3 * 0.3) continue;
        const key = i < j ? i * N + j : j * N + i;
        if (seen.has(key)) continue;
        seen.add(key);
        const e = edges.length;
        edges.push({ a: i, b: j, len: Math.sqrt(d2) });
        adjacency[i].push(e);
        adjacency[j].push(e);
      }
    }
    buckets = [new Int32Array(edges.length), new Int32Array(edges.length), new Int32Array(edges.length)];
    pulses.length = 0;
  };

  /* ---------- palette (read from CSS so both themes work) ---------- */
  let palette;
  const readRGB = (style, name) => style.getPropertyValue(name).trim().split(/\s+/).map(Number);

  const makeGlow = ([r, g, b]) => {
    const sprite = document.createElement('canvas');
    sprite.width = 64;
    sprite.height = 64;
    const c = sprite.getContext('2d');
    const gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
    gradient.addColorStop(0.35, `rgba(${r},${g},${b},0.3)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = gradient;
    c.fillRect(0, 0, 64, 64);
    return sprite;
  };

  const buildPalette = () => {
    const style = getComputedStyle(document.documentElement);
    const node = readRGB(style, '--neural-node');
    const edge = readRGB(style, '--neural-edge');
    const lime = readRGB(style, '--neural-a');
    const blue = readRGB(style, '--neural-b');
    const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
    const levels = [0, 1, 2, 3, 4, 5];
    palette = {
      edge: [rgba(edge, 0.07), rgba(edge, 0.14), rgba(edge, 0.26)],
      nodes: [node, lime, blue].map((c) => levels.map((l) => rgba(c, 0.25 + l * 0.14))),
      core: [lime, lime, blue].map((c) => rgba(c, 1)),
      glow: [makeGlow(lime), makeGlow(lime), makeGlow(blue)],
      pulse: [makeGlow(lime), makeGlow(blue)],
    };
  };

  /* ---------- sizing ---------- */
  let w = 0; let h = 0; let scale = 1; let cx = 0; let cy = 0;
  const resize = () => {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(w, h) * 0.37;
    cx = w * 0.5;
    cy = h * 0.5 + h * 0.015;
  };

  /* ---------- simulation ---------- */
  const MAX_PULSES = 26;
  let rotY = 0; let rotX = 0;
  let targetY = 0; let targetX = 0;
  let pointer = null; // { x, y } in canvas pixels
  let fireTimer = 0;

  const spawnPulse = (edgeIndex, from, energy) => {
    if (pulses.length >= MAX_PULSES) return;
    const e = edges[edgeIndex];
    pulses.push({
      edge: edgeIndex,
      dir: from === e.a ? 1 : -1, // 1: a -> b
      t: 0,
      speed: 1.1 + Math.random() * 0.7,
      energy,
      color: Math.random() < 0.62 ? 0 : 1,
    });
  };

  const fire = (node, energy) => {
    ACT[node] = Math.max(ACT[node], energy);
    const list = adjacency[node];
    if (!list.length) return;
    const count = energy > 0.9 ? 2 : 1;
    for (let k = 0; k < count; k += 1) spawnPulse(list[(Math.random() * list.length) | 0], node, energy * 0.82);
  };

  const update = (dt, time) => {
    // slow turntable swing plus pointer tilt
    const swing = Math.sin(time * 0.2) * 0.38;
    rotY += (swing + targetY - rotY) * Math.min(1, dt * 2.2);
    rotX += (targetX + Math.sin(time * 0.13) * 0.05 - rotX) * Math.min(1, dt * 2.2);

    // spontaneous firing
    fireTimer -= dt;
    if (fireTimer <= 0) {
      fire((Math.random() * N) | 0, 1);
      fireTimer = 0.28 + Math.random() * 0.5;
    }

    // signals travelling along the connections
    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const p = pulses[i];
      p.t += (p.speed * dt) / edges[p.edge].len;
      if (p.t < 1) continue;
      const e = edges[p.edge];
      const arrive = p.dir === 1 ? e.b : e.a;
      pulses.splice(i, 1);
      ACT[arrive] = Math.max(ACT[arrive], p.energy);
      if (p.energy > 0.35 && Math.random() < 0.7) {
        const list = adjacency[arrive];
        const next = list[(Math.random() * list.length) | 0];
        if (next !== p.edge) spawnPulse(next, arrive, p.energy * 0.8);
      }
    }

    // glow decays; the pointer lights nearby nodes
    const decay = Math.exp(-dt * 1.6);
    for (let i = 0; i < N; i += 1) {
      ACT[i] *= decay;
      if (pointer) {
        const dx = SX[i] - pointer.x; const dy = SY[i] - pointer.y;
        if (dx * dx + dy * dy < 4900) ACT[i] = Math.max(ACT[i], 0.45);
      }
    }
  };

  const project = () => {
    const cosY = Math.cos(rotY); const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX); const sinX = Math.sin(rotX);
    for (let i = 0; i < N; i += 1) {
      const x1 = X[i] * cosY + Z[i] * sinY;
      const z1 = -X[i] * sinY + Z[i] * cosY;
      const y1 = Y[i] * cosX - z1 * sinX;
      const z2 = Y[i] * sinX + z1 * cosX;
      const f = 4.2 / (4.2 - z2); // gentle perspective
      SX[i] = cx - x1 * scale * f; // negative: the brain faces left, towards the text
      SY[i] = cy - y1 * scale * f;
      SD[i] = Math.min(1, Math.max(0, (z2 + 1) / 2));
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);

    // connections, batched into three depth bands
    const counts = [0, 0, 0];
    for (let e = 0; e < edges.length; e += 1) {
      const d = (SD[edges[e].a] + SD[edges[e].b]) * 0.5;
      const band = d < 0.4 ? 0 : d < 0.62 ? 1 : 2;
      buckets[band][counts[band]++] = e;
    }
    for (let band = 0; band < 3; band += 1) {
      ctx.beginPath();
      ctx.strokeStyle = palette.edge[band];
      ctx.lineWidth = 0.6 + band * 0.25;
      for (let k = 0; k < counts[band]; k += 1) {
        const e = edges[buckets[band][k]];
        ctx.moveTo(SX[e.a], SY[e.a]);
        ctx.lineTo(SX[e.b], SY[e.b]);
      }
      ctx.stroke();
    }

    // nodes
    const unit = Math.min(w, h) / 520;
    for (let i = 0; i < N; i += 1) {
      const d = SD[i]; const a = ACT[i];
      const level = Math.min(5, ((0.1 + d * 0.9) * 6) | 0);
      const r = (1.0 + 1.9 * d) * (1 + a * 0.9) * Math.max(0.75, unit);
      ctx.fillStyle = palette.nodes[TYPE[i]][level];
      ctx.beginPath();
      ctx.arc(SX[i], SY[i], r, 0, TAU);
      ctx.fill();
      if (a > 0.04) {
        const size = r * 7;
        ctx.globalAlpha = Math.min(1, a * 0.9);
        ctx.drawImage(palette.glow[TYPE[i]], SX[i] - size, SY[i] - size, size * 2, size * 2);
        ctx.fillStyle = palette.core[TYPE[i]];
        ctx.beginPath();
        ctx.arc(SX[i], SY[i], r * 0.8, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // travelling signals with a short fading tail
    for (const p of pulses) {
      const e = edges[p.edge];
      const sprite = palette.pulse[p.color];
      for (let k = 0; k < 5; k += 1) {
        const t = p.t - k * 0.045;
        if (t < 0) break;
        const u = p.dir === 1 ? t : 1 - t;
        const x = SX[e.a] + (SX[e.b] - SX[e.a]) * u;
        const y = SY[e.a] + (SY[e.b] - SY[e.a]) * u;
        const size = (k === 0 ? 9 : 7 - k) * Math.max(0.8, unit * 1.2);
        ctx.globalAlpha = Math.min(1, p.energy * (1 - k / 5) * 1.1);
        ctx.drawImage(sprite, x - size, y - size, size * 2, size * 2);
      }
    }
    ctx.globalAlpha = 1;
  };

  /* ---------- loop control ---------- */
  let raf = 0; let running = false; let last = 0; let clock = 0;
  let visible = true;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now; clock += dt;
    update(dt, clock);
    project();
    draw();
  };
  const start = () => {
    if (running || reduceQuery.matches) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  // A single, deliberate still frame for reduced motion
  const drawStill = () => {
    rotY = 0.2; rotX = 0.04;
    ACT.fill(0);
    for (let i = 7; i < N; i += 17) ACT[i] = 0.9;
    pulses.length = 0;
    for (let k = 0; k < 6 && edges.length; k += 1) {
      const e = (k * 53 + 7) % edges.length;
      spawnPulse(e, edges[e].a, 0.9);
      pulses[pulses.length - 1].t = 0.35 + (k % 3) * 0.15;
    }
    project();
    draw();
  };

  const refresh = () => {
    resize();
    if (!w) return;
    if (reduceQuery.matches) drawStill();
    else if (!running) { project(); draw(); }
  };

  /* ---------- wiring ---------- */
  const init = () => {
    buildGraph(narrowQuery.matches ? 190 : 340);
    buildPalette();
    refresh();
    host.classList.add('is-live');
  };

  init();

  new ResizeObserver(refresh).observe(host);
  narrowQuery.addEventListener('change', init);
  reduceQuery.addEventListener('change', () => {
    if (reduceQuery.matches) { stop(); refresh(); } else if (visible && !document.hidden) start();
  });
  new MutationObserver(() => { buildPalette(); refresh(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  }).observe(host);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (visible) start();
  });

  // Pointer tilt: desktop mouse only, listening on the hero so the canvas never blocks clicks
  if (!coarse) {
    hero.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || reduceQuery.matches) return;
      const rect = host.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      targetY = Math.max(-0.5, Math.min(0.5, -nx)) * 0.7;
      targetX = Math.max(-0.5, Math.min(0.5, ny)) * 0.4;
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { targetY = 0; targetX = 0; pointer = null; });
  }
})();
