/* Motion entry. Order matters: scroll first, then start states for everything,
   then release the no-flash gate, then play the load sequence. */
import { root, reduce, initScroll, initRefresh, rescue } from './core.js';
import { initHero } from './hero.js';
import { initText } from './text.js';
import { initSections } from './sections.js';
import { initNav } from './nav.js';
import { initPointer } from './pointer.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  try {
    initScroll();
    // measure type only after the fonts are in, but never hold the page hostage
    await Promise.race([document.fonts?.ready, wait(1500)]);
    const play = initHero();
    if (!reduce) {
      initText();
      initSections();
      initNav();
      initPointer();
      initRefresh();
    }
    root.classList.remove('motion-pending');
    if (!reduce) root.classList.add('motion-ready');
    requestAnimationFrame(() => play());
  } catch (err) {
    rescue(err);
  }
})();
