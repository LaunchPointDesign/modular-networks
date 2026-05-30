(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav scroll state ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 8) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileMenu');
  toggle?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- Section active in nav ---------- */
  const sectionIds = ['solutions','process','about','contact'];
  const linkMap = new Map(
    [...document.querySelectorAll('[data-link]')].map(a => [a.dataset.link, a])
  );
  const sectionEls = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      linkMap.forEach(a => a.classList.remove('is-active'));
      const link = linkMap.get(e.target.id);
      link?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sectionEls.forEach(s => io.observe(s));

  /* ---------- Reveal on scroll (water-flow, staggered) ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const delay = parseFloat(el.dataset.flowDelay || '0');
      if (delay) el.style.transitionDelay = delay + 's';
      el.classList.add('in');
      revealIO.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  // Default reveal targets
  document.querySelectorAll('.section-head, .about-copy, .cta-final .container > *')
    .forEach(el => { el.classList.add('reveal'); revealIO.observe(el); });

  // Staggered groups — cards flow in one after another
  const stagger = (selector, step = 0.09, cls = 'flow-up') => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add(cls);
      el.dataset.flowDelay = (i * step).toFixed(2);
      revealIO.observe(el);
    });
  };
  stagger('.guided-card', 0.1, 'flow-up');
  stagger('.sol-card',    0.12, 'flow-up');
  stagger('.pillar',      0.08, 'flow-up');
  stagger('#workAccordion .work-item', 0.1, 'flow-left');

  // Work visual floats in from the right
  document.querySelectorAll('.work-visual').forEach(el => {
    el.classList.add('flow-right');
    el.dataset.flowDelay = '0.15';
    revealIO.observe(el);
  });

  // Process step cards (mobile stacked view) flow too
  if (matchMedia('(max-width: 820px)').matches) {
    stagger('.process-step', 0.1, 'flow-up');
  }

  /* ---------- Guided entry expand ---------- */
  const guidedCards = document.querySelectorAll('[data-guided]');
  guidedCards.forEach(card => {
    // open first on load for visible hint on desktop
    card.addEventListener('click', (e) => {
      const anchor = card.dataset.anchor;
      const wasOpen = card.getAttribute('aria-expanded') === 'true';
      // toggle: if clicking the link area (deep child that is the link span) navigate
      if (wasOpen && anchor) {
        const target = document.querySelector(anchor);
        target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      guidedCards.forEach(c => c.setAttribute('aria-expanded','false'));
      card.setAttribute('aria-expanded','true');
    });
  });

  /* ---------- Hero grid of nodes ---------- */
  (() => {
    const svg = document.getElementById('heroGrid');
    if (!svg) return;
    const W = 1200, H = 700;
    const cols = 14, rows = 8;
    const mx = 80, my = 80;
    const stepX = (W - mx*2) / (cols - 1);
    const stepY = (H - my*2) / (rows - 1);
    let lines = '', dots = '';
    // sparse connections (only some, to stay restrained)
    const pts = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = mx + c*stepX;
        const y = my + r*stepY;
        pts.push({x,y,r,c});
      }
    }
    // draw faint horizontal segments between random adjacent pairs
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        if (Math.random() < 0.22) {
          const a = pts[r*cols + c], b = pts[r*cols + c + 1];
          lines += `<line class="node-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows - 1; r++) {
        if (Math.random() < 0.10) {
          const a = pts[r*cols + c], b = pts[(r+1)*cols + c];
          lines += `<line class="node-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
        }
      }
    }
    // pick a few accent nodes
    const accentIdxs = new Set();
    while (accentIdxs.size < 4) accentIdxs.add(Math.floor(Math.random() * pts.length));
    pts.forEach((p, i) => {
      const isAccent = accentIdxs.has(i);
      dots += `<circle class="node-dot ${isAccent ? 'on' : ''}" cx="${p.x}" cy="${p.y}" r="${isAccent ? 3 : 1.6}" />`;
    });
    svg.innerHTML = lines + dots;

    // subtle slow pulse on accents
    if (!reduce) {
      const accents = svg.querySelectorAll('.node-dot.on');
      let t = 0;
      const tick = () => {
        t += 0.016;
        accents.forEach((el, i) => {
          const o = 0.55 + Math.sin(t + i * 1.3) * 0.45;
          el.setAttribute('opacity', String(o));
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  })();

  /* ---------- Work accordion ---------- */
  (() => {
    const items = document.querySelectorAll('#workAccordion .work-item');
    items.forEach(item => {
      const trigger = item.querySelector('.work-trigger');
      trigger.addEventListener('click', () => {
        const isOpen = item.getAttribute('aria-expanded') === 'true';
        items.forEach(i => i.setAttribute('aria-expanded', 'false'));
        item.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
    });
  })();

  /* ---------- Horizontal Process scroll ---------- */
  (() => {
    const wrap = document.getElementById('processWrap');
    const track = document.getElementById('processTrack');
    const progressDots = document.querySelectorAll('#processProgress .dot');
    const steps = document.querySelectorAll('.process-step');
    if (!wrap || !track) return;

    const isMobile = () => matchMedia('(max-width: 820px)').matches;

    const layout = () => {
      if (isMobile()) {
        wrap.style.height = '';
        track.style.transform = '';
        return;
      }
      // The horizontal track needs to translate by (track.scrollWidth - viewport) over
      // an equivalent amount of vertical scroll. Wrap height = viewport + that delta.
      const vw = window.innerWidth;
      const trackWidth = track.scrollWidth;
      const delta = Math.max(0, trackWidth - vw + 40);
      wrap.style.height = (window.innerHeight + delta) + 'px';
    };

    const update = () => {
      if (isMobile()) return;
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      const vw = window.innerWidth;
      const trackWidth = track.scrollWidth;
      const delta = Math.max(0, trackWidth - vw + 40);
      track.style.transform = `translate3d(${-p * delta}px,0,0)`;

      // active step
      const n = steps.length;
      const idx = Math.min(n - 1, Math.floor(p * n + 0.0001));
      steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      progressDots.forEach((d, i) => d.classList.toggle('is-active', i <= idx));
    };

    window.addEventListener('resize', () => { layout(); update(); });
    window.addEventListener('scroll', update, { passive: true });
    // after fonts load, recompute
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); update(); });
    layout();
    update();
  })();

})();
