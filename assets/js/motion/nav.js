/* Nav: quiet by design. It slips away while you read down the page, returns the
   moment you scroll up, and a soft pill slides to the section you are in. */
import { gsap, ScrollTrigger, $, $$ } from './core.js';

export function initNav() {
  const nav = $('#nav'), links = $('.nav-links'), pill = $('#navIndicator');

  /* sliding active indicator */
  const place = (link) => {
    if (!pill || !link) { pill?.classList.remove('is-on'); return; }
    pill.style.setProperty('--x', link.offsetLeft + 'px');
    pill.style.setProperty('--w', link.offsetWidth + 'px');
    pill.classList.add('is-on');
  };
  let current = null;
  document.addEventListener('mn:active', (e) => { current = e.detail.link; place(current); });
  if (links) new ResizeObserver(() => current && place(current)).observe(links);
  // back at the top: nothing is "current"
  ScrollTrigger.create({ trigger: '.hero', start: 'bottom 60%', onLeaveBack: () => {
    current = null; $$('[data-link]').forEach((a) => a.classList.remove('is-active')); place(null);
  } });

  /* hide on scroll down, show on scroll up */
  let last = 0, menuOpen = false;
  document.addEventListener('mn:menu', (e) => { menuOpen = e.detail.open; if (menuOpen) nav.classList.remove('is-hidden'); });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden')); // keyboard users can always reach it
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll(), dy = y - last; last = y;
      if (menuOpen || Math.abs(dy) < 4) return;
      nav.classList.toggle('is-hidden', dy > 0 && y > 520);
    },
  });

  /* scroll progress: a thin signal line across the top */
  gsap.to('#scrollProgress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
}
