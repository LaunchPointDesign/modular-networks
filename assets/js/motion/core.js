/* Motion core: plugins, smooth scroll, shared helpers.
   One clock: Lenis is driven from gsap.ticker and feeds ScrollTrigger, so
   every scroll-linked effect on the page reads the same eased position. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };
export const root = document.documentElement;
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
/* If the CDN was slow enough that the gate already released, content is on screen:
   skip anything that would hide it again. */
export const late = !root.classList.contains('motion-pending');

export const EASE = { out: 'expo.out', soft: 'power3.out', io: 'power3.inOut' };
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export let lenis = null;

export function initScroll() {
  if (reduce) return;
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.95, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.scrollTo(0, { immediate: true });

  // main.js reads these: anchors and guided cards route through Lenis when it exists.
  window.mnSmooth = true;
  window.mnLenis = lenis;
  window.mnScrollTo = (target) => {
    if (!lenis) return;
    if (target === document.documentElement || target === 0) {
      lenis.scrollTo(0, { duration: 1.6, easing: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
      return;
    }
    const dist = Math.abs(target.getBoundingClientRect().top);
    lenis.scrollTo(target, { duration: Math.min(2.4, Math.max(1.1, dist / 2200)), easing: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
  };

  // page scroll is locked while the mobile menu is open
  document.addEventListener('mn:menu', (e) => (e.detail.open ? lenis.stop() : lenis.start()));
}

/* Layout is owned by several scripts (main.js sets the Services height, trace.js the
   Scenarios height, fonts shift line breaks). Any of them can announce 'mn:layout';
   triggers are re-measured once, after things settle. */
export function initRefresh() {
  let t;
  const refresh = () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 140); };
  document.addEventListener('mn:layout', refresh);
  window.addEventListener('load', refresh);
  document.fonts?.ready.then(refresh);
}

/* If anything in the choreography throws, leave the page fully readable. */
export function rescue(err) {
  console.error('[motion] falling back to static page:', err);
  try {
    ScrollTrigger.getAll().forEach((s) => s.kill());
    gsap.globalTimeline.clear();
    gsap.set('[data-split], [data-hero], [data-m], .nav-inner, .hero-grid, .hero-grid *, .ln, .wd', { clearProps: 'all' });
    $$('.split-line-mask, .ln').forEach((el) => { el.style.transform = 'none'; });
  } catch (_) { /* nothing left to do */ }
  root.classList.remove('motion-pending');
}
