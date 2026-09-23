/**
 * PRAMAN Navigation & Header Controller
 * Handles sticky topbar, location selector dropdown, language switcher,
 * keyboard search triggers (Ctrl+K), and responsive mobile drawer.
 */
import { PRAMANStorage } from './storage.js';

export function initNavigation() {
  const header = document.querySelector('.public-navbar');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('navbar-scrolled');
      } else {
        header.classList.remove('navbar-scrolled');
      }
    });
  }

  // Location Selector Dropdown Handler
  const locationSelect = document.getElementById('navbar-location-select');
  if (locationSelect) {
    locationSelect.value = PRAMANStorage.getSelectedState();
    locationSelect.addEventListener('change', (e) => {
      PRAMANStorage.setSelectedState(e.target.value);
      // Dispatch custom event so state selector components update in real-time
      window.dispatchEvent(new CustomEvent('pramanStateChanged', { detail: { state: e.target.value } }));
    });
  }

}
