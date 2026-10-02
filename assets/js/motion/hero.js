/* Hero: the topology grid and the load sequence.
   The grid is a small network: nodes light up and link when the cursor nears them,
   and packets travel along edges. Everything is deliberately quiet. */
import { gsap, ScrollTrigger, SplitText, EASE, $, $$, reduce, finePointer, late } from './core.js';

const W = 1200, H = 700, COLS = 14, ROWS = 8, MX = 80, MY = 80;
const NS = 'http://www.w3.org/2000/svg';
const mk = (name, attrs) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

function buildGrid(svg) {
  const sx = (W - MX * 2) / (COLS - 1), sy = (H - MY * 2) / (ROWS - 1);
  const nodes = [], edges = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) nodes.push({ x: MX + c * sx, y: MY + r * sy, accent: false, heat: 0 });
  const link = (a, b) => edges.push({ a, b, heat: 0 });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 1; c++) if (Math.random() < 0.22) link(r * COLS + c, r * COLS + c + 1);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 1; r++) if (Math.random() < 0.10) link(r * COLS + c, (r + 1) * COLS + c);
  const accents = new Set();
  while (accents.size < 4) accents.add(Math.floor(Math.random() * nodes.length));
  accents.forEach((i) => (nodes[i].accent = true));

  svg.replaceChildren();
  const gLines = mk('g', {}), gProbe = mk('g', {}), gDots = mk('g', {}), gPackets = mk('g', {});
  edges.forEach((e) => {
    const a = nodes[e.a], b = nodes[e.b];
    e.el = mk('line', { class: 'node-line', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    e.len = Math.hypot(b.x - a.x, b.y - a.y);
    gLines.appendChild(e.el);
  });
  nodes.forEach((n) => {
    n.baseR = n.accent ? 3 : 1.6;
    n.el = mk('circle', { class: 'node-dot' + (n.accent ? ' on' : ''), cx: n.x, cy: n.y, r: n.baseR });
    gDots.appendChild(n.el);
  });
  const probes = [0, 1, 2].map(() => gProbe.appendChild(mk('line', { class: 'node-probe' })));
  const packets = [0, 1].map(() => ({ el: gPackets.appendChild(mk('circle', { class: 'node-packet', r: 2.6, opacity: 0 })), edge: null, t: 0, wait: 1 + Math.random() * 2, dir: 1 }));
  svg.append(gLines, gProbe, gDots, gPackets);
  return { nodes, edges, probes, packets, dots: nodes.map((n) => n.el), lines: edges.map((e) => e.el) };
}

export function initHero() {
  const svg = $('#heroGrid'), hero = $('.hero');
  if (!svg || !hero) return () => {};
  const grid = buildGrid(svg);
  if (reduce) return () => {};

  /* ---------- interaction + ambient loop ---------- */
  const st = { has: false, px: 0, py: 0, inView: true };
  const R = 190;
  const toSvg = (cx, cy) => {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return p;
  };
  if (finePointer) {
    hero.addEventListener('pointermove', (e) => {
      const p = toSvg(e.clientX, e.clientY);
      if (p) { st.px = p.x; st.py = p.y; st.has = true; }
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { st.has = false; });
  }
  new IntersectionObserver(([e]) => { st.inView = e.isIntersecting; }).observe(hero);

  let time = 0, running = false;
  const accentEls = grid.nodes.filter((n) => n.accent);
  const tick = (_, ms) => {
    if (!running || !st.inView || document.hidden) return;
    const dt = Math.min(0.05, ms / 1000);
    time += dt;
    const k = 1 - Math.exp(-dt * 6);
    let moving = false;

    for (const n of grid.nodes) {
      const target = st.has ? Math.pow(Math.max(0, 1 - Math.hypot(n.x - st.px, n.y - st.py) / R), 2) : 0;
      const next = n.heat + (target - n.heat) * k;
      if (Math.abs(next - n.heat) > 0.0015 || next > 0.002) {
        n.heat = next < 0.002 ? 0 : next;
        n.el.setAttribute('r', (n.baseR + n.heat * 1.8).toFixed(2));
        n.el.style.fill = n.heat > 0.01 ? 'var(--logo-blue)' : '';
        if (!n.accent) n.el.style.opacity = (0.14 + n.heat * 0.75).toFixed(3);
        moving = true;
      }
    }
    // accents breathe on a real clock (frame-rate independent)
    accentEls.forEach((n, i) => {
      n.el.style.opacity = Math.min(1, 0.55 + Math.sin(time * 1.1 + i * 1.3) * 0.4 + n.heat).toFixed(3);
    });
    if (moving) {
      for (const e of grid.edges) {
        const h = Math.max(grid.nodes[e.a].heat, grid.nodes[e.b].heat);
        e.el.style.opacity = (0.06 + h * 0.5).toFixed(3);
        e.el.style.stroke = h > 0.02 ? 'var(--logo-blue)' : '';
      }
      // link the three warmest nodes: the cursor "finds" the network
      const warm = grid.nodes.map((n, i) => [n.heat, i]).sort((a, b) => b[0] - a[0]).slice(0, 3);
      grid.probes.forEach((l, i) => {
        const A = warm[i], B = warm[(i + 1) % 3];
        if (!A || !B || A[0] < 0.12 || B[0] < 0.12) { l.style.opacity = 0; return; }
        const a = grid.nodes[A[1]], b = grid.nodes[B[1]];
        l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
        l.style.opacity = (Math.min(A[0], B[0]) * 0.9).toFixed(3);
      });
    }
    // packets: a small pulse travels a random edge, then rests
    for (const p of grid.packets) {
      if (!p.edge) {
        p.wait -= dt;
        if (p.wait > 0) continue;
        p.edge = grid.edges[Math.floor(Math.random() * grid.edges.length)];
        if (!p.edge) continue;
        p.t = 0; p.dir = Math.random() < 0.5 ? 1 : -1;
      }
      p.t += dt / Math.max(0.9, p.edge.len / 120);
      const u = p.dir === 1 ? p.t : 1 - p.t;
      const a = grid.nodes[p.edge.a], b = grid.nodes[p.edge.b];
      p.el.setAttribute('cx', (a.x + (b.x - a.x) * u).toFixed(1));
      p.el.setAttribute('cy', (a.y + (b.y - a.y) * u).toFixed(1));
      p.el.setAttribute('opacity', (Math.sin(Math.min(1, p.t) * Math.PI) * 0.95).toFixed(2));
      if (p.t >= 1) { p.edge = null; p.el.setAttribute('opacity', 0); p.wait = 1.2 + Math.random() * 2.5; }
    }
  };
  gsap.ticker.add(tick);

  /* ---------- load sequence ---------- */
  const anims = [];
  const queue = (tw) => { tw.pause(); anims.push(tw); return tw; };
  const title = $('[data-hero="title"]'), lead = $('[data-hero="lead"]');

  if (!late) {
    gsap.set(svg.parentElement, { opacity: 1 });
    // explicit end values: the no-flash gate still reads as opacity 0 while these are created
    queue(gsap.fromTo('.nav-inner', { y: -22, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: EASE.out, delay: 0.1, clearProps: 'transform,opacity' }));
    queue(gsap.from(grid.dots, { attr: { r: 0 }, duration: 1, ease: EASE.out, delay: 0.1, stagger: { amount: 1.2, from: 'center', grid: [COLS, ROWS] } }));
    grid.edges.forEach((e) => gsap.set(e.el, { strokeDasharray: e.len, strokeDashoffset: e.len }));
    queue(gsap.to(grid.lines, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out', delay: 0.5, stagger: { amount: 1 }, clearProps: 'strokeDasharray,strokeDashoffset' }));
    queue(gsap.fromTo('[data-hero="eyebrow"]', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: EASE.out, delay: 0.25, clearProps: 'transform,opacity' }));
    const lines = (el, delay, dur, stag) => SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      onSplit: (self) => queue(gsap.from(self.lines, { yPercent: 110, duration: dur, ease: EASE.out, stagger: stag, delay })),
    });
    lines(title, 0.3, 1.3, 0.09);
    lines(lead, 0.7, 1.1, 0.06);
    queue(gsap.from($$('[data-hero="actions"] > *'), { y: 18, opacity: 0, duration: 0.9, ease: EASE.out, delay: 1.05, stagger: 0.08 }));
    queue(gsap.from($$('[data-hero="meta"] > div'), { y: 16, opacity: 0, duration: 0.9, ease: EASE.out, delay: 1.2, stagger: 0.09 }));
  }

  /* hero leaves quietly: the grid drifts, the copy eases back */
  gsap.to(svg.parentElement, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-inner', { yPercent: -5, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: hero, start: '30% top', end: 'bottom top', scrub: true } });

  return () => {
    anims.forEach((a) => a.play());
    running = true;
  };
}
