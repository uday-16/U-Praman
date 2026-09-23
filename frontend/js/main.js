/**
 * PRAMAN Main Entry Point
 * Bootstraps all core modular JS modules:
 * accessibility, storage, navigation, slider, search, state-selector, standards, and analyzer.
 */

import { initAccessibility } from './accessibility.js';
import { initNavigation } from './navigation.js';
import { initHeroSlider } from './slider.js';
import { initSearch } from './search.js';
import { initStateSelector } from './state-selector.js';
import { initStandardsExplorer } from './standards.js';
import { initAnalyzer } from './analyzer.js';
import { initChatbot } from './components/chatbot.js';

function initGoogleTranslate() {
  const savedLang = localStorage.getItem('praman_lang') || localStorage.getItem('standardsai_lang') || 'en';
  if (savedLang && savedLang !== 'en') {
    document.cookie = `googtrans=/en/${savedLang}; path=/;`;
    if (window.location.hostname) {
      document.cookie = `googtrans=/en/${savedLang}; domain=${window.location.hostname}; path=/;`;
    }
  }

  const script = document.createElement('script');
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);

  window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'en,hi,bn,ta,te,mr,pa,gu,kn,ml',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'google_translate_element');

    if (savedLang && savedLang !== 'en') {
      const googCombo = document.querySelector('.goog-te-combo');
      if (googCombo) {
        googCombo.value = savedLang;
        googCombo.dispatchEvent(new Event('change'));
      }
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  initAccessibility();
  initNavigation();
  initHeroSlider();
  initSearch();
  initStateSelector();
  initStandardsExplorer();
  initAnalyzer();
  initChatbot();
  initGoogleTranslate();
});
