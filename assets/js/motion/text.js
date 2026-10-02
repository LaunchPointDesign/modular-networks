/* Type: editorial line reveals for headings, leads and body copy, and a scrubbed
   word-by-word read for the two statement headings (Philosophy, Vision). */
import { gsap, SplitText, EASE, $$, late } from './core.js';

export function initText() {
  if (late) return; // gate already released: content is on screen, leave it alone

  // Lines rise out of a mask. Tight travel, long ease: confident, not theatrical.
  $$('[data-split="lines"]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 105, duration: 1.1, ease: EASE.out, stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      }),
    });
  });

  // Statements read as you scroll: words settle from muted to full strength.
  $$('[data-split="scrub"]').forEach((el) => {
    SplitText.create(el, {
      type: 'words', wordsClass: 'wd', autoSplit: true,
      onSplit: (self) => gsap.fromTo(self.words, { opacity: 0.18 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 55%', scrub: true },
      }),
    });
  });
}
