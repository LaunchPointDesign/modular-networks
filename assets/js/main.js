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
  const setMenuOpen = (open) => {
    menu?.classList.toggle('is-open', open);
    nav?.classList.toggle('is-menu-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu?.setAttribute('aria-hidden', String(!open));
    document.dispatchEvent(new CustomEvent('mn:menu', { detail: { open } }));
  };
  toggle?.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    setMenuOpen(open);
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    setMenuOpen(false);
  }));
  document.addEventListener('click', (event) => {
    if (!menu?.classList.contains('is-open')) return;
    if (nav?.contains(event.target)) return;
    setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menu?.classList.contains('is-open')) return;
    setMenuOpen(false);
    toggle?.focus();
  });

  /* ---------- Same-page links without persistent hash ----------
     The motion layer (Lenis) registers window.mnScrollTo; without it we fall
     back to native smooth scrolling, so anchors always work. */
  const goTo = (target) => {
    if (window.mnScrollTo) window.mnScrollTo(target);
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = hash === '#top' ? document.documentElement : document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      goTo(target);
      history.replaceState(null, '', location.pathname + location.search);
    });
  });

  /* ---------- Section active in nav ---------- */
  const sectionIds = ['process','solutions','about','vision','contact'];
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
      document.dispatchEvent(new CustomEvent('mn:active', { detail: { link } }));
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sectionEls.forEach(s => io.observe(s));

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
        if (target) goTo(target);
        return;
      }
      guidedCards.forEach(c => c.setAttribute('aria-expanded','false'));
      card.setAttribute('aria-expanded','true');
    });
  });

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

    // Eased scroll state: the scroll handler only records the target progress;
    // a rAF loop glides the displayed progress toward it (exponential ease),
    // so the track drifts instead of snapping 1:1 with the scrollbar.
    let pTarget = 0, pDisp = 0, procRunning = false, procLast = 0;

    const readTarget = () => {
      if (isMobile()) return;
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      pTarget = total > 0 ? scrolled / total : 0;
    };

    const renderProc = (now) => {
      if (isMobile()) { procRunning = false; return; } // resized mid-glide: stop, layout() already cleared the track
      const dt = Math.min(0.05, (now - procLast) / 1000); procLast = now;
      // Lenis already eases the scroll itself, so glide a little faster on top of it
      pDisp += (pTarget - pDisp) * (1 - Math.exp(-dt * (window.mnSmooth ? 6 : 4.2)));
      if (Math.abs(pTarget - pDisp) < 0.0004) pDisp = pTarget;
      const vw = window.innerWidth;
      const trackWidth = track.scrollWidth;
      const delta = Math.max(0, trackWidth - vw + 40);
      track.style.transform = `translate3d(${(-pDisp * delta).toFixed(1)}px,0,0)`;

      // active step + dots follow the eased position, so UI matches the screen
      const n = steps.length;
      const idx = Math.min(n - 1, Math.floor(pDisp * n + 0.0001));
      steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      progressDots.forEach((d, i) => d.classList.toggle('is-active', i <= idx));

      if (pDisp !== pTarget) requestAnimationFrame(renderProc);
      else procRunning = false;
    };

    const kickProc = () => {
      if (procRunning || isMobile()) return;
      procRunning = true; procLast = performance.now();
      requestAnimationFrame(renderProc);
    };

    const onProcScroll = () => {
      readTarget();
      if (reduce) pDisp = pTarget; // reduced motion: snap, no glide
      kickProc();
    };

    window.addEventListener('resize', () => { layout(); readTarget(); pDisp = pTarget; kickProc(); });
    window.addEventListener('scroll', onProcScroll, { passive: true });
    // after fonts load, recompute
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); readTarget(); pDisp = pTarget; kickProc(); document.dispatchEvent(new Event('mn:layout')); });
    layout();
    readTarget();
    pDisp = pTarget;
    kickProc();
    // let the motion layer re-measure its triggers once our wrap height is final
    window.addEventListener('load', () => document.dispatchEvent(new Event('mn:layout')));
  })();

})();
