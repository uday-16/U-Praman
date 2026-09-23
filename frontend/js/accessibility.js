/**
 * PRAMAN Accessibility Manager
 * Manages font resizing (A-, A, A+), high contrast mode toggle,
 * skip to main content, keyboard navigation focus indicators, and ARIA state sync.
 */
import { PRAMANStorage } from './storage.js';

export function initAccessibility() {
  // Apply saved font size and contrast settings on load
  const savedFontSize = PRAMANStorage.getFontSize();
  document.documentElement.style.fontSize = savedFontSize;

  const isHighContrast = PRAMANStorage.getHighContrast();
  if (isHighContrast) {
    document.body.classList.add('high-contrast');
  }

  // Setup Font Size Control Listeners
  const btnDec = document.getElementById('btn-font-dec');
  const btnReset = document.getElementById('btn-font-reset');
  const btnInc = document.getElementById('btn-font-inc');

  if (btnDec && btnReset && btnInc) {
    btnDec.addEventListener('click', () => setFontSize('92%', btnDec));
    btnReset.addEventListener('click', () => setFontSize('100%', btnReset));
    btnInc.addEventListener('click', () => setFontSize('108%', btnInc));

    // Highlight active font size button
    if (savedFontSize === '92%') markActiveAccBtn(btnDec);
    else if (savedFontSize === '108%') markActiveAccBtn(btnInc);
    else markActiveAccBtn(btnReset);
  }

  // Setup High Contrast Toggle Button
  const contrastBtn = document.getElementById('btn-high-contrast');
  if (contrastBtn) {
    contrastBtn.addEventListener('click', () => {
      const active = document.body.classList.toggle('high-contrast');
      PRAMANStorage.setHighContrast(active);
      contrastBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  // Setup Skip to Content Link focus management
  const skipLink = document.querySelector('.skip-to-content');
  if (skipLink) {
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const mainContent = document.querySelector('main') || document.querySelector('#main-content') || document.body;
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
    });
  }
}

function setFontSize(size, activeBtn) {
  document.documentElement.style.fontSize = size;
  PRAMANStorage.setFontSize(size);
  markActiveAccBtn(activeBtn);
}

function markActiveAccBtn(activeBtn) {
  const buttons = document.querySelectorAll('.acc-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (activeBtn) activeBtn.classList.add('active');
}
