/* Section choreography. Restraint is the point: short travel, one curve, a
   clear order, and nothing that competes with the 3D trace. */
import { gsap, ScrollTrigger, EASE, $, $$, late } from './core.js';

export function initSections() {
  if (!late) {
    // Small supporting elements (eyebrows, copy blocks, credits) ease up together.
    gsap.set('[data-m="fade"]', { opacity: 0, y: 16 });
    ScrollTrigger.batch('[data-m="fade"]', {
      start: 'top 92%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: EASE.out, stagger: 0.1, clearProps: 'transform,opacity' }),
    });

    // Card groups arrive in sequence, left to right.
    gsap.set('[data-m="item"]', { opacity: 0, y: 28 });
    ScrollTrigger.batch('[data-m="item"]', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.05, ease: EASE.out, stagger: 0.09, clearProps: 'transform,opacity' }),
    });
  }

  // Scenarios (stacked layout on small screens only; the 3D trace owns desktop cards).
  gsap.matchMedia().add('(max-width: 820px)', () => {
    if (late) return;
    const cards = $$('#traceCards .sol-card');
    gsap.set(cards, { opacity: 0, y: 28 });
    ScrollTrigger.batch(cards, {
      start: 'top 92%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: EASE.out, stagger: 0.1 }),
    });
  });

  // The 3D scene fades in as its section arrives instead of popping on.
  const canvas = $('#traceCanvas');
  if (canvas && !late) {
    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: '#solutions', start: 'top 75%', once: true } });
  }
}
