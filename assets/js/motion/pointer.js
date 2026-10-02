/* Pointer details, fine pointers only: soft spotlights on cards, and a glow in the
   closing section that follows the cursor. No cursor replacement, no magnetism. */
import { gsap, $, finePointer } from './core.js';

export function initPointer() {
  if (!finePointer) return;

  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.guided-card, .promise-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
  }, { passive: true });

  const cta = $('.cta-final');
  if (cta) {
    cta.addEventListener('pointermove', (e) => {
      const r = cta.getBoundingClientRect();
      gsap.to(cta, { '--gx': ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%', '--gy': ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%', duration: 1.4, ease: 'power3.out', overwrite: true });
    }, { passive: true });
  }
}
